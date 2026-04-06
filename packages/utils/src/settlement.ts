/**
 * Smart settlement (debt simplification) algorithm for ExpenseFlow.
 *
 * Given a list of individual debts ("A owes B $10", "B owes C $5", etc.),
 * this module computes the **minimum number of transactions** required to
 * settle all debts.
 *
 * ## Algorithm — Greedy net-balance matching
 *
 * 1. **Net out**: For every person, compute `net = total owed to them − total
 *    they owe`.  Positive net → net creditor.  Negative net → net debtor.
 *
 * 2. **Split** into two sorted lists: creditors (descending by amount) and
 *    debtors (descending by absolute amount owed).
 *
 * 3. **Greedily match** the largest creditor with the largest debtor:
 *    - Transfer `min(creditor.balance, |debtor.balance|)`.
 *    - Adjust both balances; remove anyone who reaches zero.
 *    - Repeat until both lists are empty.
 *
 * This greedy approach does **not** always produce the theoretically minimal
 * number of transfers (that problem is NP-hard in the general case), but it
 * produces an optimal or near-optimal result for typical small groups and is
 * O(n log n) — far more practical than an exponential exact solver.
 */

/** A single directed debt: `from` owes `to` the given `amount`. */
export interface Debt {
  from: string;
  to: string;
  amount: number;
}

/** A settlement transaction that should be executed. */
export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Compute the minimum (or near-minimum) set of settlement transactions
 * that clear all debts.
 *
 * @param debts - Raw list of individual debts.
 * @returns A simplified list of settlements. Each entry means `from` should
 *          pay `to` the stated `amount`.
 *
 * @example
 * ```ts
 * const debts = [
 *   { from: 'Alice', to: 'Bob',   amount: 100 },
 *   { from: 'Bob',   to: 'Carol', amount: 50 },
 *   { from: 'Carol', to: 'Alice', amount: 30 },
 * ];
 *
 * calculateSettlements(debts);
 * // [
 * //   { from: 'Alice', to: 'Bob',   amount: 50 },
 * //   { from: 'Alice', to: 'Carol', amount: 20 },
 * // ]
 * ```
 */
export function calculateSettlements(debts: Debt[]): Settlement[] {
  if (debts.length === 0) return [];

  // -----------------------------------------------------------------------
  // Step 1: Compute net balance for every participant.
  //
  //   net > 0 → person is owed money (creditor)
  //   net < 0 → person owes money    (debtor)
  // -----------------------------------------------------------------------
  const balanceMap = new Map<string, number>();

  for (const { from, to, amount } of debts) {
    if (amount <= 0) continue; // skip zero or negative entries
    balanceMap.set(from, (balanceMap.get(from) ?? 0) - amount);
    balanceMap.set(to, (balanceMap.get(to) ?? 0) + amount);
  }

  // -----------------------------------------------------------------------
  // Step 2: Separate into creditors (+) and debtors (−).
  // Sort creditors descending by balance, debtors descending by |balance|.
  // -----------------------------------------------------------------------
  const creditors: Array<{ person: string; balance: number }> = [];
  const debtors: Array<{ person: string; balance: number }> = [];

  for (const [person, balance] of balanceMap) {
    // Use a small epsilon to ignore floating-point dust.
    if (balance > 0.001) {
      creditors.push({ person, balance });
    } else if (balance < -0.001) {
      debtors.push({ person, balance: Math.abs(balance) });
    }
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  // -----------------------------------------------------------------------
  // Step 3: Greedy matching — pair the largest creditor with the largest
  // debtor and transfer as much as possible in each round.
  // -----------------------------------------------------------------------
  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;

    const transferAmount = Math.min(creditor.balance, debtor.balance);

    // Round to 2 decimal places to avoid floating-point artefacts.
    const rounded = Math.round(transferAmount * 100) / 100;

    if (rounded > 0) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: rounded,
      });
    }

    creditor.balance -= transferAmount;
    debtor.balance -= transferAmount;

    // Move past anyone whose balance is now effectively zero.
    if (creditor.balance < 0.001) ci++;
    if (debtor.balance < 0.001) di++;
  }

  return settlements;
}
