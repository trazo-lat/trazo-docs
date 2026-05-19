// Small TypeScript port of examples/sql/main.go — emits a parameterized SQL
// WHERE clause from a query AST. Mirrors the Go visitor enough for the
// playground's SQL preview tab; not a production adapter.

import type { Expression, QueryValue } from "./query-wasm";

export interface SqlOutput {
  where: string;
  params: Array<string | number | boolean>;
}

interface State {
  params: Array<string | number | boolean>;
}

export function toSql(expr: Expression): SqlOutput {
  const state: State = { params: [] };
  const where = visit(expr, state, null);
  return { where, params: state.params };
}

function visit(e: Expression, state: State, parentOp: "AND" | "OR" | null): string {
  switch (e.type) {
    case "binary": {
      const left = wrapBinaryChild(e.op, e.left, state);
      const right = wrapBinaryChild(e.op, e.right, state);
      return `${left} ${e.op} ${right}`;
    }
    case "not":
      return `NOT (${visit(e.expr, state, null)})`;
    case "group":
      return `(${visit(e.expr, state, null)})`;
    case "presence":
      return `${e.field.join(".")} IS NOT NULL`;
    case "qualifier":
      return qualifier(e, state);
    case "selector":
      return selector(e, state);
    case "funccall":
      return "(/* unsupported funccall */)";
  }
}

function wrapBinaryChild(parentOp: "AND" | "OR", child: Expression, state: State): string {
  const s = visit(child, state, parentOp);
  if (parentOp === "AND" && child.type === "binary" && child.op === "OR") {
    return `(${s})`;
  }
  return s;
}

function qualifier(
  e: Extract<Expression, { type: "qualifier" }>,
  state: State,
): string {
  const field = e.field.join(".");
  if (e.endValue !== undefined) {
    return `${field} BETWEEN ${renderValue(e.value, state)} AND ${renderValue(
      e.endValue,
      state,
    )}`;
  }
  if (e.value.wildcard && typeof e.value.value === "string") {
    state.params.push(wildcardToLike(e.value.value));
    return `${field} LIKE $${state.params.length}`;
  }
  return `${field} ${e.op} ${renderValue(e.value, state)}`;
}

function selector(
  e: Extract<Expression, { type: "selector" }>,
  state: State,
): string {
  const list =
    e.base.type === "presence" ? e.base.field.join(".") : "<list>";
  if (!e.inner) return `EXISTS (SELECT 1 FROM ${list})`;
  const inner = visit(e.inner, state, null);
  switch (e.selector) {
    case "all":
      return `NOT EXISTS (SELECT 1 FROM ${list} WHERE NOT (${inner}))`;
    case "none":
      return `NOT EXISTS (SELECT 1 FROM ${list} WHERE ${inner})`;
    default:
      return `EXISTS (SELECT 1 FROM ${list} WHERE ${inner})`;
  }
}

function renderValue(v: QueryValue, state: State): string {
  if (v.type === "function" || v.type === "arithmetic") {
    // Function and arithmetic values arrive opaque from the matcher;
    // emit them inline so the SQL stays self-describing.
    return `(/* ${v.type}: ${v.raw} */)`;
  }
  if (v.value === null) return "NULL";
  state.params.push(v.value as string | number | boolean);
  return `$${state.params.length}`;
}

function wildcardToLike(p: string): string {
  return p.replace(/\*/g, "%");
}
