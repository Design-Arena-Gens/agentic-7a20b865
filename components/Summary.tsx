"use client";

import { endOfMonth, isAfter, isBefore, startOfMonth } from "date-fns";
import { BudgetRule, Expense } from "../lib/types";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function sumCents(expenses: Expense[]): number {
  return expenses.reduce((a, b) => a + b.amountCents, 0);
}

export default function Summary({ expenses, budgets }: { expenses: Expense[]; budgets: BudgetRule[] }) {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const thisMonth = expenses.filter(e => {
    const d = new Date(e.dateISO);
    return !isBefore(d, mStart) && !isAfter(d, mEnd);
  });

  const totalThisMonth = sumCents(thisMonth);
  const totalAll = sumCents(expenses);

  const overallBudget = budgets.find(b => b.category === "overall" && b.period === "monthly");
  const overallLeft = overallBudget ? overallBudget.amountCents - totalThisMonth : null;

  return (
    <div className="grid section">
      <div className="tile kpi card">
        <div className="tile">
          <div className="muted">This month</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalThisMonth, expenses[0]?.currency || overallBudget?.currency || "USD")}</div>
        </div>
        <div className="tile">
          <div className="muted">All time</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalAll, expenses[0]?.currency || overallBudget?.currency || "USD")}</div>
        </div>
        <div className="tile">
          <div className="muted">Budget left</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {overallLeft != null ? formatMoney(Math.max(0, overallLeft), overallBudget!.currency) : "?"}
          </div>
        </div>
      </div>
    </div>
  );
}
