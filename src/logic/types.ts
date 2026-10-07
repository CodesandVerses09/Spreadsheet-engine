// The result of evaluating a cell — either a number, text, or an error state
export type CellValue = number | string | null;

export interface Cell {
  rawValue: string; // exactly what the user typed: "10" or "=A1+5"
  formula: string | null; // the formula text without "=" if rawValue starts with "="; otherwise null
  computedValue: CellValue; // what actually gets displayed
  error?: string; // e.g. "Circular reference" or "Invalid formula"
}

export type CellId = string; // e.g. "A1", "B12"

// The whole spreadsheet: sparse object, only cells with data exist as keys
export type Sheet = Record<CellId, Cell>;
