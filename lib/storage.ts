import { AppState, AppStateSnapshot, BudgetRule, Expense } from "./types";

const STORAGE_KEY = "nlp_expenses_state_v1";

function safeParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return { expenses: [], budgets: [], undoStack: [] };
  }
  const data = safeParse<AppState>(localStorage.getItem(STORAGE_KEY), {
    expenses: [],
    budgets: [],
    undoStack: [],
  });
  // ensure arrays exist
  return {
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    undoStack: Array.isArray(data.undoStack) ? data.undoStack : [],
  };
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function pushUndo(state: AppState): AppState {
  const snapshot: AppStateSnapshot = {
    expenses: [...state.expenses],
    budgets: [...state.budgets],
  };
  const next: AppState = { ...state, undoStack: [...state.undoStack, snapshot] };
  saveState(next);
  return next;
}

export function undo(state: AppState): AppState {
  if (state.undoStack.length === 0) return state;
  const snapshot = state.undoStack[state.undoStack.length - 1];
  const next: AppState = {
    expenses: snapshot.expenses,
    budgets: snapshot.budgets,
    undoStack: state.undoStack.slice(0, -1),
  };
  saveState(next);
  return next;
}

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertExpense(state: AppState, expense: Expense): AppState {
  const exists = state.expenses.findIndex(e => e.id === expense.id);
  const nextExpenses = exists >= 0
    ? state.expenses.map(e => (e.id === expense.id ? expense : e))
    : [expense, ...state.expenses];
  const next = { ...state, expenses: nextExpenses };
  saveState(next);
  return next;
}

export function deleteExpense(state: AppState, id: string): AppState {
  const next = { ...state, expenses: state.expenses.filter(e => e.id !== id) };
  saveState(next);
  return next;
}

export function upsertBudget(state: AppState, rule: BudgetRule): AppState {
  const idx = state.budgets.findIndex(
    b => b.category.toLowerCase() === rule.category.toLowerCase() && b.period === rule.period
  );
  const nextBudgets = idx >= 0
    ? state.budgets.map(b => (b.category.toLowerCase() === rule.category.toLowerCase() && b.period === rule.period ? rule : b))
    : [rule, ...state.budgets];
  const next = { ...state, budgets: nextBudgets };
  saveState(next);
  return next;
}
