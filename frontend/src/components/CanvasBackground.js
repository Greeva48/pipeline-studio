// CanvasBackground.js
// Static SVG overlay suggesting pipeline topology.
// pointer-events: none — zero interference with ReactFlow.
// All elements at 1–3% opacity.

export default function CanvasBackground() {
  return (
    <div className="canvas-bg" aria-hidden="true">
      <svg
        viewBox="0 0 1400 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Ghost pipeline topology ──────────────────────── */}
        {/* Node outlines — implied pipeline: Input → Prompt → LLM → Output */}

        {/* Input node ghost */}
        <rect x="160" y="350" width="130" height="34" rx="2"
          fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.022" />
        <rect x="160" y="350" width="3" height="34" rx="1"
          fill="#FAFAFA" opacity="0.018" />

        {/* Prompt Template ghost */}
        <rect x="440" y="290" width="130" height="34" rx="2"
          fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.022" />
        <rect x="440" y="290" width="3" height="34" rx="1"
          fill="#FAFAFA" opacity="0.018" />

        {/* Memory ghost */}
        <rect x="440" y="400" width="130" height="34" rx="2"
          fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.022" />
        <rect x="440" y="400" width="3" height="34" rx="1"
          fill="#FAFAFA" opacity="0.018" />

        {/* LLM ghost */}
        <rect x="730" y="340" width="130" height="34" rx="2"
          fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.022" />
        <rect x="730" y="340" width="3" height="34" rx="1"
          fill="#FAFAFA" opacity="0.018" />

        {/* Output ghost */}
        <rect x="1020" y="350" width="130" height="34" rx="2"
          fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.022" />
        <rect x="1020" y="350" width="3" height="34" rx="1"
          fill="#FAFAFA" opacity="0.018" />

        {/* ── Ghost handles ────────────────────────────────── */}
        <circle cx="290" cy="367" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="440" cy="307" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="440" cy="417" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="570" cy="307" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="570" cy="417" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="730" cy="357" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="860" cy="357" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <circle cx="1020" cy="367" r="3.5" fill="none" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />

        {/* ── Ghost edges (dashed beziers) ─────────────────── */}
        {/* Input → Prompt */}
        <path
          d="M 290 367 C 360 367, 370 307, 440 307"
          fill="none" stroke="#FAFAFA" strokeWidth="0.8"
          strokeDasharray="5 5" opacity="0.018"
        />
        {/* Input → Memory */}
        <path
          d="M 290 367 C 360 367, 370 417, 440 417"
          fill="none" stroke="#FAFAFA" strokeWidth="0.8"
          strokeDasharray="5 5" opacity="0.018"
        />
        {/* Prompt → LLM */}
        <path
          d="M 570 307 C 640 307, 660 357, 730 357"
          fill="none" stroke="#FAFAFA" strokeWidth="0.8"
          strokeDasharray="5 5" opacity="0.018"
        />
        {/* Memory → LLM */}
        <path
          d="M 570 417 C 640 417, 660 357, 730 357"
          fill="none" stroke="#FAFAFA" strokeWidth="0.8"
          strokeDasharray="5 5" opacity="0.018"
        />
        {/* LLM → Output */}
        <path
          d="M 860 357 C 930 357, 950 367, 1020 367"
          fill="none" stroke="#FAFAFA" strokeWidth="0.8"
          strokeDasharray="5 5" opacity="0.018"
        />

        {/* ── Corner engineering marks ─────────────────────── */}
        <line x1="48" y1="48" x2="72" y2="48" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />
        <line x1="48" y1="48" x2="48" y2="72" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />

        <line x1="1352" y1="48" x2="1328" y2="48" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />
        <line x1="1352" y1="48" x2="1352" y2="72" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />

        <line x1="48" y1="852" x2="72" y2="852" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />
        <line x1="48" y1="852" x2="48" y2="828" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />

        <line x1="1352" y1="852" x2="1328" y2="852" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />
        <line x1="1352" y1="852" x2="1352" y2="828" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.018" />

        {/* ── Technical labels ─────────────────────────────── */}
        <text
          x="1342" y="874"
          fontFamily="Space Mono, monospace"
          fontSize="9"
          fill="#FAFAFA"
          opacity="0.025"
          textAnchor="end"
          letterSpacing="0.1em"
        >
          PIPELINE_RUNTIME / DAG
        </text>

        <text
          x="58" y="874"
          fontFamily="Space Mono, monospace"
          fontSize="9"
          fill="#FAFAFA"
          opacity="0.025"
          textAnchor="start"
          letterSpacing="0.1em"
        >
          STUDIO
        </text>

        {/* ── Center cross-hair ────────────────────────────── */}
        <line x1="697" y1="448" x2="703" y2="448" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
        <line x1="700" y1="445" x2="700" y2="451" stroke="#FAFAFA" strokeWidth="0.6" opacity="0.02" />
      </svg>
    </div>
  );
}
