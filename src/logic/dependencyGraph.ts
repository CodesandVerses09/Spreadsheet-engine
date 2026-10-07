import type { ExprNode } from "./parser";
import type { CellId } from "./types";

// Walks the expression tree and collects every CELL reference it contains
export function extractDependencies(node: ExprNode): CellId[] {
  if (node.type === "CELL") {
    return [node.value];
  }
  if (node.type === "NUMBER") {
    return [];
  }
  return [...extractDependencies(node.left), ...extractDependencies(node.right)];
}

// dependents[A1] = ["C1", "D1"] means: if A1 changes, C1 and D1 need to recalculate
export type DependentsMap = Record<CellId, Set<CellId>>;

// Call this whenever a cell's formula is saved/changed.
// Removes its OLD dependency links first, then adds the NEW ones —
// otherwise stale links would stick around forever (e.g. if you edit
// C1 from "=A1+B1" to "=A1" only, B1 should stop pointing at C1).
export function updateDependencies(
  dependents: DependentsMap,
  cellId: CellId,
  oldDeps: CellId[],
  newDeps: CellId[]
): void {
  // Remove this cell from its old dependencies' dependent lists
  for (const dep of oldDeps) {
    dependents[dep]?.delete(cellId);
  }

  // Add this cell to its new dependencies' dependent lists
  for (const dep of newDeps) {
    if (!dependents[dep]) {
      dependents[dep] = new Set();
    }
    dependents[dep].add(cellId);
  }
}

// Given a cell that just changed, returns every cell that needs to
// recalculate, in the CORRECT order (a cell never appears before
// something it depends on).
export function getRecalculationOrder(
  changedCell: CellId,
  dependents: DependentsMap
): CellId[] {
  const visited = new Set<CellId>();
  const order: CellId[] = [];

  function dfs(cellId: CellId) {
    const dependentCells = dependents[cellId];
    if (!dependentCells) return;

    for (const dep of dependentCells) {
      if (!visited.has(dep)) {
        visited.add(dep);
        dfs(dep); // recurse FIRST — go as deep as possible before adding
        order.push(dep); // then add AFTER, so deeper dependents come first... 
      }
    }
  }

  dfs(changedCell);
  return order.reverse(); // ...then reverse so shallow ones (closer to the change) come first
}
export function wouldCreateCycle(
  cellId: CellId,
  newDeps: CellId[],
  dependents: DependentsMap
): boolean {
  // For each new dependency, ask: "starting from cellId, if I follow the
  // chain of cells that depend on it, do I ever reach this newDep?"
  // If yes, that newDep is already downstream of cellId — so making
  // cellId depend on it would close a loop.

  for (const newDep of newDeps) {
    if (newDep === cellId) return true; // direct self-reference, e.g. A1 = "=A1"

    const visited = new Set<CellId>();

    function dfs(current: CellId): boolean {
      if (current === newDep) return true;
      if (visited.has(current)) return false;
      visited.add(current);

      const currentDependents = dependents[current];
      if (!currentDependents) return false;

      for (const d of currentDependents) {
        if (dfs(d)) return true;
      }
      return false;
    }

    if (dfs(cellId)) return true;
  }

  return false;
}