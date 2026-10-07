import type { ExprNode } from "./parser";
import type { Sheet } from "./types";

export function evaluate(node: ExprNode, sheet: Sheet): number {
  if (node.type === "NUMBER") {
    return node.value;
  }

  if (node.type === "CELL") {
    const cell = sheet[node.value];

    // Empty or nonexistent cell — treat as 0, like most spreadsheets do
    if (!cell || cell.computedValue === null || cell.computedValue === "") {
      return 0;
    }

    const val = cell.computedValue;
    if (typeof val === "number") return val;

    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      throw new Error(`Cell ${node.value} does not contain a number`);
    }
    return parsed;
  }

  // BINARY_OP case
  const left = evaluate(node.left, sheet);
  const right = evaluate(node.right, sheet);

  switch (node.operator) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/":
      if (right === 0) throw new Error("Division by zero");
      return left / right;
  }
}