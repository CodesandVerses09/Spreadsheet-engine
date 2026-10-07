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
  const [selectedCell, setSelectedCell] = useState<CellId | null>(null);
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  function startEditing(cellId: CellId) {
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setDraftValue(sheet[cellId]?.rawValue ?? "");
  }
function commitEdit() {
  if (!editingCell) return;

  const isFormula = draftValue.startsWith("=");
  let computedValue: string | number = draftValue;

  if (isFormula) {
    try {
      const tree = parse(draftValue.slice(1));
      computedValue = evaluate(tree, sheet);
    } catch (err) {
      computedValue = "#ERROR";
    }
  }

  setSheet((prev) => ({
    ...prev,
    [editingCell]: {
      rawValue: draftValue,
      formula: isFormula ? draftValue.slice(1) : null,
      computedValue,
    },
  }));

  setEditingCell(null);
}

  return (
    <div className="inline-block border border-gray-400">
      <div className="flex">
        <div className="w-10 h-8 border border-gray-300 bg-gray-100" />
        {Array.from({ length: NUM_COLS }).map((_, col) => (
          <div
            key={col}
            className="w-24 h-8 border border-gray-300 bg-gray-100 flex items-center justify-center text-sm font-semibold">
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
