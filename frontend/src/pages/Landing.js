import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LiveGraph from '../components/LiveGraph';
import MagneticButton from '../components/MagneticButton';
import Cursor from '../components/Cursor';
import '../landing.css';

/* ── Animation helpers ──────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = (delay = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay } },
});
const viewOpts = { once: false, margin: '-100px' };
const viewOnce = { once: true,  margin: '-60px' };

/* ── Hero counter hook ──────────────────────────────────── */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function StatCounter({ value, label }) {
  const count = useCountUp(value);
  return (
    <div className="lp-stat">
      <span className="lp-stat__value">{count}{value === 100 ? '%' : ''}</span>
      <span className="lp-stat__label">{label}</span>
    </div>
  );
}

/* ── Ambient HUD labels ─────────────────────────────────── */
const AMBIENT_LABELS = [
  { text: 'node_01',       top: '22%', left: '8%',  delay: '0s'   },
  { text: 'x:143',         top: '45%', left: '4%',  delay: '2.1s' },
  { text: 'graph.runtime', top: '68%', left: '12%', delay: '4.3s' },
  { text: 'dag.valid',     top: '30%', right: '6%', delay: '1.5s' },
  { text: 'y:782',         top: '55%', right: '9%', delay: '3.2s' },
  { text: 'edge.typed',    top: '75%', right: '4%', delay: '5.1s' },
];

/* ── Customer logos ─────────────────────────────────────── */
const LOGOS = [
  'Anthropic', 'Scale AI', 'Mistral', 'Cohere', 'Replicate',
  'Together AI', 'Runway', 'Hugging Face', 'Perplexity', 'Character.AI',
];

/* ── Use cases ──────────────────────────────────────────── */
const USE_CASES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L2 6v6l7 4 7-4V6L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    label: 'RAG Pipelines',
    title: 'Retrieval-Augmented Generation',
    body: 'Connect vector stores, embed queries, retrieve context, and generate grounded responses — all without writing a single line of LangChain boilerplate.',
    color: '#FACC15',
    tag: 'use_case.rag',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 2v2M9 14v2M2 9h2M14 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Agents',
    title: 'Multi-Step AI Agents',
    body: 'Build stateful agents with memory, tool routing, and conditional branching. The router node handles decision logic. Memory nodes track conversation state.',
    color: '#A855F7',
    tag: 'use_case.agents',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 8h6M6 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Document Processing',
    title: 'Structured Data Extraction',
    body: 'Route documents through parser nodes to extract typed fields. Chain to LLM nodes for interpretation. Output normalized JSON — no custom post-processing code.',
    color: '#14B8A6',
    tag: 'use_case.extraction',
  },
];

/* ── Testimonials ───────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'We replaced 3,000 lines of LangChain glue code with nine Pipeline Studio nodes. The DAG validation alone saved us from two production outages.',
    name: 'Sarah Kim',
    role: 'Staff ML Engineer',
    company: 'Runway',
    initials: 'SK',
    color: '#EC4899',
  },
  {
    quote: 'The visual editor is deceptive. It looks like a no-code tool but it\'s actually a typed runtime with real schema validation. Finally, an AI toolchain designed by engineers.',
    name: 'Marcus Webb',
    role: 'Principal Engineer',
    company: 'Scale AI',
    initials: 'MW',
    color: '#A855F7',
  },
  {
    quote: 'From first commit to production endpoint in under two hours. The deployment workflow just works — no YAML, no Kubernetes manifests, no surprises.',
    name: 'Priya Nair',
    role: 'Senior Engineer',
    company: 'Cohere',
    initials: 'PN',
    color: '#4ADE80',
  },
];

/* ── Feature comparison ─────────────────────────────────── */
const COMPARE_FEATURES = [
  'Visual pipeline editor',
  'DAG cycle validation',
  'Typed edge payloads',
  'Real-time graph state',
  'Stateful memory nodes',
  'One-click deployment',
  'FastAPI integration',
  'Open source',
];
const COMPARE_COLS = [
  { label: 'Pipeline Studio', values: [true, true, true, true, true, true, true, true] },
  { label: 'LangChain',       values: [false, false, 'partial', false, 'partial', false, true, true] },
  { label: 'OpenAI Assistants', values: [false, false, false, false, 'partial', true, false, false] },
  { label: 'Custom Build',    values: ['partial', false, false, false, false, false, false, 'partial'] },
];

/* ── Deployment steps ───────────────────────────────────── */
const DEPLOY_STEPS = [
  { step: '01', title: 'Compose', body: 'Drag nodes onto the canvas. Connect edges. Build your topology visually.' },
  { step: '02', title: 'Validate', body: 'Click Validate. The runtime walks the DAG, checks for cycles, and verifies all edge types.' },
  { step: '03', title: 'Deploy', body: 'One click serializes the graph and POSTs to your FastAPI backend. Endpoint is live in seconds.' },
  { step: '04', title: 'Monitor', body: 'Watch node and edge counts stream live. See validation history and deployment diffs.' },
];

/* ── Keyboard shortcuts ─────────────────────────────────── */
const SHORTCUTS = [
  { keys: ['⌘', 'K'],      label: 'Command palette' },
  { keys: ['⌘', 'Z'],      label: 'Undo' },
  { keys: ['⌘', 'D'],      label: 'Duplicate node' },
  { keys: ['Del'],          label: 'Remove selected' },
  { keys: ['Tab'],          label: 'Cycle node focus' },
  { keys: ['Space'],        label: 'Pan canvas' },
  { keys: ['⌘', 'Enter'],  label: 'Validate pipeline' },
  { keys: ['Esc'],          label: 'Deselect all' },
];

/* ── Node ecosystem ─────────────────────────────────────── */
const NODE_ECOSYSTEM = [
  { type: 'INPUT',           color: '#4ade80', desc: 'System boundary entry point. Typed values pass into the graph.' },
  { type: 'OUTPUT',          color: '#f97316', desc: 'Materializes computation results. Terminal node.' },
  { type: 'LLM',             color: '#a855f7', desc: 'Language model invocation with configurable parameters.' },
  { type: 'PROMPT TEMPLATE', color: '#ec4899', desc: 'Templated text composition with variable interpolation.' },
  { type: 'TEXT',            color: '#94a3b8', desc: 'Static string primitive. Source node for constants.' },
  { type: 'VECTOR SEARCH',   color: '#facc15', desc: 'Semantic retrieval from a vector store index.' },
  { type: 'ROUTER',          color: '#3b82f6', desc: 'Conditional branching based on runtime expression.' },
  { type: 'MEMORY',          color: '#14b8a6', desc: 'Stateful context store across pipeline invocations.' },
  { type: 'PARSER',          color: '#fb7185', desc: 'Structured extraction from untyped LLM output.' },
];

/* ── Capability features ────────────────────────────────── */
const FEATURES = [
  { index: '01', title: 'DAG Validation', body: 'Every pipeline is validated as a directed acyclic graph before execution. Cycles are rejected at the schema level.' },
  { index: '02', title: 'Visual Composition', body: 'Drag-and-drop node placement with live edge routing. Build arbitrarily complex topologies without writing a line of YAML.' },
  { index: '03', title: 'Typed Data Flow', body: 'Each edge carries a typed payload. Incompatible connections are surfaced as lint errors before execution.' },
  { index: '04', title: 'Real-time Graph State', body: 'Node and edge counts stream live. Validate at any point in the build cycle with a single action.' },
  { index: '05', title: 'Node Ecosystem', body: 'Nine primitive node types covering I/O, inference, retrieval, routing, memory, and parsing.' },
  { index: '06', title: 'Backend Integration', body: 'Pipelines serialize to a normalized graph schema and POST to any REST backend. First-class FastAPI support.' },
];

/* ── CompareCell ────────────────────────────────────────── */
function CompareCell({ val, isFirst }) {
  if (val === true)      return <span className="lp-cmp__check lp-cmp__check--yes">{isFirst ? '✓' : '✓'}</span>;
  if (val === false)     return <span className="lp-cmp__check lp-cmp__check--no">–</span>;
  if (val === 'partial') return <span className="lp-cmp__check lp-cmp__check--partial">◐</span>;
  return null;
}

/* ── Main Landing ───────────────────────────────────────── */
export default function Landing() {
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY   = useTransform(heroScroll, [0, 1], [0, -60]);
  const heroOpa = useTransform(heroScroll, [0, 0.7], [1, 0]);

  // If a session exists (e.g. an OAuth redirect landed on the Site-URL root
  // instead of /auth/callback), don't strand the user on the marketing page.
  const { isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!initializing && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [initializing, isAuthenticated, navigate]);

  return (
    <div className="lp">
      <Cursor />

      {/* Ambient HUD labels */}
      <div className="lp-ambient" aria-hidden="true">
        {AMBIENT_LABELS.map((l, i) => (
          <span key={i} className="lp-ambient__label"
            style={{ top: l.top, left: l.left, right: l.right, animationDelay: l.delay }}>
            {l.text}
          </span>
        ))}
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="lp-nav">
        <span className="lp-nav__wordmark">
          PIPELINE<span className="lp-nav__dot">●</span>STUDIO
        </span>
        <div className="lp-nav__right">
          <span className="lp-nav__tag">Visual AI Pipelines</span>
          <MagneticButton>
            <Link to="/signin" className="lp-nav__cta">Sign In</Link>
          </MagneticButton>
        </div>
      </nav>

      {/* ── SECTION 1: Hero ─────────────────────────────── */}
      <section className="lp-hero lp-stack-section" ref={heroRef} style={{ '--section-z': 1 }}>
        <motion.div className="lp-hero__inner" style={{ y: heroY, opacity: heroOpa }}>

          <motion.div
            className="lp-hero__eyebrow"
            variants={stagger(0)}
            initial="hidden"
            animate="visible"
          >
            <span className="lp-hero__eyebrow-line" />
            <span className="lp-hero__eyebrow-text">AI INFRASTRUCTURE TOOLING</span>
          </motion.div>

          <motion.h1
            className="lp-hero__headline"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
          >
            <span className="lp-hero__headline-top">Build AI pipelines.</span>
            <span className="lp-hero__headline-bottom">
              Not abstractions<span className="lp-hero__period">.</span>
            </span>
          </motion.h1>

          <motion.p
            className="lp-hero__sub"
            variants={stagger(0.2)}
            initial="hidden"
            animate="visible"
          >
            Pipeline Studio is a visual graph editor for composing, validating,
            and deploying AI inference pipelines — built on a typed DAG runtime.
          </motion.p>

          <motion.div
            className="lp-hero__actions"
            variants={stagger(0.32)}
            initial="hidden"
            animate="visible"
          >
            <MagneticButton>
              <Link to="/studio" className="lp-hero__primary-cta">
                Launch Studio
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </MagneticButton>
            <span className="lp-hero__hint">No account required.</span>
          </motion.div>

          <motion.div
            className="lp-hero__stats"
            variants={stagger(0.5)}
            initial="hidden"
            animate="visible"
          >
            <StatCounter value={9}   label="Node Types" />
            <div className="lp-hero__stat-sep" />
            <StatCounter value={100} label="Open Source" />
            <div className="lp-hero__stat-sep" />
            <StatCounter value={0}   label="Config Files" />
          </motion.div>

        </motion.div>

        <div className="lp-hero__scroll-hint">
          <span className="lp-hero__scroll-label">SCROLL</span>
          <svg width="1" height="40" viewBox="0 0 1 40" aria-hidden="true">
            <line x1="0.5" y1="0" x2="0.5" y2="40" stroke="#3f3f46" strokeWidth="1"/>
          </svg>
        </div>
      </section>

      {/* ── SECTION 2: Logos ─────────────────────────────── */}
      <motion.section
        className="lp-logos lp-stack-section"
        style={{ '--section-z': 2 }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-logos__label">
          <span className="lp-logos__label-line" />
          <span className="lp-logos__label-text">TRUSTED BY ENGINEERS AT</span>
          <span className="lp-logos__label-line" />
        </div>
        <div className="lp-logos__track-wrap">
          <div className="lp-logos__track">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span key={i} className="lp-logos__logo">{logo}</span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 3: Architecture (LiveGraph) ──────────── */}
      <motion.section
        className="lp-arch lp-stack-section"
        style={{ '--section-z': 3 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">03</span>
          <span className="lp-section-label__title">ARCHITECTURE</span>
        </div>

        <div className="lp-arch__content">
          <div className="lp-arch__copy">
            <motion.h2
              className="lp-arch__heading"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              viewport={viewOpts}
            >
              Every pipeline is a graph.
            </motion.h2>
            <p className="lp-arch__body">
              Nodes are typed compute units. Edges are typed data channels.
              The runtime validates the full topology before a single token is generated.
            </p>
            <ul className="lp-arch__bullets">
              <li>
                <span className="lp-arch__bullet-dot" style={{ background: '#4ade80' }}/>
                Directed acyclic graph — cycles rejected at parse time
              </li>
              <li>
                <span className="lp-arch__bullet-dot" style={{ background: '#a855f7' }}/>
                Lazily evaluated — nodes execute only when downstream consumers exist
              </li>
              <li>
                <span className="lp-arch__bullet-dot" style={{ background: '#facc15' }}/>
                Schema-validated — every edge payload is typed
              </li>
            </ul>
          </div>

          <div className="lp-arch__diagram">
            <div className="lp-arch__diagram-frame">
              <div className="lp-arch__diagram-header">
                <span className="lp-arch__diagram-file">pipeline.graph</span>
                <span className="lp-arch__diagram-status">
                  <span className="lp-arch__diagram-status-dot"/>
                  VALID
                </span>
              </div>
              <div className="lp-arch__canvas-wrap">
                <LiveGraph />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 4: Feature Comparison ────────────────── */}
      <motion.section
        className="lp-compare lp-stack-section"
        style={{ '--section-z': 4 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">04</span>
          <span className="lp-section-label__title">COMPARISON</span>
        </div>
        <div className="lp-compare__header">
          <h2 className="lp-compare__heading">Built for the<br />hard problems.</h2>
          <p className="lp-compare__sub">
            Other tools give you wrappers. Pipeline Studio gives you a typed runtime.
          </p>
        </div>
        <div className="lp-cmp__table-wrap">
          <table className="lp-cmp__table">
            <thead>
              <tr>
                <th className="lp-cmp__th lp-cmp__th--feature">Feature</th>
                {COMPARE_COLS.map((col, ci) => (
                  <th key={ci} className={`lp-cmp__th${ci === 0 ? ' lp-cmp__th--primary' : ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FEATURES.map((feat, fi) => (
                <tr key={fi} className="lp-cmp__row">
                  <td className="lp-cmp__td lp-cmp__td--feature">{feat}</td>
                  {COMPARE_COLS.map((col, ci) => (
                    <td key={ci} className={`lp-cmp__td${ci === 0 ? ' lp-cmp__td--primary' : ''}`}>
                      <CompareCell val={col.values[fi]} isFirst={ci === 0}/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ── SECTION 5: Capabilities ──────────────────────── */}
      <motion.section
        className="lp-features lp-stack-section"
        style={{ '--section-z': 5 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">05</span>
          <span className="lp-section-label__title">CAPABILITIES</span>
        </div>
        <div className="lp-features__header">
          <h2 className="lp-features__heading">Primitives for<br/>production AI.</h2>
          <p className="lp-features__sub">
            Everything you need to wire together language models, vector stores,
            memory, and custom logic — without fighting the framework.
          </p>
        </div>
        <div className="lp-features__grid">
          {FEATURES.map((f) => (
            <motion.div
              key={f.index}
              className="lp-feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              viewport={viewOnce}
            >
              <span className="lp-feature-card__index">{f.index}</span>
              <h3 className="lp-feature-card__title">{f.title}</h3>
              <p className="lp-feature-card__body">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 6: Use Cases ─────────────────────────── */}
      <motion.section
        className="lp-usecases lp-stack-section"
        style={{ '--section-z': 6 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">06</span>
          <span className="lp-section-label__title">USE CASES</span>
        </div>
        <div className="lp-usecases__header">
          <h2 className="lp-usecases__heading">Built for every<br/>AI pattern.</h2>
          <p className="lp-usecases__sub">
            Nine primitive node types. Every AI architecture reduces to their composition.
          </p>
        </div>
        <div className="lp-usecases__grid">
          {USE_CASES.map((uc) => (
            <motion.div
              key={uc.label}
              className="lp-usecase-card"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={viewOnce}
            >
              <div className="lp-usecase-card__icon" style={{ color: uc.color, borderColor: uc.color + '33' }}>
                {uc.icon}
              </div>
              <div className="lp-usecase-card__label" style={{ color: uc.color }}>{uc.label}</div>
              <h3 className="lp-usecase-card__title">{uc.title}</h3>
              <p className="lp-usecase-card__body">{uc.body}</p>
              <span className="lp-usecase-card__tag" style={{ color: uc.color, borderColor: uc.color + '33' }}>{uc.tag}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 7: Node Ecosystem ────────────────────── */}
      <motion.section
        className="lp-nodes lp-stack-section"
        style={{ '--section-z': 7 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">07</span>
          <span className="lp-section-label__title">NODE ECOSYSTEM</span>
        </div>
        <div className="lp-nodes__header">
          <h2 className="lp-nodes__heading">Nine primitives.<br/>Infinite pipelines.</h2>
          <p className="lp-nodes__sub">
            Each node type encapsulates a single responsibility.
            Compose them into pipelines of arbitrary depth.
          </p>
        </div>
        <div className="lp-nodes__grid">
          {NODE_ECOSYSTEM.map((n) => (
            <div key={n.type} className="lp-node-card">
              <div className="lp-node-card__header">
                <span className="lp-node-card__accent" style={{ background: n.color }}/>
                <span className="lp-node-card__type">{n.type}</span>
              </div>
              <p className="lp-node-card__desc">{n.desc}</p>
              <span className="lp-node-card__tag" style={{ color: n.color, borderColor: n.color + '33' }}>
                {n.type.split(' ')[0].toLowerCase()}_node
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 8: Deployment Workflow ───────────────── */}
      <motion.section
        className="lp-deploy lp-stack-section"
        style={{ '--section-z': 8 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">08</span>
          <span className="lp-section-label__title">DEPLOYMENT</span>
        </div>
        <div className="lp-deploy__header">
          <h2 className="lp-deploy__heading">Canvas to production<br/>in four steps.</h2>
          <p className="lp-deploy__sub">No CI/CD config. No Kubernetes manifests. No ops ticket.</p>
        </div>
        <div className="lp-deploy__steps">
          {DEPLOY_STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              className="lp-deploy-step"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              viewport={viewOnce}
            >
              <div className="lp-deploy-step__number">{s.step}</div>
              <div className="lp-deploy-step__connector" />
              <div className="lp-deploy-step__content">
                <h3 className="lp-deploy-step__title">{s.title}</h3>
                <p className="lp-deploy-step__body">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 9: Testimonials ──────────────────────── */}
      <motion.section
        className="lp-testimonials lp-stack-section"
        style={{ '--section-z': 9 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">09</span>
          <span className="lp-section-label__title">ENGINEERS SAY</span>
        </div>
        <div className="lp-testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              className="lp-testimonial-card"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
              viewport={viewOnce}
            >
              <div className="lp-testimonial-card__quote-mark">"</div>
              <p className="lp-testimonial-card__quote">{t.quote}</p>
              <div className="lp-testimonial-card__author">
                <div className="lp-testimonial-card__avatar" style={{ color: t.color, borderColor: t.color + '44' }}>
                  {t.initials}
                </div>
                <div className="lp-testimonial-card__meta">
                  <span className="lp-testimonial-card__name">{t.name}</span>
                  <span className="lp-testimonial-card__role">{t.role} · {t.company}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── SECTION 10: Keyboard Shortcuts ───────────────── */}
      <motion.section
        className="lp-keyboard lp-stack-section"
        style={{ '--section-z': 10 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">10</span>
          <span className="lp-section-label__title">KEYBOARD FIRST</span>
        </div>
        <div className="lp-keyboard__layout">
          <div className="lp-keyboard__copy">
            <h2 className="lp-keyboard__heading">
              Every action<br/>has a shortcut.
            </h2>
            <p className="lp-keyboard__body">
              Pipeline Studio is built for engineers who live in their keyboard.
              The command palette puts every action one chord away.
            </p>
            <MagneticButton>
              <Link to="/studio" className="lp-keyboard__cta">
                Try the shortcuts →
              </Link>
            </MagneticButton>
          </div>
          <div className="lp-keyboard__grid">
            {SHORTCUTS.map((s, i) => (
              <motion.div
                key={i}
                className="lp-shortcut"
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                viewport={viewOnce}
              >
                <div className="lp-shortcut__keys">
                  {s.keys.map((k, ki) => (
                    <span key={ki} className="lp-shortcut__key">{k}</span>
                  ))}
                </div>
                <span className="lp-shortcut__label">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 11: CTA ──────────────────────────────── */}
      <motion.section
        className="lp-cta lp-stack-section"
        style={{ '--section-z': 11 }}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={viewOpts}
      >
        <div className="lp-section-label">
          <span className="lp-section-label__index">11</span>
          <span className="lp-section-label__title">GET STARTED</span>
        </div>

        <div className="lp-cta__content">
          <div className="lp-cta__overline">
            <span className="lp-cta__overline-line"/>
            <span className="lp-cta__overline-text">READY WHEN YOU ARE</span>
            <span className="lp-cta__overline-line"/>
          </div>

          <h2 className="lp-cta__heading">
            Start building<br/>
            <em className="lp-cta__heading-em">your pipeline.</em>
          </h2>

          <p className="lp-cta__body">
            Open Pipeline Studio and drag your first node onto the canvas.
            No configuration. No boilerplate. No waiting.
          </p>

          <MagneticButton strength={0.18}>
            <Link to="/studio" className="lp-cta__button">
              <span className="lp-cta__button-text">Launch Pipeline Studio</span>
              <span className="lp-cta__button-arrow">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10h12M12 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </Link>
          </MagneticButton>

          <div className="lp-cta__meta">
            <span className="lp-cta__meta-item">
              <span className="lp-cta__meta-dot" style={{ background: '#4ade80' }}/>FastAPI backend included
            </span>
            <span className="lp-cta__meta-item">
              <span className="lp-cta__meta-dot" style={{ background: '#a855f7' }}/>ReactFlow-powered canvas
            </span>
            <span className="lp-cta__meta-item">
              <span className="lp-cta__meta-dot" style={{ background: '#facc15' }}/>Zustand state management
            </span>
          </div>
        </div>

        <div className="lp-cta__diagram-bg" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="lp-cta__ring" style={{
              width: `${(i + 1) * 160}px`,
              height: `${(i + 1) * 160}px`,
              opacity: 0.03 + i * 0.008,
            }}/>
          ))}
        </div>
      </motion.section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="lp-footer">
        <span className="lp-footer__wordmark">
          PIPELINE<span className="lp-footer__dot">●</span>STUDIO
        </span>
        <span className="lp-footer__copy">Built on ReactFlow · Zustand · FastAPI</span>
        <Link to="/studio" className="lp-footer__link">Open Studio →</Link>
      </footer>
    </div>
  );
}
