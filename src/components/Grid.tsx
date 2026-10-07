import {
  extractDependencies,
  updateDependencies,
  getRecalculationOrder,
  wouldCreateCycle,
  type DependentsMap,
} from "../logic/dependencyGraph";

import { useState } from "react";
import Cell from "./Cell";
import type { Sheet, CellId } from "../logic/types";
import { parse } from "../logic/parser";
import { evaluate } from "../logic/evaluator";

const NUM_ROWS = 10;
const NUM_COLS = 10;

function colIndexToLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function makeCellId(row: number, col: number): CellId {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export default function Grid() {
  const [sheet, setSheet] = useState<Sheet>({});
  const [dependents, setDependents] = useState<DependentsMap>({});
  const [selectedCell, setSelectedCell] = useState<CellId | null>(null);
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  function startEditing(cellId: CellId) {
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setDraftValue(sheet[cellId]?.rawValue ?? "");
  }

  // Computes ONE cell's value given the current sheet state
  function computeCellValue(cellId: CellId, currentSheet: Sheet): { computedValue: string | number; error?: string } {
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

  function commitEdit() {
    if (!editingCell) return;

    const isFormula = draftValue.startsWith("=");
    const formulaText = isFormula ? draftValue.slice(1) : null;

    // Figure out the OLD dependencies (before this edit) so we can clean them up
    const oldDeps = sheet[editingCell]?.formula
      ? extractDependencies(parse(sheet[editingCell]!.formula!))
      : [];

    // Figure out the NEW dependencies (after this edit)
    let newDeps: CellId[] = [];
    if (isFormula && formulaText) {
      try {
        newDeps = extractDependencies(parse(formulaText));
      } catch {
        newDeps = [];
      }
    }

    // Check for circular references BEFORE committing anything
if (isFormula && wouldCreateCycle(editingCell, newDeps, dependents)) {
  setSheet((prev) => ({
    ...prev,
    [editingCell]: {
      rawValue: draftValue,
      formula: formulaText,
      computedValue: "#CIRCULAR",
      error: "Circular reference detected",
    },
  }));
  setEditingCell(null);
  return; // stop here — don't update dependencies or recalculate
}

// Update the dependency graph with the new links
const updatedDependents = { ...dependents };
updateDependencies(updatedDependents, editingCell, oldDeps, newDeps);
setDependents(updatedDependents);

    // Build the updated sheet: first set the edited cell's raw value
    let newSheet: Sheet = {
      ...sheet,
      [editingCell]: {
        rawValue: draftValue,
        formula: formulaText,
        computedValue: "", // placeholder, computed below
      },
    };

    // Now compute the edited cell's actual value
    const { computedValue, error } = computeCellValue(editingCell, newSheet);
    newSheet[editingCell] = { ...newSheet[editingCell], computedValue, error };

    // Recalculate every cell that depends on this one, in the correct order
    const toRecalculate = getRecalculationOrder(editingCell, updatedDependents);
    for (const cellId of toRecalculate) {
      const result = computeCellValue(cellId, newSheet);
      newSheet[cellId] = {
        ...newSheet[cellId],
        computedValue: result.computedValue,
        error: result.error,
      };
    }

    setSheet(newSheet);
    setEditingCell(null);
  }

  return (
    <div className="inline-block border border-gray-400">
      <div className="flex">
        <div className="w-10 h-8 border border-gray-300 bg-gray-100" />
        {Array.from({ length: NUM_COLS }).map((_, col) => (
          <div
            key={col}
            className="w-24 h-8 border border-gray-300 bg-gray-100 flex items-center justify-center text-sm font-semibold"
          >
            {colIndexToLetter(col)}
          </div>
        ))}
      </div>

      {Array.from({ length: NUM_ROWS }).map((_, row) => (
        <div key={row} className="flex">
          <div className="w-10 h-8 border border-gray-300 bg-gray-100 flex items-center justify-center text-sm font-semibold">
            {row + 1}
          </div>

          {Array.from({ length: NUM_COLS }).map((_, col) => {
            const cellId = makeCellId(row, col);
            const isEditing = editingCell === cellId;

            return (
              <Cell
                key={cellId}
                value={isEditing ? draftValue : String(sheet[cellId]?.computedValue ?? "")}
                isSelected={selectedCell === cellId}
                isEditing={isEditing}
                onClick={() => setSelectedCell(cellId)}
                onDoubleClick={() => startEditing(cellId)}
                onChange={setDraftValue}
                onCommit={commitEdit}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}