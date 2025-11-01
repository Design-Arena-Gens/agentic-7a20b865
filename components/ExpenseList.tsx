"use client";

import { format } from "date-fns";
import { Expense } from "../lib/types";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function ExpenseList({ items, onDelete }: { items: Expense[]; onDelete: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="card section">
        <div className="muted">No expenses yet. Add one above.</div>
      </div>
    );
  }

  return (
    <div className="card section">
      <div className="list">
        {items.map((e) => (
          <div key={e.id} className="item">
            <div>
              <div className="desc">{e.description}</div>
              <div className="meta">{e.category} ? {format(new Date(e.dateISO), "PP p")}</div>
            </div>
            <div className="amount">{formatMoney(e.amountCents, e.currency)}</div>
            <div>
              <button className="button secondary" onClick={() => onDelete(e.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
