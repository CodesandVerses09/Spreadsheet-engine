import { useEffect, useState } from "react";
import Cell from "./Cell";
import type { Sheet, CellId } from "../logic/types";
import type { DependentsMap } from "../logic/dependencyGraph";
import { applyEdit, buildSheetFromRaw, toStorable } from "../logic/applyEdit";
import { createSheet, loadSheet, saveSheet } from "../api";

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
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Load a saved sheet if the URL looks like /#<sheet-id>
  useEffect(() => {
    const idFromUrl = window.location.hash.slice(1);
    if (!idFromUrl) return;

    let cancelled = false;
    setBusy(true);
    setStatus("Loading… the server may be waking up (up to a minute).");

    loadSheet(idFromUrl)
      .then((data) => {
        if (cancelled) return;
        const built = buildSheetFromRaw(
          data.cells as Record<string, { rawValue?: unknown }>
        );
        setSheet(built.sheet);
        setDependents(built.dependents);
        setSheetId(data.id);
        setStatus("Loaded.");
      })
      .catch(() => {
        if (!cancelled)
          setStatus("Could not load this sheet. Your current sheet is untouched.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function startEditing(cellId: CellId) {
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setDraftValue(sheet[cellId]?.rawValue ?? "");
  }

  function commitEdit() {
    if (!editingCell) return;
    const result = applyEdit(sheet, dependents, editingCell, draftValue);
    setSheet(result.sheet);
    setDependents(result.dependents);
    setEditingCell(null);
  }

  async function handleSave() {
    setBusy(true);
    setStatus("Saving… the server may be waking up (up to a minute).");
    try {
      const cells = toStorable(sheet);
      if (sheetId) {
        await saveSheet(sheetId, cells);
      } else {
        const { id } = await createSheet("Untitled", cells);
        setSheetId(id);
        window.location.hash = id;
      }
      setStatus("Saved.");
    } catch {
      setStatus("Save failed. Your sheet is still here, so try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleNew() {
    setSheet({});
    setDependents({});
    setSheetId(null);
    setSelectedCell(null);
    setEditingCell(null);
    setStatus("");
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={handleSave}
          disabled={busy}
          className="px-3 py-1 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleNew}
          disabled={busy}
          className="px-3 py-1 text-sm rounded border border-gray-400 disabled:opacity-50"
        >
          New
        </button>
        <span className="text-sm text-gray-600">{status}</span>
      </div>

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
                  value={
                    isEditing ? draftValue : String(sheet[cellId]?.computedValue ?? "")
                  }
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
    </div>
  );
}