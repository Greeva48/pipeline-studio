// InspectorPanel.js
// Read-only observability surface for the selected node.
// Editing happens on the canvas node forms — not here.

import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

/* ── Static metadata per node type ─────────────────────── */

const NODE_META = {
  customInput: {
    label: 'Input',
    color: '#4ADE80',
    description: 'System boundary entry point. Accepts typed values into the pipeline graph.',
    inputs: 0,
    outputs: 1,
  },
  customOutput: {
    label: 'Output',
    color: '#F97316',
    description: 'Terminal node. Materializes the pipeline\'s final computed value.',
    inputs: 1,
    outputs: 0,
  },
  llm: {
    label: 'LLM',
    color: '#A855F7',
    description: 'Language model inference. Invokes a configured model with system and prompt inputs.',
    inputs: 2,
    outputs: 1,
  },
  promptTemplate: {
    label: 'Prompt Template',
    color: '#EC4899',
    description: 'Composes dynamic prompts from template variables using {{variable}} syntax.',
    inputs: 'dynamic',
    outputs: 1,
  },
  text: {
    label: 'Text',
    color: '#94A3B8',
    description: 'Static text primitive. Emits a constant string value into the graph.',
    inputs: 'dynamic',
    outputs: 1,
  },
  vectorSearch: {
    label: 'Vector Search',
    color: '#FACC15',
    description: 'Semantic document retrieval from a configured vector store index.',
    inputs: 1,
    outputs: 1,
  },
  router: {
    label: 'Router',
    color: '#3B82F6',
    description: 'Classifies input and routes to one of N labeled output handles.',
    inputs: 1,
    outputs: 'dynamic',
  },
  memory: {
    label: 'Memory',
    color: '#14B8A6',
    description: 'Stateful session store. Persists conversation context across pipeline invocations.',
    inputs: 2,
    outputs: 1,
  },
  parser: {
    label: 'Parser',
    color: '#FB7185',
    description: 'Structured field extraction from raw LLM output text.',
    inputs: 1,
    outputs: 'dynamic',
  },
};

/* ── Config key → readable label ────────────────────────── */

const KEY_LABELS = {
  inputName:    'name',
  inputType:    'type',
  outputName:   'name',
  outputType:   'type',
  model:        'model',
  systemPrompt: 'system',
  userPrompt:   'template',
  text:         'content',
  collection:   'collection',
  topK:         'top k',
  metric:       'similarity',
  routeText:    'routes',
  fieldText:    'fields',
  sessionKey:   'session',
  windowSize:   'window',
};

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  const str = String(val);
  return str.length > 80 ? str.slice(0, 80) + '…' : str;
}

/* ── Empty state ─────────────────────────────────────────── */

function Placeholder() {
  return (
    <div className="inspector-panel__placeholder">
      <svg
        className="inspector-panel__placeholder-icon"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="1" y="6" width="30" height="20" rx="2" stroke="#FAFAFA" strokeWidth="1.5" />
        <rect x="1" y="6" width="3" height="20" rx="1" fill="#FAFAFA" />
        <line x1="8" y1="13" x2="22" y2="13" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="18" x2="17" y2="18" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="inspector-panel__placeholder-text">
        Select a node<br />to inspect.
      </span>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────── */

export default function InspectorPanel() {
  const { selectedNodeId, nodes, edges, setSelectedNodeId, deleteNode } = useStore(
    useShallow((s) => ({
      selectedNodeId:    s.selectedNodeId,
      nodes:             s.nodes,
      edges:             s.edges,
      setSelectedNodeId: s.setSelectedNodeId,
      deleteNode:        s.deleteNode,
    }))
  );

  const node = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const meta = node ? NODE_META[node.type] ?? null : null;

  const incomingCount = node
    ? edges.filter((e) => e.target === node.id).length
    : 0;
  const outgoingCount = node
    ? edges.filter((e) => e.source === node.id).length
    : 0;

  // Config entries — strip internal bookkeeping fields
  const configEntries = node
    ? Object.entries(node.data ?? {}).filter(
        ([k]) => k !== 'id' && k !== 'nodeType'
      )
    : [];

  return (
    <aside className="inspector-panel">
      <div className="inspector-panel__header">
        <span className="inspector-panel__title">Inspector</span>
        {node && (
          <button
            className="inspector-panel__close"
            onClick={() => setSelectedNodeId(null)}
            title="Deselect node"
          >
            ✕
          </button>
        )}
      </div>

      {!node ? (
        <Placeholder />
      ) : (
        <div className="inspector-panel__scroll">

          {/* ── Node identity ─────────────────────────────── */}
          <div className="inspector-node-identity">
            <div className="inspector-node-type">
              <span
                className="inspector-node-type__rail"
                style={{ background: meta?.color ?? '#52525B' }}
              />
              <span
                className="inspector-node-type__label"
                style={{ color: meta?.color ?? '#FAFAFA' }}
              >
                {meta?.label ?? node.type}
              </span>
            </div>
            <span className="inspector-node-id">{node.id}</span>
            {meta?.description && (
              <p className="inspector-node-desc">{meta.description}</p>
            )}
          </div>

          {/* ── Configuration ─────────────────────────────── */}
          {configEntries.length > 0 && (
            <div className="inspector-section">
              <div className="inspector-section__label">Configuration</div>
              {configEntries.map(([key, val]) => (
                <div key={key} className="inspector-row">
                  <span className="inspector-row__key">
                    {KEY_LABELS[key] ?? key}
                  </span>
                  <span className="inspector-row__value">
                    {formatValue(val)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Connections ───────────────────────────────── */}
          <div className="inspector-section">
            <div className="inspector-section__label">Connections</div>
            <div className="inspector-row">
              <span className="inspector-row__key">incoming</span>
              <span className={`inspector-row__value${incomingCount > 0 ? ' inspector-row__value--accent' : ''}`}>
                {incomingCount}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-row__key">outgoing</span>
              <span className={`inspector-row__value${outgoingCount > 0 ? ' inspector-row__value--accent' : ''}`}>
                {outgoingCount}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-row__key">inputs</span>
              <span className="inspector-row__value">
                {meta?.inputs ?? '—'}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-row__key">outputs</span>
              <span className="inspector-row__value">
                {meta?.outputs ?? '—'}
              </span>
            </div>
          </div>

          {/* ── Position metadata ─────────────────────────── */}
          <div className="inspector-section">
            <div className="inspector-section__label">Position</div>
            <div className="inspector-row">
              <span className="inspector-row__key">x</span>
              <span className="inspector-row__value">
                {Math.round(node.position?.x ?? 0)}
              </span>
            </div>
            <div className="inspector-row">
              <span className="inspector-row__key">y</span>
              <span className="inspector-row__value">
                {Math.round(node.position?.y ?? 0)}
              </span>
            </div>
          </div>

          {/* ── Danger zone ────────────────────────────────── */}
          <div className="inspector-section" style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button
              onClick={() => deleteNode(node.id)}
              title="Delete node and its edges (Del / Backspace)"
              style={{
                width: '100%',
                padding: '6px 0',
                background: 'transparent',
                border: '1px solid #7F1D1D',
                borderRadius: '3px',
                color: '#FCA5A5',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Delete Node
            </button>
          </div>

        </div>
      )}
    </aside>
  );
}
