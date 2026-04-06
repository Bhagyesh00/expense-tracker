/**
 * ExpenseFlow — Smart Settlement Calculation Edge Function
 *
 * Accepts POST with { workspaceId } or { userIds: string[] }.
 * Queries all pending payments between the relevant users and runs the
 * minimum-transactions settlement algorithm to produce an optimized plan.
 *
 * Returns: Array<{ from, to, amount, currency }>
 *
 * Requires authentication via Bearer token.
 */

import { createUserClient, getUserId } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

/** A single directed debt used by the settlement algorithm. */
interface Debt {
  from: string;
  to: string;
  amount: number;
}

/** A settlement transaction in the optimized plan. */
interface Settlement {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

/**
 * Greedy net-balance settlement algorithm.
 * Mirrors packages/utils/src/settlement.ts but inlined for Deno compatibility.
 */
function calculateSettlements(debts: Debt[]): Array<{ from: string; to: string; amount: number }> {
  if (debts.length === 0) return [];

  const balanceMap = new Map<string, number>();

  for (const { from, to, amount } of debts) {
    if (amount <= 0) continue;
    balanceMap.set(from, (balanceMap.get(from) ?? 0) - amount);
    balanceMap.set(to, (balanceMap.get(to) ?? 0) + amount);
  }

  const creditors: Array<{ person: string; balance: number }> = [];
  const debtors: Array<{ person: string; balance: number }> = [];

  for (const [person, balance] of balanceMap) {
    if (balance > 0.001) {
      creditors.push({ person, balance });
    } else if (balance < -0.001) {
      debtors.push({ person, balance: Math.abs(balance) });
    }
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;
    const transferAmount = Math.min(creditor.balance, debtor.balance);
    const rounded = Math.round(transferAmount * 100) / 100;

    if (rounded > 0) {
      settlements.push({ from: debtor.person, to: creditor.person, amount: rounded });
    }

    creditor.balance -= transferAmount;
    debtor.balance -= transferAmount;

    if (creditor.balance < 0.001) ci++;
    if (debtor.balance < 0.001) di++;
  }

  return settlements;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const client = createUserClient(req);
    const userId = await getUserId(client);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { workspaceId, userIds } = body as {
      workspaceId?: string;
      userIds?: string[];
    };

    if (!workspaceId && (!userIds || userIds.length === 0)) {
      return errorResponse("Either workspaceId or userIds[] is required");
    }

    // Build the query for pending payments
    let query = client
      .from("pending_payments")
      .select("id, user_id, contact_id, direction, total_amount, paid_amount, currency, status, contacts(id, name, linked_user_id)")
      .in("status", ["pending", "partial", "overdue"]);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) throw paymentsError;

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({ data: { settlements: [], totalTransactions: 0 } }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Group debts by currency since we can only simplify within the same currency
    const debtsByCurrency = new Map<string, Debt[]>();

    // Build a name map for the response
    const nameMap = new Map<string, string>();

    for (const payment of payments as any[]) {
      const remaining = payment.total_amount - (payment.paid_amount ?? 0);
      if (remaining <= 0) continue;

      const contactName = payment.contacts?.name ?? payment.contact_id;
      const contactLinkedUserId = payment.contacts?.linked_user_id;

      // Use linked_user_id if available, otherwise use contact_id
      const contactKey = contactLinkedUserId ?? `contact:${payment.contact_id}`;

      nameMap.set(payment.user_id, payment.user_id);
      nameMap.set(contactKey, contactName);

      const currency = payment.currency;
      if (!debtsByCurrency.has(currency)) {
        debtsByCurrency.set(currency, []);
      }

      // direction = 'give' means the user owes the contact
      // direction = 'receive' means the contact owes the user
      if (payment.direction === "give") {
        debtsByCurrency.get(currency)!.push({
          from: payment.user_id,
          to: contactKey,
          amount: remaining,
        });
      } else {
        debtsByCurrency.get(currency)!.push({
          from: contactKey,
          to: payment.user_id,
          amount: remaining,
        });
      }
    }

    // Run settlement algorithm per currency
    const allSettlements: Settlement[] = [];

    for (const [currency, debts] of debtsByCurrency) {
      const simplified = calculateSettlements(debts);
      for (const s of simplified) {
        allSettlements.push({
          from: s.from,
          to: s.to,
          amount: s.amount,
          currency,
        });
      }
    }

    // Enrich with names
    const enrichedSettlements = allSettlements.map((s) => ({
      ...s,
      fromName: nameMap.get(s.from) ?? s.from,
      toName: nameMap.get(s.to) ?? s.to,
    }));

    return new Response(
      JSON.stringify({
        data: {
          settlements: enrichedSettlements,
          totalTransactions: enrichedSettlements.length,
          originalDebts: payments.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error("settlement-calc error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
