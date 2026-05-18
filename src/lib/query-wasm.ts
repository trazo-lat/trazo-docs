// Browser-only loader for the query language WASM bundle.
//
// The two artifacts under public/query/ come straight from the query repo
// (cd wasm && make build). The wrapper here mirrors what @trazo/query
// (in the same repo at wasm/npm) exposes, minus the Node.js path — this
// file is shipped exclusively to the browser.

export type Operator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "..";
export type LogicalOp = "AND" | "OR";

export type ValueType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "duration"
  | "function"
  | "arithmetic";

export interface QueryValue {
  type: ValueType;
  raw: string;
  value: string | number | boolean | null;
  wildcard?: boolean;
}

export interface BinaryExpr {
  type: "binary";
  op: LogicalOp;
  left: Expression;
  right: Expression;
}

export interface UnaryExpr {
  type: "not";
  expr: Expression;
}

export interface QualifierExpr {
  type: "qualifier";
  op: Operator;
  field: string[];
  value: QueryValue;
  endValue?: QueryValue;
}

export interface PresenceExpr {
  type: "presence";
  field: string[];
}

export interface GroupExpr {
  type: "group";
  expr: Expression;
}

export interface SelectorExpr {
  type: "selector";
  base: Expression;
  selector: string;
  inner?: Expression;
}

export interface FuncCallExpr {
  type: "funccall";
  name: string;
  args: unknown[];
}

export type Expression =
  | BinaryExpr
  | UnaryExpr
  | QualifierExpr
  | PresenceExpr
  | GroupExpr
  | SelectorExpr
  | FuncCallExpr;

/**
 * FieldValueType is an integer enum that mirrors the Go validate package.
 * The validator marshals incoming JSON field config into this integer.
 */
export const FieldValueType = {
  Text: 0,
  Integer: 1,
  Decimal: 2,
  Boolean: 3,
  Date: 4,
  Datetime: 5,
  Duration: 6,
} as const;
export type FieldValueTypeId = (typeof FieldValueType)[keyof typeof FieldValueType];

export const FieldValueTypeName: Record<FieldValueTypeId, string> = {
  [FieldValueType.Text]: "text",
  [FieldValueType.Integer]: "integer",
  [FieldValueType.Decimal]: "decimal",
  [FieldValueType.Boolean]: "boolean",
  [FieldValueType.Date]: "date",
  [FieldValueType.Datetime]: "datetime",
  [FieldValueType.Duration]: "duration",
};

export type Op = "=" | "!=" | ">" | ">=" | "<" | "<=" | ".." | "*" | "?";

export interface FieldConfig {
  Name: string;
  Type: FieldValueTypeId;
  AllowedOps: Op[];
  Nested?: boolean;
}

export interface ParseResult {
  result?: Expression;
  error?: string;
}

export interface ValidateResult {
  valid: boolean;
  errors?: string[];
}

export interface StringifyResult {
  result?: string;
  error?: string;
}

export interface TokenInfo {
  type: string;
  value: string;
  offset: number;
  quoted?: boolean;
}

export interface TokensResult {
  result?: TokenInfo[];
  error?: string;
}

export interface QueryAPI {
  parse: (q: string, maxLength?: number) => ParseResult;
  validate: (ast: Expression, fields: FieldConfig[]) => ValidateResult;
  stringify: (ast: Expression) => StringifyResult;
  parseAndValidate: (q: string, fields: FieldConfig[]) => ParseResult;
  tokens: (q: string, maxLength?: number) => TokensResult;
}

declare global {
  // Functions registered by main.go via syscall/js.
  function queryParse(q: string, maxLength?: number): ParseResult;
  function queryValidate(astJSON: string, fieldsJSON: string): ValidateResult;
  function queryStringify(astJSON: string): StringifyResult;
  function queryParseAndValidate(q: string, fieldsJSON: string): ParseResult;
  function queryTokens(q: string, maxLength?: number): TokensResult;

  // wasm_exec.js attaches Go to the global scope.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class Go {
    importObject: WebAssembly.Imports;
    run(instance: WebAssembly.Instance): Promise<void>;
  }
}

let loaderPromise: Promise<QueryAPI> | null = null;

async function loadWasmExec(): Promise<void> {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).Go) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/query/wasm_exec.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load /query/wasm_exec.js"));
    document.head.appendChild(s);
  });
}

/**
 * Load the query WASM module. Safe to call multiple times — the second call
 * returns the same in-flight promise.
 */
export function loadQueryWasm(): Promise<QueryAPI> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = (async () => {
    await loadWasmExec();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const go = new (globalThis as any).Go();
    const resp = await fetch("/query/query.wasm");
    if (!resp.ok) throw new Error(`fetch /query/query.wasm: ${resp.status}`);
    const bytes = await resp.arrayBuffer();
    const inst = await WebAssembly.instantiate(bytes, go.importObject);
    // Don't await — main() blocks forever on select{}.
    void go.run(inst.instance);
    // Give Go's scheduler a microtask to register globals.
    await new Promise((r) => setTimeout(r, 0));
    return {
      parse: (q, maxLength) => queryParse(q, maxLength),
      validate: (ast, fields) =>
        queryValidate(JSON.stringify(ast), JSON.stringify(fields)),
      stringify: (ast) => queryStringify(JSON.stringify(ast)),
      parseAndValidate: (q, fields) =>
        queryParseAndValidate(q, JSON.stringify(fields)),
      tokens: (q, maxLength) => queryTokens(q, maxLength),
    } satisfies QueryAPI;
  })();
  return loaderPromise;
}

/** Default schema preloaded into the playground. */
export function defaultFields(): FieldConfig[] {
  return [
    { Name: "state", Type: FieldValueType.Text, AllowedOps: ["=", "!=", "*"] },
    { Name: "name", Type: FieldValueType.Text, AllowedOps: ["=", "!=", "*"] },
    { Name: "total", Type: FieldValueType.Decimal, AllowedOps: ["=", "!=", ">", ">=", "<", "<=", ".."] },
    { Name: "year", Type: FieldValueType.Integer, AllowedOps: ["=", "!=", ">", ">=", "<", "<=", ".."] },
    { Name: "active", Type: FieldValueType.Boolean, AllowedOps: ["=", "!="] },
    { Name: "created_at", Type: FieldValueType.Date, AllowedOps: ["=", "!=", ">", ">=", "<", "<=", ".."] },
    { Name: "ttl", Type: FieldValueType.Duration, AllowedOps: ["=", "!=", ">", ">=", "<", "<=", ".."] },
    { Name: "labels", Type: FieldValueType.Text, AllowedOps: ["=", "!=", "*"], Nested: true },
    { Name: "orders", Type: FieldValueType.Text, AllowedOps: ["=", "!=", "*"] },
    { Name: "status", Type: FieldValueType.Text, AllowedOps: ["=", "!="] },
    { Name: "price", Type: FieldValueType.Decimal, AllowedOps: ["=", "!=", ">", ">=", "<", "<="] },
  ];
}

/** Canned example queries for the dropdown. */
export const EXAMPLES: { label: string; query: string }[] = [
  { label: "Equality + comparison", query: "state=draft AND total>=50000" },
  { label: "Range + functions", query: "created_at:daysAgo(30)..now()" },
  { label: "Arithmetic in value position", query: "total>=50000*1.1" },
  { label: "Selector (any)", query: "orders@(status=shipped)" },
  { label: "Selector (all)", query: "orders@all(price>0)" },
  { label: "IN list + implicit AND", query: "state IN (draft, issued) year>=2025" },
  { label: "Quoted string + escape", query: 'name="John Doe"' },
  { label: "Coalesce / if", query: 'coalesce(nickname, name)="John"' },
];
