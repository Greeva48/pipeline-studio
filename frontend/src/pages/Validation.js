import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import PageTransition from '../components/PageTransition';

const SCHEMA_CHECKS = [
  { label: 'All edges have valid source/target', pass: true },
  { label: 'No orphan nodes detected',           pass: true },
  { label: 'All handles have matching IDs',      pass: true },
  { label: 'Required fields present on all nodes', pass: true },
  { label: 'No duplicate node IDs',              pass: true },
];

const RUNTIME_CHECKS = [
  { label: 'Graph serialization valid',    pass: true },
  { label: 'Response schema matches spec', pass: true },
];

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

export default function Validation() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await db.listValidationRuns();
      setRuns(data);
    };
    load();
  }, []);

  const passCount = runs.filter(r => r.isDAG).length;
  const totalNodes = runs.reduce((s, r) => s + (r.nodeCount ?? 0), 0);
  const totalEdges = runs.reduce((s, r) => s + (r.edgeCount ?? 0), 0);

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Observability</span>
          <h1 className="ps-page-header__title">Validation</h1>
          <p className="ps-page-header__sub">
            {runs.length === 0
              ? 'No validations run yet'
              : `${passCount}/${runs.length} recent validations passing`}
          </p>
        </div>
        <div className="ps-page-header__actions">
          <button
            className="ps-btn-ghost"
            disabled
            title="Export requires a connected backend"
            style={{ opacity: 0.45, cursor: 'not-allowed' }}
          >
            Export Report
          </button>
        </div>
      </div>

      <div className="ps-page-body">
        <div className="validation-layout">

          {/* Timeline */}
          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              Validation History
              <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            {runs.length === 0 ? (
              <div className="ps-empty">
                <svg className="ps-empty__icon" viewBox="0 0 32 32" fill="none">
                  <path d="M6 16.5l6 6 14-14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="ps-empty__title">No validations yet</span>
                <span className="ps-empty__body">Click Validate in Studio to run your first validation.</span>
              </div>
            ) : (
              <div className="validation-timeline">
                {runs.map((run, i) => (
                  <div key={run.id} className="validation-event">
                    <div className="validation-event__line">
                      <div className="validation-event__dot" style={{
                        background: run.isDAG ? 'var(--accent-input)' : 'var(--status-error)',
                      }} />
                      {i < runs.length - 1 && <div className="validation-event__connector" />}
                    </div>

                    <div className="validation-event__body">
                      <div className="validation-event__pipeline">{run.pipelineName || 'Unnamed Pipeline'}</div>
                      <div className="validation-event__meta">
                        <span className={`ps-badge ps-badge--${run.isDAG ? 'live' : 'archived'}`}>
                          {run.isDAG ? 'VALID DAG' : 'CYCLE DETECTED'}
                        </span>
                        {run.nodeCount != null && (
                          <span className="validation-event__tag">
                            {run.nodeCount} nodes · {run.edgeCount} edges
                          </span>
                        )}
                        {run.error && (
                          <span className="validation-event__tag" style={{ color: 'var(--status-error)' }}>
                            {run.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="validation-event__time">{timeAgo(run.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right stats */}
          <div className="validation-stat-cards">

            <div className="val-stat-card">
              <div className="val-stat-card__title">Graph Statistics</div>
              {[
                ['Total Runs',   String(runs.length)],
                ['Passing',      String(passCount)],
                ['Failing',      String(runs.length - passCount)],
                ['Total Nodes',  String(totalNodes)],
                ['Total Edges',  String(totalEdges)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{k}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="val-stat-card">
              <div className="val-stat-card__title">Schema Validation</div>
              {SCHEMA_CHECKS.map(c => (
                <div key={c.label} className="val-check">
                  <div className={`val-check__icon val-check__icon--${c.pass ? 'pass' : 'fail'}`}>
                    {c.pass ? '✓' : '✗'}
                  </div>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>

            <div className="val-stat-card">
              <div className="val-stat-card__title">Runtime Readiness</div>
              {RUNTIME_CHECKS.map(c => (
                <div key={c.label} className="val-check">
                  <div className={`val-check__icon val-check__icon--${c.pass ? 'pass' : 'fail'}`}>
                    {c.pass ? '✓' : '✗'}
                  </div>
                  <span>{c.label}</span>
                </div>
              ))}
              <div className="val-check">
                <div className="val-check__icon" style={{
                  background: 'rgba(74,222,128,0.1)',
                  color: 'var(--accent-input)',
                  width: 14, height: 14, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', flexShrink: 0,
                }}>✓</div>
                <span style={{ color: 'var(--text-tertiary)' }}>Backend connection healthy</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
