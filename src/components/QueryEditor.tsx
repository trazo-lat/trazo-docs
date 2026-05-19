import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  defaultFields,
  EXAMPLES,
  FieldValueType,
  FieldValueTypeName,
  loadQueryWasm,
  type Expression,
  type FieldConfig,
  type FieldValueTypeId,
  type Op,
  type QueryAPI,
  type TokenInfo,
} from "../lib/query-wasm";
import { toSql } from "../lib/query-sql";

type Tab = "ast" | "roundtrip" | "errors" | "tokens" | "sql";

interface State {
  query: string;
  fields: FieldConfig[];
  api: QueryAPI | null;
  loading: boolean;
  loadError: string | null;
  parseError: string | null;
  ast: Expression | null;
  roundtrip: string | null;
  validateErrors: string[];
  tokens: TokenInfo[];
  recordsText: string;
  recordsError: string | null;
  matchError: string | null;
  /** True when the records textarea contains a single object (not an array). */
  recordsSingle: boolean;
  /** Parallel to the parsed records array. Length-1 when recordsSingle. */
  matched: boolean[];
  tab: Tab;
  showSchema: boolean;
  copied: "ast" | "url" | null;
}

const DEFAULT_RECORDS = JSON.stringify(
  [
    {
      state: "draft",
      total: 60000,
      name: "John Doe",
      nickname: "Johnny",
      year: 2026,
      active: true,
      region: "US",
      orders: [{ status: "shipped", price: 200 }, { status: "pending", price: 50 }],
    },
    {
      state: "draft",
      total: 30000,
      name: "Jane Smith",
      year: 2026,
      active: true,
      region: "EU",
      orders: [{ status: "shipped", price: 100 }],
    },
    {
      state: "issued",
      total: 75000,
      name: "Acme Corp",
      year: 2026,
      active: true,
      region: "US",
      orders: [{ status: "delivered", price: 500 }, { status: "delivered", price: 300 }],
    },
    {
      state: "cancelled",
      total: 90000,
      name: "Globex Inc",
      year: 2025,
      active: false,
      region: "EU",
      orders: [{ status: "cancelled", price: 0 }],
    },
    { state: "draft", name: "Missing total", year: 2026 },
  ],
  null,
  2,
);

// Reference Starlight's theme tokens so the editor swaps cleanly between
// light and dark. The panel uses gray-5 (more contrast against the page
// background, which is gray-6/black) and inner code surfaces use gray-6.
const PALETTE = {
  panelBg: "var(--sl-color-gray-5)",
  surface: "var(--sl-color-gray-6)",
  border: "var(--sl-color-gray-3)",
  borderSubtle: "var(--sl-color-gray-4)",
  text: "var(--sl-color-white)",
  muted: "var(--sl-color-gray-2)",
  accent: "var(--sl-color-accent)",
  coral: "var(--heyllave-coral, #FF6B5B)",
  coralDeep: "var(--heyllave-coral-deep, #E84D3C)",
};

const TAB_LABELS: Record<Tab, string> = {
  ast: "AST",
  roundtrip: "Round-trip",
  errors: "Errors",
  tokens: "Tokens",
  sql: "SQL preview",
};

const OPS: Op[] = ["=", "!=", ">", ">=", "<", "<=", "..", "*", "?"];

function decodeShareParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(name);
  if (!raw) return null;
  try {
    return atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
}

function encodeShareParam(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function QueryEditor() {
  const initialQuery = decodeShareParam("q") ?? "state=draft AND total>=50000*1.1";
  const initialSchema = ((): FieldConfig[] | null => {
    const raw = decodeShareParam("schema");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as FieldConfig[];
    } catch {
      return null;
    }
  })();

  const [state, setState] = useState<State>({
    query: initialQuery,
    fields: initialSchema ?? defaultFields(),
    api: null,
    loading: true,
    loadError: null,
    parseError: null,
    ast: null,
    roundtrip: null,
    validateErrors: [],
    tokens: [],
    recordsText: DEFAULT_RECORDS,
    recordsError: null,
    matchError: null,
    recordsSingle: false,
    matched: [],
    tab: "ast",
    showSchema: false,
    copied: null,
  });

  // Load WASM once.
  useEffect(() => {
    let cancelled = false;
    loadQueryWasm()
      .then((api) => {
        if (cancelled) return;
        setState((s) => ({ ...s, api, loading: false }));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, loadError: err.message }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute outputs whenever query / fields / records / api change.
  const compute = useCallback(
    (
      api: QueryAPI,
      query: string,
      fields: FieldConfig[],
      recordsText: string,
    ) => {
      const parsed = api.parse(query);
      const tokens = api.tokens(query);

      let ast: Expression | null = null;
      let parseError: string | null = null;
      let roundtrip: string | null = null;
      let validateErrors: string[] = [];

      if (parsed.error) {
        parseError = parsed.error;
      } else if (parsed.result) {
        ast = parsed.result;
        const rt = api.stringify(ast);
        roundtrip = rt.result ?? rt.error ?? null;
        const v = api.validate(ast, fields);
        if (!v.valid && v.errors) validateErrors = v.errors;
      }

      // Match the query against the records. Accepts either a single JSON
      // object (boolean banner result) or a JSON array (table result).
      let recordsError: string | null = null;
      let matchError: string | null = null;
      let matched: boolean[] = [];
      let recordsSingle = false;
      let records: Array<Record<string, unknown>> = [];
      try {
        const parsed = JSON.parse(recordsText);
        if (Array.isArray(parsed)) {
          records = parsed;
        } else if (parsed && typeof parsed === "object") {
          records = [parsed as Record<string, unknown>];
          recordsSingle = true;
        } else {
          recordsError =
            "Records must be a JSON object or an array of objects.";
        }
      } catch (e) {
        recordsError = (e as Error).message;
      }
      if (!recordsError && ast && !parseError) {
        const r = api.match(query, fields, records);
        if (r.error) matchError = r.error;
        else matched = r.result?.matched ?? [];
      }

      setState((s) => ({
        ...s,
        ast,
        parseError,
        roundtrip,
        validateErrors,
        tokens: Array.isArray(tokens.result) ? tokens.result : [],
        recordsError,
        matchError,
        recordsSingle,
        matched,
      }));
    },
    [],
  );

  useEffect(() => {
    if (!state.api) return;
    const handle = window.setTimeout(
      () => compute(state.api!, state.query, state.fields, state.recordsText),
      80,
    );
    return () => window.clearTimeout(handle);
  }, [state.api, state.query, state.fields, state.recordsText, compute]);

  const sql = useMemo(() => (state.ast ? toSql(state.ast) : null), [state.ast]);

  const copyAst = useCallback(() => {
    if (!state.ast) return;
    navigator.clipboard.writeText(JSON.stringify(state.ast, null, 2));
    setState((s) => ({ ...s, copied: "ast" }));
    window.setTimeout(() => setState((s) => ({ ...s, copied: null })), 1500);
  }, [state.ast]);

  const copyShareUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", encodeShareParam(state.query));
    url.searchParams.set("schema", encodeShareParam(JSON.stringify(state.fields)));
    navigator.clipboard.writeText(url.toString());
    setState((s) => ({ ...s, copied: "url" }));
    window.setTimeout(() => setState((s) => ({ ...s, copied: null })), 1500);
  }, [state.query, state.fields]);

  // --- Schema editor --------------------------------------------------------

  const updateField = (idx: number, patch: Partial<FieldConfig>) => {
    setState((s) => {
      const next = [...s.fields];
      next[idx] = { ...next[idx], ...patch };
      return { ...s, fields: next };
    });
  };

  const removeField = (idx: number) => {
    setState((s) => {
      const next = s.fields.filter((_, i) => i !== idx);
      return { ...s, fields: next };
    });
  };

  const addField = () => {
    setState((s) => ({
      ...s,
      fields: [...s.fields, { Name: "new_field", Type: FieldValueType.Text, AllowedOps: ["="] }],
    }));
  };

  const resetSchema = () => setState((s) => ({ ...s, fields: defaultFields() }));

  // --- Render ---------------------------------------------------------------

  return (
    <div
      style={{
        background: PALETTE.panelBg,
        border: `1px solid ${PALETTE.borderSubtle}`,
        borderRadius: 12,
        padding: 16,
        margin: "1.5rem 0",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif",
        fontSize: 14,
        color: PALETTE.text,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.04)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <ExampleDropdown
          onPick={(q) => setState((s) => ({ ...s, query: q }))}
          disabled={!state.api}
        />
        <Button onClick={copyShareUrl} disabled={!state.api}>
          {state.copied === "url" ? "URL copied" : "Share URL"}
        </Button>
        <Button
          onClick={() =>
            setState((s) => ({ ...s, showSchema: !s.showSchema }))
          }
        >
          {state.showSchema ? "Hide schema" : "Edit schema"}
        </Button>
        {state.loading && (
          <span
            style={{
              color: PALETTE.muted,
              fontSize: 12,
              marginLeft: "auto",
            }}
          >
            Loading WASM…
          </span>
        )}
        {state.loadError && (
          <span
            style={{
              color: PALETTE.coral,
              fontSize: 12,
              marginLeft: "auto",
            }}
          >
            WASM load failed: {state.loadError}
          </span>
        )}
      </header>

      {/* Two-column grid: query (and schema) on the left, records + result on
          the right. Collapses to a single column on narrow screens via
          minmax(0, ...). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Left column: Query + Schema editor */}
        <section style={{ minWidth: 0 }}>
          <SectionLabel>Query</SectionLabel>
          <textarea
            value={state.query}
            onChange={(e) =>
              setState((s) => ({ ...s, query: e.target.value }))
            }
            spellCheck={false}
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              background: PALETTE.surface,
              border: `1px solid ${state.parseError ? PALETTE.coral : PALETTE.borderSubtle}`,
              borderRadius: 8,
              color: PALETTE.text,
              fontFamily:
                "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, monospace",
              fontSize: 14,
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
            }}
          />
          {state.showSchema && (
            <SchemaEditor
              fields={state.fields}
              onUpdate={updateField}
              onRemove={removeField}
              onAdd={addField}
              onReset={resetSchema}
            />
          )}
        </section>

        {/* Right column: Records + Result */}
        <section style={{ minWidth: 0 }}>
          <SectionLabel>Records</SectionLabel>
          <textarea
            value={state.recordsText}
            onChange={(e) =>
              setState((s) => ({ ...s, recordsText: e.target.value }))
            }
            spellCheck={false}
            rows={6}
            placeholder="Single object {...} or array [{...}, ...]"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              background: PALETTE.surface,
              border: `1px solid ${state.recordsError ? PALETTE.coral : PALETTE.borderSubtle}`,
              borderRadius: 8,
              color: PALETTE.text,
              fontFamily:
                "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
              marginBottom: 10,
            }}
          />
          {state.recordsError && (
            <ErrorRow label="Records JSON" message={state.recordsError} />
          )}
          {state.matchError && (
            <ErrorRow label="Match" message={state.matchError} />
          )}
          {!state.recordsError && !state.matchError && (
            <MatchPanel
              recordsText={state.recordsText}
              matched={state.matched}
              single={state.recordsSingle}
            />
          )}
        </section>
      </div>

      <nav
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          borderBottom: `1px solid ${PALETTE.borderSubtle}`,
        }}
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
          const active = state.tab === tab;
          const badge =
            tab === "errors" && (state.parseError || state.validateErrors.length)
              ? state.parseError
                ? "!"
                : String(state.validateErrors.length)
              : null;
          return (
            <button
              key={tab}
              onClick={() => setState((s) => ({ ...s, tab }))}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? `2px solid ${PALETTE.coral}`
                  : "2px solid transparent",
                color: active ? PALETTE.text : PALETTE.muted,
                padding: "8px 0",
                marginBottom: -1, // overlap the nav's border-bottom
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                display: "flex",
                gap: 6,
                alignItems: "center",
                lineHeight: 1.2,
                transition: "color 0.12s ease",
              }}
            >
              {TAB_LABELS[tab]}
              {badge && (
                <span
                  style={{
                    background: PALETTE.coral,
                    color: "#1B1A19",
                    borderRadius: 999,
                    padding: "0 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "12px 0", minHeight: 220 }}>
        {state.tab === "ast" && (
          <Pane
            actions={
              <Button onClick={copyAst} disabled={!state.ast}>
                {state.copied === "ast" ? "Copied" : "Copy"}
              </Button>
            }
          >
            {state.ast ? (
              <pre style={preStyle}>{JSON.stringify(state.ast, null, 2)}</pre>
            ) : (
              <Empty>No AST — see the Errors tab.</Empty>
            )}
          </Pane>
        )}

        {state.tab === "roundtrip" && (
          <Pane>
            {state.roundtrip ? (
              <pre style={preStyle}>{state.roundtrip}</pre>
            ) : (
              <Empty>Round-trip unavailable.</Empty>
            )}
            <p style={{ color: PALETTE.muted, fontSize: 12, marginTop: 8 }}>
              `IN`, negated comparisons (`!&gt;`), and lowercase keywords normalize
              into their canonical AST form, so the round-tripped query may differ
              from the input.
            </p>
          </Pane>
        )}

        {state.tab === "errors" && (
          <Pane>
            {state.parseError && (
              <ErrorRow
                label="Parse error"
                message={state.parseError}
                query={state.query}
              />
            )}
            {state.validateErrors.flatMap((msg, i) =>
              // The bridge currently concatenates multiple validate errors
              // with "; ". Split them so each gets its own row + caret.
              msg.split(/;\s+/).map((part, j) => (
                <ErrorRow
                  key={`${i}-${j}`}
                  label="Validation"
                  message={part}
                  query={state.query}
                />
              )),
            )}
            {!state.parseError && state.validateErrors.length === 0 && (
              <Empty>No errors. Query parses and validates clean.</Empty>
            )}
          </Pane>
        )}

        {state.tab === "tokens" && (
          <Pane>
            {state.tokens.length === 0 ? (
              <Empty>No tokens.</Empty>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>offset</Th>
                    <Th>type</Th>
                    <Th>value</Th>
                  </tr>
                </thead>
                <tbody>
                  {state.tokens.map((t, i) => (
                    <tr key={i}>
                      <Td muted>{i}</Td>
                      <Td muted>{t.offset}</Td>
                      <Td>{t.type}</Td>
                      <Td mono>{t.value || ""}{t.quoted ? " (quoted)" : ""}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Pane>
        )}

        {state.tab === "sql" && (
          <Pane>
            {sql ? (
              <>
                <pre style={preStyle}>{sql.where}</pre>
                {sql.params.length > 0 && (
                  <p style={{ color: PALETTE.muted, fontSize: 12, marginTop: 8 }}>
                    params: {JSON.stringify(sql.params)}
                  </p>
                )}
              </>
            ) : (
              <Empty>No AST.</Empty>
            )}
            <p style={{ color: PALETTE.muted, fontSize: 12, marginTop: 8 }}>
              Generated from the AST by a small TypeScript port of{" "}
              <code>examples/sql/main.go</code>. Function-valued and arithmetic
              operands render as inline comments.
            </p>
          </Pane>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---------------------------------------------------------

function Button({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.borderSubtle}`,
        color: PALETTE.text,
        borderRadius: 6,
        padding: "0 10px",
        height: 28,
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 12,
        fontFamily: "inherit",
        lineHeight: "26px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ExampleDropdown({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      onChange={(e) => {
        const idx = parseInt(e.target.value, 10);
        if (!Number.isNaN(idx)) onPick(EXAMPLES[idx].query);
        e.target.value = "";
      }}
      defaultValue=""
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.borderSubtle}`,
        color: PALETTE.text,
        borderRadius: 6,
        padding: "0 26px 0 10px",
        height: 28,
        boxSizing: "border-box",
        fontSize: 12,
        fontFamily: "inherit",
        lineHeight: "26px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: 180,
        // Strip the browser-native chrome and draw a custom caret via SVG bg.
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none' stroke='%23B7B4AD' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='1,1 5,5 9,1'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        backgroundSize: "10px 6px",
      }}
    >
      <option value="" disabled>
        Try an example…
      </option>
      {EXAMPLES.map((ex, i) => (
        <option key={i} value={i}>
          {ex.label}
        </option>
      ))}
    </select>
  );
}

function SchemaEditor({
  fields,
  onUpdate,
  onRemove,
  onAdd,
  onReset,
}: {
  fields: FieldConfig[];
  onUpdate: (idx: number, patch: Partial<FieldConfig>) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Schema</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={onAdd}>+ Field</Button>
          <Button onClick={onReset}>Reset</Button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 1fr 36px", gap: 8, fontSize: 12 }}>
        <span style={{ color: PALETTE.muted }}>Name</span>
        <span style={{ color: PALETTE.muted }}>Type</span>
        <span style={{ color: PALETTE.muted }}>Allowed ops</span>
        <span />
        {fields.map((f, idx) => (
          <FieldRow key={idx} field={f} idx={idx} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  idx,
  onUpdate,
  onRemove,
}: {
  field: FieldConfig;
  idx: number;
  onUpdate: (idx: number, patch: Partial<FieldConfig>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <>
      <input
        value={field.Name}
        onChange={(e) => onUpdate(idx, { Name: e.target.value })}
        style={inputStyle}
      />
      <select
        value={field.Type}
        onChange={(e) =>
          onUpdate(idx, { Type: parseInt(e.target.value, 10) as FieldValueTypeId })
        }
        style={inputStyle}
      >
        {Object.entries(FieldValueTypeName).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {OPS.map((op) => {
          const active = field.AllowedOps.includes(op);
          return (
            <button
              key={op}
              onClick={() =>
                onUpdate(idx, {
                  AllowedOps: active
                    ? field.AllowedOps.filter((o) => o !== op)
                    : [...field.AllowedOps, op],
                })
              }
              style={{
                background: active ? PALETTE.accent : PALETTE.panelBg,
                color: active ? "#FAF7F2" : PALETTE.muted,
                border: `1px solid ${active ? PALETTE.accent : PALETTE.border}`,
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 11,
                fontFamily: "ui-monospace, Menlo, monospace",
                cursor: "pointer",
              }}
            >
              {op}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onRemove(idx)}
        title="Remove"
        style={{
          background: "transparent",
          color: PALETTE.muted,
          border: `1px solid ${PALETTE.border}`,
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ×
      </button>
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontSize: 11,
        fontWeight: 600,
        color: PALETTE.muted,
        margin: "10px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

function MatchPill({
  matched,
  big = false,
}: {
  matched: boolean;
  big?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: big ? "6px 14px" : "2px 8px",
        borderRadius: 999,
        fontSize: big ? 13 : 12,
        fontWeight: 600,
        color: matched ? "#1B1A19" : PALETTE.muted,
        background: matched ? PALETTE.coral : "transparent",
        border: matched ? "none" : `1px solid ${PALETTE.borderSubtle}`,
      }}
    >
      {matched ? "match" : "no match"}
    </span>
  );
}

function MatchPanel({
  recordsText,
  matched,
  single,
}: {
  recordsText: string;
  matched: boolean[];
  single: boolean;
}) {
  let records: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(recordsText);
    if (Array.isArray(parsed)) records = parsed;
    else if (parsed && typeof parsed === "object") records = [parsed as Record<string, unknown>];
  } catch {
    return null;
  }
  if (records.length === 0) {
    return <Empty>No records.</Empty>;
  }

  // Single object: show a prominent banner.
  if (single) {
    const m = matched[0] ?? false;
    return (
      <>
        <SectionLabel>Result</SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: PALETTE.surface,
            border: `1px solid ${m ? PALETTE.coral : PALETTE.borderSubtle}`,
            borderRadius: 8,
          }}
        >
          <MatchPill matched={m} big />
          <span style={{ color: PALETTE.muted, fontSize: 12 }}>
            Query {m ? "matches" : "does not match"} this record.
          </span>
        </div>
      </>
    );
  }

  // Array: show a summary line + table of matched/unmatched per row.
  const matchCount = matched.filter(Boolean).length;
  return (
    <>
      <SectionLabel>Result</SectionLabel>
      <p style={{ color: PALETTE.muted, fontSize: 12, marginBottom: 6 }}>
        <strong style={{ color: PALETTE.text }}>{matchCount}</strong> of{" "}
        <strong style={{ color: PALETTE.text }}>{records.length}</strong> records match.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>record</Th>
            <Th>matched</Th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const m = matched[i] ?? false;
            return (
              <tr key={i}>
                <Td muted>{i}</Td>
                <Td mono>{JSON.stringify(r)}</Td>
                <td
                  style={{
                    padding: "5px 8px",
                    borderBottom: `1px solid ${PALETTE.surface}`,
                  }}
                >
                  <MatchPill matched={m} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function Pane({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      {actions && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>{actions}</div>
      )}
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p style={{ color: PALETTE.muted, fontSize: 13 }}>{children}</p>;
}

// parseErrorPosition extracts a leading "position N: " prefix from a
// validator / parser error message. Returns the offset and the remaining
// message body, or null if no position prefix is found.
function parseErrorPosition(
  msg: string,
): { offset: number; body: string } | null {
  // Errors can carry an optional prefix ("parse: ", "validate: ") before
  // "position N:". Strip that, then look for the position.
  const m = msg.match(/^(?:[a-z]+:\s*)?position (\d+):\s*(.*)$/i);
  if (!m) return null;
  const offset = parseInt(m[1], 10);
  return Number.isFinite(offset) ? { offset, body: m[2] } : null;
}

function ErrorRow({
  label,
  message,
  query,
}: {
  label: string;
  message: string;
  query?: string;
}) {
  const parsed = query ? parseErrorPosition(message) : null;
  return (
    <div
      style={{
        padding: "8px 10px",
        background: "rgba(255, 107, 91, 0.08)",
        border: `1px solid ${PALETTE.coral}`,
        borderRadius: 6,
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <span
          style={{
            color: PALETTE.coral,
            fontWeight: 600,
            fontSize: 12,
            minWidth: 80,
          }}
        >
          {label}
        </span>
        <code style={{ fontSize: 13, color: PALETTE.text }}>{message}</code>
      </div>
      {parsed && query && (
        <ErrorCaret query={query} offset={parsed.offset} />
      )}
    </div>
  );
}

// ErrorCaret renders the offending query line below the message with a
// coral `^` marker positioned directly under the offset, plus the column
// number for keyboard-driven navigation. Uses a monospaced font so the
// caret aligns character-by-character.
function ErrorCaret({
  query,
  offset,
}: {
  query: string;
  offset: number;
}) {
  // Clamp the offset to a valid string index. Multi-line queries break this
  // simple scheme; render against the line containing the offset.
  const lines = query.split("\n");
  let lineStart = 0;
  let line = lines[0] ?? "";
  let col = offset;
  for (const candidate of lines) {
    if (col <= candidate.length) {
      line = candidate;
      break;
    }
    col -= candidate.length + 1; // +1 for the consumed newline
    lineStart += candidate.length + 1;
  }
  const safeCol = Math.max(0, Math.min(col, line.length));
  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 8px",
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.borderSubtle}`,
        borderRadius: 4,
        fontFamily:
          "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.4,
        whiteSpace: "pre",
        overflow: "auto",
      }}
    >
      <div style={{ color: PALETTE.text }}>{line || " "}</div>
      <div style={{ color: PALETTE.coral }}>
        {" ".repeat(safeCol) + "^"}
      </div>
      <div style={{ color: PALETTE.muted, fontSize: 11, marginTop: 2 }}>
        column {offset + 1}{lineStart > 0 ? ` (line ${lines.indexOf(line) + 1})` : ""}
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        color: PALETTE.muted,
        padding: "6px 8px",
        borderBottom: `1px solid ${PALETTE.border}`,
        fontWeight: 500,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  muted,
  mono,
}: {
  children: ReactNode;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "5px 8px",
        color: muted ? PALETTE.muted : PALETTE.text,
        fontFamily: mono
          ? "ui-monospace, 'SFMono-Regular', Menlo, monospace"
          : "inherit",
        fontSize: 13,
        borderBottom: `1px solid ${PALETTE.surface}`,
      }}
    >
      {children}
    </td>
  );
}

const preStyle: CSSProperties = {
  background: PALETTE.surface,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.5,
  color: PALETTE.text,
  margin: 0,
  overflow: "auto",
  maxHeight: 360,
  fontFamily: "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, monospace",
};

const inputStyle: CSSProperties = {
  background: PALETTE.panelBg,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
  color: PALETTE.text,
  fontFamily: "ui-monospace, Menlo, monospace",
  width: "100%",
};
