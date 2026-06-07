import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import PageTransition from '../components/PageTransition';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d} day${d !== 1 ? 's' : ''} ago`;
  return new Date(isoString).toLocaleDateString();
}

const QUICK_ACTIONS = [
  { label: 'New Pipeline',    sub: 'Start from scratch',    to: '/studio',      icon: '+' },
  { label: 'Open Studio',     sub: 'Continue building',      to: '/studio',      icon: '⬡' },
  { label: 'Run Validation',  sub: 'Check pipeline health',  to: '/validation',  icon: '✓' },
  { label: 'View Deployments', sub: 'Monitor live systems',  to: '/deployments', icon: '↑' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [pipelines,       setPipelines]       = useState([]);
  const [activity,        setActivity]        = useState([]);
  const [validationCount, setValidationCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [ps, acts, runs] = await Promise.all([
        db.listPipelines(),
        db.listActivity(),
        db.listValidationRuns(),
      ]);
      setPipelines(ps);
      setActivity(acts.slice(0, 6));
      setValidationCount(runs.length);
    };
    load();
  }, []);

  const live   = pipelines.filter(p => p.status === 'live').length;
  const recent = pipelines.slice(0, 4);

  const metrics = [
    { value: String(pipelines.length), label: 'Pipelines',   delta: pipelines.length > 0 ? 'In workspace' : 'None yet' },
    { value: String(live),             label: 'Live',         delta: live > 0 ? 'Deployed' : 'None deployed' },
    { value: String(validationCount),  label: 'Validations', delta: 'Total runs' },
    { value: '9',                       label: 'Node Types',  delta: 'Full coverage' },
  ];

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Overview</span>
          <h1 className="ps-page-header__title">
            {greeting}, {user?.name?.split(' ')[0] ?? 'there'}.
          </h1>
          <p className="ps-page-header__sub">
            {pipelines.length > 0
              ? `Your workspace has ${pipelines.length} pipeline${pipelines.length !== 1 ? 's' : ''} · ${live} live`
              : 'No pipelines yet. Create your first one.'}
          </p>
        </div>
        <div className="ps-page-header__actions">
          <Link to="/studio" className="ps-btn-primary">+ New Pipeline</Link>
        </div>
      </div>

      <div className="ps-page-body">

        {/* Metrics */}
        <div className="ps-section">
          <div className="metrics-row">
            {metrics.map(m => (
              <div key={m.label} className="metric-card">
                <span className="metric-card__value">{m.value}</span>
                <span className="metric-card__label">{m.label}</span>
                <span className="metric-card__delta">{m.delta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-layout">

          {/* Left: pipelines + quick actions */}
          <div>
            <div className="ps-section">
              <div className="ps-section__label">Recent Pipelines</div>
              {recent.length === 0 ? (
                <div className="ps-empty">
                  <svg className="ps-empty__icon" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="4" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="ps-empty__title">No pipelines yet</span>
                  <span className="ps-empty__body">Create your first pipeline in Studio to get started.</span>
                  <Link to="/studio" className="ps-btn-primary" style={{ marginTop: 12 }}>+ New Pipeline</Link>
                </div>
              ) : (
                <div className="dashboard-grid">
                  {recent.map(p => (
                    <Link key={p.id} to={`/studio?id=${p.id}`} className="pipeline-card">
                      <div className="pipeline-card__header">
                        <h3 className="pipeline-card__title">{p.name}</h3>
                        <span className={`ps-badge ps-badge--${p.status === 'live' ? 'live' : 'draft'}`}>
                          <span className="ps-badge__dot"
                            style={{ background: p.status === 'live' ? 'var(--accent-input)' : 'var(--text-tertiary)' }}/>
                          {p.status === 'live' ? 'Live' : 'Draft'}
                        </span>
                      </div>
                      {p.description && (
                        <p className="pipeline-card__desc">{p.description}</p>
                      )}
                      <div className="pipeline-card__footer">
                        <span className="pipeline-card__meta">
                          {p.nodeCount} nodes · {p.edgeCount} edges
                        </span>
                        <span className="pipeline-card__meta">{timeAgo(p.updatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="ps-section">
              <div className="ps-section__label">Quick Actions</div>
              <div className="quick-actions">
                {QUICK_ACTIONS.map(a => (
                  <Link key={a.label} to={a.to} className="quick-action">
                    <div className="quick-action__icon">
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px' }}>
                        {a.icon}
                      </span>
                    </div>
                    <span className="quick-action__label">{a.label}</span>
                    <span className="quick-action__sub">{a.sub}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: activity */}
          <div className="dashboard-right">
            <div className="ps-section" style={{ marginBottom: 0 }}>
              <div className="ps-section__label">Activity</div>
              {activity.length === 0 ? (
                <div className="ps-empty">
                  <span className="ps-empty__title">No activity yet</span>
                  <span className="ps-empty__body">Actions in Studio will appear here.</span>
                </div>
              ) : (
                <div className="activity-feed">
                  {activity.map((ev) => (
                    <div key={ev.id} className="activity-event">
                      <span className="activity-event__dot" style={{ background: ev.dotColor ?? '#6B7280' }}/>
                      <div className="activity-event__content">
                        <p className="activity-event__text" style={{ margin: 0 }}>
                          <strong>{ev.pipelineName}</strong>
                        </p>
                        <p className="activity-event__text" style={{
                          margin: '2px 0 0',
                          fontFamily: 'Space Mono, monospace',
                          fontSize: '10px',
                          color: 'var(--text-tertiary)',
                        }}>
                          {ev.detail}
                        </p>
                      </div>
                      <span className="activity-event__time">{timeAgo(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
    </PageTransition>
  );
}
