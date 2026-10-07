import { tokenize, type Token } from "./tokenizer";

// The tree node shapes we're building
export type ExprNode =
  | { type: "CELL"; value: string }
  | { type: "NUMBER"; value: number }
  | { type: "BINARY_OP"; operator: "+" | "-" | "*" | "/"; left: ExprNode; right: ExprNode };

export function parse(formula: string): ExprNode {
  const tokens = tokenize(formula);
  let pos = 0; // tracks which token we're currently looking at

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  // Handles + and - (lowest precedence)
  function parseExpression(): ExprNode {
    let left = parseTerm();

    while (
      peek()?.type === "OPERATOR" &&
      (peek()!.value === "+" || peek()!.value === "-")
    ) {
      const opToken = consume();
      const right = parseTerm();
      left = {
        type: "BINARY_OP",
        operator: opToken.value as "+" | "-",
        left,
        right,
      };
    }

    return left;
  }

  // Handles * and / (higher precedence)
  function parseTerm(): ExprNode {
    let left = parseFactor();

    while (
      peek()?.type === "OPERATOR" &&
      (peek()!.value === "*" || peek()!.value === "/")
    ) {
      const opToken = consume();
      const right = parseFactor();
      left = {
        type: "BINARY_OP",
        operator: opToken.value as "*" | "/",
        left,
        right,
      };
    }

    return left;
  }

  // Handles a single leaf value: a number or a cell reference
  function parseFactor(): ExprNode {
    const token = consume();

    if (token.type === "NUMBER") {
      return { type: "NUMBER", value: token.value };
    }

    if (token.type === "CELL") {
      return { type: "CELL", value: token.value };
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  const result = parseExpression();
  return result;
}