"use client";

import { useEffect, useMemo, useState } from "react";
import NLPInput from "../components/NLPInput";
import ExpenseList from "../components/ExpenseList";
import Summary from "../components/Summary";
import { AppState, BudgetRule, CurrencyCode, Expense, ParsedCommand } from "../lib/types";
import { deleteExpense, generateId, loadState, pushUndo, saveState, undo, upsertBudget, upsertExpense } from "../lib/storage";
import { parseCommand } from "../lib/parser";
import { isAfter, isBefore } from "date-fns";

function filterExpenses(expenses: Expense[], filters: { text?: string; category?: string; startDate?: string; endDate?: string; minCents?: number; maxCents?: number }): Expense[] {
  return expenses.filter(e => {
    if (filters.text && !(e.description + " " + e.category).toLowerCase().includes(filters.text.toLowerCase())) return false;
    if (filters.category && e.category.toLowerCase() !== filters.category.toLowerCase()) return false;
    if (filters.startDate && isBefore(new Date(e.dateISO), new Date(filters.startDate))) return false;
    if (filters.endDate && isAfter(new Date(e.dateISO), new Date(filters.endDate))) return false;
    if (filters.minCents != null && e.amountCents < filters.minCents) return false;
    if (filters.maxCents != null && e.amountCents > filters.maxCents) return false;
    return true;
  });
}

export default function Page() {
  const [state, setState] = useState<AppState>({ expenses: [], budgets: [], undoStack: [] });
  const [lastInfo, setLastInfo] = useState<string>("");
  const [currentFilter, setCurrentFilter] = useState<any>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  function apply(cmd: ParsedCommand) {
    if (cmd.kind === "help") {
      setLastInfo("Commands: add/spent ..., show/list ..., total/sum ..., set budget X for CATEGORY, delete last, undo, clear all");
      return;
    }

    if (cmd.kind === "undo") {
      const next = undo(state);
      setState(next);
      setLastInfo("Undid last change");
      return;
    }

    if (cmd.kind === "clear_all") {
      const next = pushUndo(state);
      setState({ ...next, expenses: [], budgets: [] });
      saveState({ ...next, expenses: [], budgets: [] });
      setLastInfo("Cleared all data");
      return;
    }

    if (cmd.kind === "delete_last") {
      const last = state.expenses[0];
      if (!last) {
        setLastInfo("No expenses to delete");
        return;
      }
      const withUndo = pushUndo(state);
      const next = deleteExpense(withUndo, last.id);
      setState(next);
      setLastInfo(`Deleted last expense ${last.description}`);
      return;
    }

    if (cmd.kind === "delete_id") {
      const withUndo = pushUndo(state);
      const next = deleteExpense(withUndo, cmd.id);
      setState(next);
      setLastInfo(`Deleted ${cmd.id}`);
      return;
    }

    if (cmd.kind === "add") {
      const withUndo = pushUndo(state);
      const e: Expense = {
        id: generateId("exp"),
        description: cmd.description,
        category: cmd.category,
        amountCents: cmd.amountCents,
        currency: cmd.currency as CurrencyCode,
        dateISO: cmd.dateISO,
      };
      const next = upsertExpense(withUndo, e);
      setState(next);
      setLastInfo(`Added ${e.description} for ${(e.amountCents / 100).toFixed(2)} ${e.currency}`);
      setCurrentFilter(null);
      return;
    }

    if (cmd.kind === "set_budget") {
      const withUndo = pushUndo(state);
      const rule: BudgetRule = {
        id: `${cmd.category}-${cmd.period}`,
        category: cmd.category.toLowerCase(),
        amountCents: cmd.amountCents,
        period: cmd.period,
        currency: cmd.currency,
      };
      const next = upsertBudget(withUndo, rule);
      setState(next);
      setLastInfo(`Budget set for ${rule.category} (${rule.period})`);
      return;
    }

    if (cmd.kind === "show") {
      setCurrentFilter(cmd.filters);
      setLastInfo("Applied filters");
      return;
    }

    if (cmd.kind === "total") {
      const subset = filterExpenses(state.expenses, cmd.filters);
      const cents = subset.reduce((a, b) => a + b.amountCents, 0);
      const currency = subset[0]?.currency || state.expenses[0]?.currency || "USD";
      setLastInfo(`Total: ${new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100)}`);
      return;
    }
  }

  const visibleExpenses = useMemo(() => {
    if (!currentFilter) return state.expenses;
    return filterExpenses(state.expenses, currentFilter);
  }, [state.expenses, currentFilter]);

  return (
    <div>
      <NLPInput onCommand={(text) => apply(parseCommand(text))} />

      {lastInfo && (
        <div className="card section">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">{lastInfo}</div>
            {currentFilter && (
              <button className="button secondary" onClick={() => setCurrentFilter(null)}>Clear filter</button>
            )}
          </div>
        </div>
      )}

      <Summary expenses={state.expenses} budgets={state.budgets} />

      <div className="section">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <div className="badge">{visibleExpenses.length} items</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="button secondary" onClick={() => apply({ kind: "undo" })}>Undo</button>
            <button className="button secondary" onClick={() => apply({ kind: "delete_last" })}>Delete last</button>
          </div>
        </div>
        <ExpenseList items={visibleExpenses} onDelete={(id) => apply({ kind: "delete_id", id })} />
      </div>

      <div className="card section">
        <div className="muted">Budgets</div>
        <div className="hr" />
        {state.budgets.length === 0 ? (
          <div className="muted">No budgets set. Try "set budget 500 for overall".</div>
        ) : (
          <div className="list">
            {state.budgets.map(b => {
              const inScope = state.expenses.filter(e => {
                if (b.category !== "overall" && e.category.toLowerCase() !== b.category) return false;
                // Only evaluate monthly budgets for current month (simplified)
                return true;
              });
              const spent = inScope.reduce((a, e) => a + e.amountCents, 0);
              const pct = Math.min(100, Math.round((spent / b.amountCents) * 100));
              return (
                <div key={b.id} className="item">
                  <div>
                    <div className="desc">{b.category} ({b.period})</div>
                    <div className="meta">Budget: {new Intl.NumberFormat(undefined, { style: "currency", currency: b.currency }).format(b.amountCents / 100)}</div>
                  </div>
                  <div className="amount">{pct}% used</div>
                  <div className="muted">Left {new Intl.NumberFormat(undefined, { style: "currency", currency: b.currency }).format(Math.max(0, b.amountCents - spent) / 100)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
