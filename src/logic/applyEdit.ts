import {
  extractDependencies,
  updateDependencies,
  getRecalculationOrder,
  wouldCreateCycle,
  type DependentsMap,
} from "./dependencyGraph";
import { parse } from "./parser";
import { evaluate } from "./evaluator";
import type { Sheet, CellId } from "./types";

function computeCellValue(
  cellId: CellId,
  currentSheet: Sheet
): { computedValue: string | number; error?: string } {
  const cell = currentSheet[cellId];
  if (!cell) return { computedValue: "" };

  if (!cell.formula) {
    return { computedValue: cell.rawValue };
  }

  try {
    const tree = parse(cell.formula);
    const value = evaluate(tree, currentSheet);
    return { computedValue: value };
  } catch (err) {
    return { computedValue: "#ERROR", error: (err as Error).message };
  }
}

// Never throws: a broken formula simply has no dependencies
function safeDependencies(formula: string | null): CellId[] {
  if (!formula) return [];
  try {
    return extractDependencies(parse(formula));
  } catch {
    return [];
  }
}

function cloneDependents(source: DependentsMap): DependentsMap {
  const copy: DependentsMap = {};
  for (const key of Object.keys(source)) {
    copy[key] = new Set(source[key]);
  }
  return copy;
}

// Applies one edit and returns the new sheet + dependency graph.
// Used for both typing in the grid and loading a saved sheet.
export function applyEdit(
  sheet: Sheet,
  dependents: DependentsMap,
  cellId: CellId,
  draftValue: string
): { sheet: Sheet; dependents: DependentsMap } {
  const isFormula = draftValue.startsWith("=");
  const formulaText = isFormula ? draftValue.slice(1) : null;

  const oldDeps = safeDependencies(sheet[cellId]?.formula ?? null);
  const newDeps = isFormula && formulaText ? safeDependencies(formulaText) : [];

  // Circular reference: store the error, and drop the cell's old links
  if (isFormula && wouldCreateCycle(cellId, newDeps, dependents)) {
    const cleaned = cloneDependents(dependents);
    updateDependencies(cleaned, cellId, oldDeps, []);
    return {
      sheet: {
        ...sheet,
        [cellId]: {
          rawValue: draftValue,
          formula: formulaText,
          computedValue: "#CIRCULAR",
          error: "Circular reference detected",
        },
      },
      dependents: cleaned,
    };
  }

  const updatedDependents = cloneDependents(dependents);
  updateDependencies(updatedDependents, cellId, oldDeps, newDeps);

  const newSheet: Sheet = {
    ...sheet,
    [cellId]: { rawValue: draftValue, formula: formulaText, computedValue: "" },
  };

  const { computedValue, error } = computeCellValue(cellId, newSheet);
  newSheet[cellId] = { ...newSheet[cellId], computedValue, error };

  for (const id of getRecalculationOrder(cellId, updatedDependents)) {
    const result = computeCellValue(id, newSheet);
    newSheet[id] = {
      ...newSheet[id],
      computedValue: result.computedValue,
      error: result.error,
    };
  }

  return { sheet: newSheet, dependents: updatedDependents };
}

// What goes to the database: only the raw text, never computed values
export function toStorable(sheet: Sheet): Record<string, { rawValue: string }> {
  const out: Record<string, { rawValue: string }> = {};
  for (const [cellId, cell] of Object.entries(sheet)) {
    if (cell.rawValue !== "") out[cellId] = { rawValue: cell.rawValue };
  }
  return out;
}

// Rebuilds a full sheet by replaying each saved cell through applyEdit
export function buildSheetFromRaw(
  saved: Record<string, { rawValue?: unknown } | null | undefined>
): { sheet: Sheet; dependents: DependentsMap } {
  let sheet: Sheet = {};
  let dependents: DependentsMap = {};

  for (const [cellId, cell] of Object.entries(saved)) {
    if (!/^[A-Z][0-9]+$/.test(cellId)) continue;
    if (typeof cell?.rawValue !== "string" || cell.rawValue === "") continue;
    const next = applyEdit(sheet, dependents, cellId, cell.rawValue);
    sheet = next.sheet;
    dependents = next.dependents;
  }

  return { sheet, dependents };
}