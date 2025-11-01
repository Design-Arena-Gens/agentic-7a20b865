import { addDays, endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import * as chrono from "chrono-node";
import { CurrencyCode, ParsedCommand, QueryFilters } from "./types";

const DEFAULT_CURRENCY: CurrencyCode = "USD";

function parseAmountCents(input: string): number | null {
  const normalized = input.replace(/,/g, "").trim();
  const money = normalized.match(/(?:\$|\u20AC|\u00A3)?\s*(-?\d+(?:\.\d{1,2})?)/i);
  if (!money) return null;
  const value = parseFloat(money[1]);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function detectCurrency(input: string): CurrencyCode {
  if (/\u20AC/.test(input)) return "EUR"; // ?
  if (/\u00A3/.test(input)) return "GBP"; // ?
  if (/\bINR\b|\u20B9/.test(input)) return "INR"; // ?
  if (/\bCAD\b/.test(input)) return "CAD";
  if (/\bAUD\b/.test(input)) return "AUD";
  if (/\bJPY\b|\u00A5/.test(input)) return "JPY"; // ?
  return "USD";
}

function parseDateISO(input: string): string {
  const ref = new Date();
  const result = chrono.parse(input, ref, { forwardDate: true });
  if (result.length > 0) {
    return result[0].start.date().toISOString();
  }
  return new Date().toISOString();
}

function extractCategory(text: string): string {
  const forMatch = text.match(/\b(?:for|on|at|for\s+the)\s+([\w\s-]{2,})/i);
  if (forMatch) {
    const phrase = forMatch[1]
      .replace(/\b(?:yesterday|today|tomorrow|last\s+\w+|next\s+\w+)\b/i, "")
      .replace(/\b\d{1,2}(:\d{2})?\b/, "")
      .trim();
    const word = phrase.split(/\s+/)[0];
    if (word) return word.toLowerCase();
  }
  const cat = text.match(/\b(grocer(?:y|ies)|food|lunch|dinner|coffee|transport|gas|fuel|uber|lyft|rent|utilities|entertainment|shopping|health|medical|travel|flight|hotel|subscriptions?)\b/i);
  if (cat) return cat[0].toLowerCase().replace(/ies$/, "y");
  return "general";
}

function between(start?: Date, end?: Date): QueryFilters {
  return {
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
  };
}

function parseShowOrTotal(text: string, kind: "show" | "total"): ParsedCommand {
  const lc = text.toLowerCase();
  let filters: QueryFilters = {};

  const over = text.match(/over\s+([\$\u20AC\u00A3]?\s*\d+[\d,.]*(?:\.\d{1,2})?)/i);
  if (over) filters.minCents = parseAmountCents(over[1]) ?? undefined;
  const under = text.match(/under\s+([\$\u20AC\u00A3]?\s*\d+[\d,.]*(?:\.\d{1,2})?)/i);
  if (under) filters.maxCents = parseAmountCents(under[1]) ?? undefined;

  const cat = extractCategory(text);
  if (cat !== "general" || /\bcategory\b/.test(lc)) filters.category = cat;

  if (/\btoday\b/.test(lc)) filters = { ...filters, ...between(startOfDay(new Date()), endOfDay(new Date())) };
  else if (/\byesterday\b/.test(lc)) {
    const y = new Date(Date.now() - 24 * 60 * 60 * 1000);
    filters = { ...filters, ...between(startOfDay(y), endOfDay(y)) };
  } else if (/\bthis\s+week\b/.test(lc)) filters = { ...filters, ...between(startOfWeek(new Date()), endOfWeek(new Date())) };
  else if (/\bthis\s+month\b/.test(lc)) filters = { ...filters, ...between(startOfMonth(new Date()), endOfMonth(new Date())) };
  else if (/\bthis\s+year\b/.test(lc)) filters = { ...filters, ...between(startOfYear(new Date()), endOfYear(new Date())) };
  else {
    const range = chrono.parse(text);
    if (range.length > 0) {
      const r = range[0];
      if (r.start) {
        const start = r.start.date();
        const end = r.end ? r.end.date() : endOfDay(r.start.date());
        filters = { ...filters, ...between(start, end) };
      }
    }
  }

  return { kind, filters };
}

export function parseCommand(input: string): ParsedCommand {
  const text = input.trim();
  if (text.length === 0) return { kind: "help" };
  const lc = text.toLowerCase();

  if (/\bhelp\b|\bwhat can i say\b/.test(lc)) return { kind: "help" };
  if (/\bundo\b/.test(lc)) return { kind: "undo" };
  if (/\bclear\s+all\b/.test(lc)) return { kind: "clear_all" };
  if (/\bdelete\s+last\b|\bremove\s+last\b/.test(lc)) return { kind: "delete_last" };

  const delId = lc.match(/\b(?:delete|remove)\s+([a-z]+_[a-z0-9]+_[a-z0-9]+)\b/i);
  if (delId) return { kind: "delete_id", id: delId[1] };

  if (/\b^(show|list|filter)\b/.test(lc) || /\bshow\b|\blist\b|\bfilter\b/.test(lc)) {
    return parseShowOrTotal(text, "show");
  }

  if (/\btotal\b|\bsum\b|\bhow much\b|\bspent\s+in\s+total\b/.test(lc)) {
    return parseShowOrTotal(text, "total");
  }

  const budget = text.match(/set\s+budget\s+([\$\u20AC\u00A3]?\s*\d+(?:\.\d{1,2})?)\s+(?:for\s+)?([\w-]+)(?:\s+(monthly|weekly))?/i);
  if (budget) {
    const amountCents = parseAmountCents(budget[1]) ?? 0;
    const category = budget[2].toLowerCase();
    const period = (budget[3]?.toLowerCase() as "monthly" | "weekly") || "monthly";
    const currency = detectCurrency(budget[1]);
    return { kind: "set_budget", category, amountCents, period, currency };
  }

  if (/\b(add|spent|spend|buy|bought|record|log)\b/.test(lc)) {
    const amountCents = parseAmountCents(text);
    const currency = detectCurrency(text) || DEFAULT_CURRENCY;
    const dateISO = chrono.parseDate(text)?.toISOString() ?? new Date().toISOString();
    const category = extractCategory(text);
    const cleaned = text
      .replace(/\b(add|spent|spend|buy|bought|record|log)\b/i, "")
      .replace(/\bfor\b/i, "")
      .replace(/[\$\u20AC\u00A3]?\s*\d+[\d,.]*(?:\.\d{1,2})?/i, "")
      .replace(/\b(yesterday|today|tomorrow|last\s+\w+|next\s+\w+)\b/gi, "")
      .trim();
    const description = cleaned.length > 0 ? cleaned : category;

    if (amountCents != null) {
      return { kind: "add", description, category, amountCents, currency, dateISO };
    }
  }

  const fallbackAmount = parseAmountCents(text);
  if (fallbackAmount != null) {
    const currency = detectCurrency(text) || DEFAULT_CURRENCY;
    const dateISO = chrono.parseDate(text)?.toISOString() ?? new Date().toISOString();
    const category = extractCategory(text);
    return { kind: "add", description: category, category, amountCents: fallbackAmount, currency, dateISO };
  }

  if (/\bthis\b|\blast\b|\btoday\b|\byesterday\b|\bweek\b|\bmonth\b|\byear\b/.test(lc)) {
    return parseShowOrTotal(text, "show");
  }

  return { kind: "help" };
}
