export type Token =
  | { type: "CELL"; value: string }     // e.g. "A1"
  | { type: "NUMBER"; value: number }   // e.g. 3
  | { type: "OPERATOR"; value: "+" | "-" | "*" | "/" };

export function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const char = formula[i];

    // Skip whitespace
    if (char === " ") {
      i++;
      continue;
    }

    // Operators — single character, easy case
    if (["+", "-", "*", "/"].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char as "+" | "-" | "*" | "/" });
      i++;
      continue;
    }

    // Numbers — could be multiple digits, so keep consuming while it's a digit
    if (/[0-9]/.test(char)) {
      let numStr = "";
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        numStr += formula[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: parseFloat(numStr) });
      continue;
    }

    // Cell references — a letter followed by digits, e.g. "A1", "B12"
    if (/[A-Za-z]/.test(char)) {
      let cellStr = "";
      while (i < formula.length && /[A-Za-z0-9]/.test(formula[i])) {
        cellStr += formula[i];
        i++;
      }
      tokens.push({ type: "CELL", value: cellStr.toUpperCase() });
      continue;
    }

    // Anything else is unexpected for now
    throw new Error(`Unexpected character: "${char}"`);
  }

  return tokens;
}