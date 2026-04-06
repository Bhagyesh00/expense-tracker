import { describe, it, expect } from 'vitest';
import { calculateSettlements, type Debt } from '../settlement';

describe('calculateSettlements', () => {
  it('returns empty array for no debts', () => {
    expect(calculateSettlements([])).toEqual([]);
  });

  it('handles simple 2-person debt', () => {
    const debts: Debt[] = [{ from: 'Alice', to: 'Bob', amount: 100 }];
    const settlements = calculateSettlements(debts);

    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({
      from: 'Alice',
      to: 'Bob',
      amount: 100,
    });
  });

  it('simplifies 3-person circular debt', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 100 },
      { from: 'Bob', to: 'Carol', amount: 50 },
      { from: 'Carol', to: 'Alice', amount: 30 },
    ];
    const settlements = calculateSettlements(debts);

    // Net: Alice: -100+30 = -70, Bob: +100-50 = +50, Carol: +50-30 = +20
    // Alice pays Bob 50, Alice pays Carol 20
    const totalPaid = settlements.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBe(70);
    // Should produce fewer transactions than the original 3
    expect(settlements.length).toBeLessThanOrEqual(2);
  });

  it('handles already settled debts (net zero)', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 50 },
      { from: 'Bob', to: 'Alice', amount: 50 },
    ];
    const settlements = calculateSettlements(debts);
    expect(settlements).toHaveLength(0);
  });

  it('handles single person owing multiple people', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 100 },
      { from: 'Alice', to: 'Carol', amount: 200 },
      { from: 'Alice', to: 'Dave', amount: 50 },
    ];
    const settlements = calculateSettlements(debts);

    // Alice owes 350 total: should pay all three
    const totalPaid = settlements.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBe(350);
    // All settlements should have Alice as the payer
    for (const s of settlements) {
      expect(s.from).toBe('Alice');
    }
  });

  it('handles large group with complex debts (5+ people)', () => {
    const debts: Debt[] = [
      { from: 'A', to: 'B', amount: 100 },
      { from: 'B', to: 'C', amount: 200 },
      { from: 'C', to: 'D', amount: 150 },
      { from: 'D', to: 'E', amount: 50 },
      { from: 'E', to: 'A', amount: 80 },
      { from: 'A', to: 'C', amount: 30 },
    ];
    const settlements = calculateSettlements(debts);

    // Verify net balances are preserved: total credits = total debits
    const netFromSettlements = new Map<string, number>();
    for (const s of settlements) {
      netFromSettlements.set(
        s.from,
        (netFromSettlements.get(s.from) ?? 0) - s.amount,
      );
      netFromSettlements.set(
        s.to,
        (netFromSettlements.get(s.to) ?? 0) + s.amount,
      );
    }

    // Compute original net balances
    const originalNet = new Map<string, number>();
    for (const d of debts) {
      originalNet.set(d.from, (originalNet.get(d.from) ?? 0) - d.amount);
      originalNet.set(d.to, (originalNet.get(d.to) ?? 0) + d.amount);
    }

    // Each person's net should match (within rounding)
    for (const [person, net] of originalNet) {
      const settlementNet = netFromSettlements.get(person) ?? 0;
      expect(settlementNet).toBeCloseTo(net, 1);
    }

    // Should reduce the number of transactions
    expect(settlements.length).toBeLessThanOrEqual(debts.length);
  });

  it('skips zero-amount debts', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 0 },
      { from: 'Carol', to: 'Dave', amount: 100 },
    ];
    const settlements = calculateSettlements(debts);

    expect(settlements).toHaveLength(1);
    expect(settlements[0]!.amount).toBe(100);
  });

  it('skips negative-amount debts', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: -50 },
      { from: 'Carol', to: 'Dave', amount: 100 },
    ];
    const settlements = calculateSettlements(debts);

    expect(settlements).toHaveLength(1);
    expect(settlements[0]!.amount).toBe(100);
  });

  it('handles floating point amounts correctly', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 33.33 },
      { from: 'Alice', to: 'Bob', amount: 33.33 },
      { from: 'Alice', to: 'Bob', amount: 33.34 },
    ];
    const settlements = calculateSettlements(debts);

    expect(settlements).toHaveLength(1);
    expect(settlements[0]!.amount).toBe(100);
  });

  it('handles multiple debts between same pair in opposite directions', () => {
    const debts: Debt[] = [
      { from: 'Alice', to: 'Bob', amount: 100 },
      { from: 'Bob', to: 'Alice', amount: 30 },
    ];
    const settlements = calculateSettlements(debts);

    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({
      from: 'Alice',
      to: 'Bob',
      amount: 70,
    });
  });

  it('produces all positive settlement amounts', () => {
    const debts: Debt[] = [
      { from: 'A', to: 'B', amount: 50 },
      { from: 'B', to: 'C', amount: 100 },
      { from: 'C', to: 'A', amount: 75 },
    ];
    const settlements = calculateSettlements(debts);

    for (const s of settlements) {
      expect(s.amount).toBeGreaterThan(0);
    }
  });
});
