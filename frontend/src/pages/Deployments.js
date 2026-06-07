import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import PageTransition from '../components/PageTransition';

const ENVS = ['All', 'Production', 'Staging'];

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function Deployments() {
  const navigate = useNavigate();
  const [env,         setEnv]         = useState('All');
  const [deployments, setDeployments] = useState([]);

  const load = async () => {
    const data = await db.listDeployments(env === 'All' ? null : env);
    setDeployments(data);
  };

  useEffect(() => { load(); }, [env]); // eslint-disable-line react-hooks/exhaustive-deps

  const live    = deployments.filter(d => d.status === 'live');
  const avgLatency = live.length > 0
    ? Math.round(live.reduce((s, d) => s + (d.latencyMs ?? 0), 0) / live.filter(d => d.latencyMs != null).length || 0)
    : 0;

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this deployment?')) return;
    await db.archiveDeployment(id);
    load();
  };

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Infrastructure</span>
          <h1 className="ps-page-header__title">Deployments</h1>
          <p className="ps-page-header__sub">
            {live.length} active deployment{live.length !== 1 ? 's' : ''} across 2 environments
          </p>
        </div>
        <div className="ps-page-header__actions">
          <button className="ps-btn-ghost" onClick={() => navigate('/studio')}>Deploy Pipeline</button>
        </div>
      </div>

      <div className="ps-page-body">

        {/* Metric cards */}
        <div className="deployments-metrics">
          <div className="deploy-metric">
            <span className="deploy-metric__value">{live.length}</span>
            <span className="deploy-metric__label">Active</span>
          </div>
          <div className="deploy-metric">
            <span className="deploy-metric__value" style={{ color: 'var(--accent-input)' }}>
              {avgLatency > 0 ? `${avgLatency}ms` : '—'}
            </span>
            <span className="deploy-metric__label">Avg Latency</span>
          </div>
          <div className="deploy-metric">
            <span className="deploy-metric__value">99.9%</span>
            <span className="deploy-metric__label">Success Rate</span>
          </div>
          <div className="deploy-metric">
            <span className="deploy-metric__value">99.9%</span>
            <span className="deploy-metric__label">Uptime</span>
          </div>
        </div>

        {/* Environment tabs */}
        <div className="env-tabs">
          {ENVS.map(e => (
            <button
              key={e}
              className={`env-tab${env === e ? ' env-tab--active' : ''}`}
              onClick={() => setEnv(e)}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Table */}
        {deployments.length === 0 ? (
          <div className="ps-empty">
            <svg className="ps-empty__icon" viewBox="0 0 32 32" fill="none">
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 24h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="ps-empty__title">No deployments yet</span>
            <span className="ps-empty__body">Deploy a pipeline from Studio to see it here.</span>
          </div>
        ) : (
          <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <table className="deploy-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Project</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Deployed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deployments.map(d => (
                  <tr key={d.id}>
                    <td><span className="deploy-version">{d.version}</span></td>
                    <td style={{ color: 'var(--text-primary)' }}>{d.pipelineName || '—'}</td>
                    <td>
                      <span className={`ps-badge ps-badge--${d.environment === 'production' ? 'live' : 'staging'}`}>
                        {d.environment === 'production' ? 'Production' : 'Staging'}
                      </span>
                    </td>
                    <td>
                      <span className={`ps-badge ps-badge--${d.status}`}>
                        <span className="ps-badge__dot" style={{
                          background: d.status === 'live' ? 'var(--accent-input)' : 'var(--text-tertiary)',
                        }} />
                        {d.status === 'live' ? 'Live' : 'Archived'}
                      </span>
                    </td>
                    <td>
                      {d.latencyMs != null ? (
                        <span className={`deploy-latency${d.latencyMs > 300 ? ' deploy-latency--slow' : ''}`}>
                          {d.latencyMs}ms
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>
                      {timeAgo(d.deployedAt)}
                    </td>
                    <td>
                      {d.status === 'live' && (
                        <button
                          onClick={() => handleArchive(d.id)}
                          style={{
                            background: 'none', border: '1px solid var(--border-base)',
                            borderRadius: '2px', cursor: 'pointer', padding: '2px 8px',
                            fontSize: '11px', color: 'var(--text-tertiary)',
                            transition: 'border-color 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
    </PageTransition>
  );
}
