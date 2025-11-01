export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "INR" | "JPY";

export interface Expense {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  currency: CurrencyCode;
  dateISO: string; // ISO date string
}

export interface BudgetRule {
  id: string;
  category: string; // "overall" to apply to all
  amountCents: number;
  period: "monthly" | "weekly";
  currency: CurrencyCode;
}

export interface QueryFilters {
  text?: string; // substring match in description/category
  category?: string;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date (exclusive end of day)
  minCents?: number;
  maxCents?: number;
}

export interface AppState {
  expenses: Expense[];
  budgets: BudgetRule[];
  undoStack: AppStateSnapshot[];
}

export interface AppStateSnapshot {
  expenses: Expense[];
  budgets: BudgetRule[];
}

export type ParsedCommand =
  | { kind: "add"; description: string; category: string; amountCents: number; currency: CurrencyCode; dateISO: string }
  | { kind: "delete_last" }
  | { kind: "delete_id"; id: string }
  | { kind: "clear_all" }
  | { kind: "undo" }
  | { kind: "show"; filters: QueryFilters }
  | { kind: "total"; filters: QueryFilters }
  | { kind: "set_budget"; category: string; amountCents: number; period: "monthly" | "weekly"; currency: CurrencyCode }
  | { kind: "help" };
