import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import PageTransition from '../components/PageTransition';

const FILTERS = ['All', 'Active', 'Draft', 'Archived'];

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Projects() {
  const [filter,    setFilter]    = useState('All');
  const [pipelines, setPipelines] = useState([]);
  const [menuOpen,  setMenuOpen]  = useState(null); // pipeline id with open menu

  const load = async () => {
    const list = await db.listPipelines();
    setPipelines(list);
  };

  useEffect(() => {
    load();
    // Close menu on outside click
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const visible = pipelines.filter(p => {
    if (filter === 'All')      return true;
    if (filter === 'Active')   return p.status === 'live';
    if (filter === 'Draft')    return p.status === 'draft';
    if (filter === 'Archived') return p.status === 'archived';
    return true;
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this pipeline? This cannot be undone.')) return;
    await db.deletePipeline(id);
    setMenuOpen(null);
    load();
  };

  const handleArchive = async (e, id, current) => {
    e.stopPropagation();
    const next = current === 'archived' ? 'draft' : 'archived';
    await db.updatePipeline(id, { status: next });
    setMenuOpen(null);
    load();
  };

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Workspace</span>
          <h1 className="ps-page-header__title">Projects</h1>
          <p className="ps-page-header__sub">
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''} ·{' '}
            {pipelines.filter(p => p.status === 'live').length} active
          </p>
        </div>
        <div className="ps-page-header__actions">
          <Link to="/studio" className="ps-btn-primary">+ New Pipeline</Link>
        </div>
      </div>

      <div className="ps-page-body">

        <div className="projects-toolbar">
          <div className="projects-filter">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`projects-filter__tab${filter === f ? ' projects-filter__tab--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {visible.length} project{visible.length !== 1 ? 's' : ''}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="ps-empty">
            <svg className="ps-empty__icon" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="ps-empty__title">
              {filter === 'All' ? 'No pipelines yet' : `No ${filter.toLowerCase()} pipelines`}
            </span>
            <span className="ps-empty__body">
              {filter === 'All'
                ? 'Create your first pipeline in Studio.'
                : `Switch to a different filter or create a new pipeline.`}
            </span>
            {filter === 'All' && (
              <Link to="/studio" className="ps-btn-primary" style={{ marginTop: 12 }}>+ New Pipeline</Link>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {visible.map(p => (
              <div key={p.id} className="project-card">
                <div className="project-card__accent" style={{ background: p.accentColor ?? '#A855F7' }} />
                <div className="project-card__body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <h3 className="project-card__name">{p.name}</h3>
                    <span className={`ps-badge ps-badge--${p.status === 'live' ? 'live' : p.status === 'archived' ? 'archived' : 'draft'}`} style={{ flexShrink: 0 }}>
                      {p.status === 'live' ? 'Live' : p.status === 'archived' ? 'Archived' : 'Draft'}
                    </span>
                  </div>
                  {p.description && <p className="project-card__desc">{p.description}</p>}
                </div>
                <div className="project-card__footer">
                  <div className="project-card__stats">
                    <span className="project-card__stat">{p.nodeCount} nodes</span>
                    <span className="project-card__stat">{p.edgeCount} edges</span>
                    <span className="project-card__stat">{timeAgo(p.updatedAt)}</span>
                  </div>

                  {/* Actions menu */}
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                      style={{
                        background: 'none', border: '1px solid transparent', cursor: 'pointer',
                        color: 'var(--text-tertiary)', padding: '2px 6px', borderRadius: '2px',
                        fontSize: '14px', lineHeight: 1,
                        transition: 'border-color 0.1s, color 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                      title="Actions"
                    >
                      ···
                    </button>

                    {menuOpen === p.id && (
                      <div style={{
                        position: 'absolute', bottom: '100%', right: 0, zIndex: 50,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-base)',
                        borderRadius: '4px', overflow: 'hidden', minWidth: 160,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        marginBottom: 4,
                      }}>
                        <Link
                          to={`/studio?id=${p.id}`}
                          style={{
                            display: 'block', padding: '8px 14px',
                            fontSize: '12px', color: 'var(--text-secondary)',
                            textDecoration: 'none', transition: 'background 0.08s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Open in Studio
                        </Link>
                        <button
                          onClick={e => handleArchive(e, p.id, p.status)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 14px', fontSize: '12px',
                            color: 'var(--text-secondary)', background: 'none',
                            border: 'none', cursor: 'pointer', transition: 'background 0.08s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {p.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                        <button
                          onClick={e => handleDelete(e, p.id)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '8px 14px', fontSize: '12px',
                            color: 'var(--status-error)', background: 'none',
                            border: 'none', cursor: 'pointer', transition: 'background 0.08s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          Delete pipeline
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="project-card__hover-cta">
                  <Link to={`/studio?id=${p.id}`} className="ps-btn-primary">
                    Open in Studio →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
    </PageTransition>
  );
}
