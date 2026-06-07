import { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';

const SECTIONS = ['General', 'Models', 'API Keys', 'Deployments', 'Workspace', 'Team'];

const ALL_MODELS = [
  { id: 'gpt-4o',            name: 'GPT-4o',         provider: 'OpenAI',    status: 'live'       },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4', provider: 'Anthropic', status: 'live'       },
  { id: 'gpt-3.5-turbo',     name: 'GPT-3.5 Turbo',  provider: 'OpenAI',    status: 'deprecated' },
  { id: 'claude-opus-4-8',   name: 'Claude Opus 4',   provider: 'Anthropic', status: 'live'       },
];

const disabledBtnStyle = { opacity: 0.45, cursor: 'not-allowed' };

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={`settings-toggle${on ? ' settings-toggle--on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}

function GeneralSection({ settings, onSave }) {
  const [workspaceName,       setWorkspaceName]       = useState(settings.workspaceName);
  const [defaultPipelineName, setDefaultPipelineName] = useState(settings.defaultPipelineName);
  const [autoSave,            setAutoSave]            = useState(settings.autoSave);
  const [snapToGrid,          setSnapToGrid]          = useState(settings.snapToGrid);
  const [saved,               setSaved]               = useState(false);

  useEffect(() => {
    setWorkspaceName(settings.workspaceName);
    setDefaultPipelineName(settings.defaultPipelineName);
    setAutoSave(settings.autoSave);
    setSnapToGrid(settings.snapToGrid);
  }, [settings]);

  const handleSave = async () => {
    await onSave({ workspaceName, defaultPipelineName, autoSave, snapToGrid });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-content">
      <h3 className="settings-section-title">General</h3>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Workspace name</span>
          <span className="settings-row__desc">Shown in navigation and shared with your team.</span>
        </div>
        <input
          className="settings-input"
          value={workspaceName}
          onChange={e => setWorkspaceName(e.target.value)}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Default pipeline name</span>
          <span className="settings-row__desc">Prefix used when creating new pipelines.</span>
        </div>
        <input
          className="settings-input"
          value={defaultPipelineName}
          onChange={e => setDefaultPipelineName(e.target.value)}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Auto-save</span>
          <span className="settings-row__desc">Automatically save pipeline changes while editing.</span>
        </div>
        <Toggle on={autoSave} onChange={setAutoSave} />
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Snap to grid</span>
          <span className="settings-row__desc">Snap nodes to the 24px canvas grid while dragging.</span>
        </div>
        <Toggle on={snapToGrid} onChange={setSnapToGrid} />
      </div>
      <div style={{ paddingTop: 8 }}>
        <button className="ps-btn-primary" onClick={handleSave} style={{ height: 32 }}>
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function ModelsSection({ settings, onSave }) {
  const [activeModels, setActiveModels] = useState(settings.activeModels ?? ['gpt-4o', 'claude-sonnet-4-6']);

  useEffect(() => {
    setActiveModels(settings.activeModels ?? ['gpt-4o', 'claude-sonnet-4-6']);
  }, [settings]);

  const toggle = async (id) => {
    const next = activeModels.includes(id)
      ? activeModels.filter(m => m !== id)
      : [...activeModels, id];
    setActiveModels(next);
    await onSave({ activeModels: next });
  };

  return (
    <div className="settings-content">
      <h3 className="settings-section-title">Models</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: 20, lineHeight: 1.65 }}>
        Configure which language models are available in the LLM node.
      </p>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
        <table className="settings-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Model</th>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Provider</th>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Status</th>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODELS.map(m => (
              <tr key={m.id}>
                <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: activeModels.includes(m.id) ? 500 : 400 }}>
                  {m.name}
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>
                  {m.provider}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {m.status === 'deprecated'
                    ? <span className="ps-badge ps-badge--archived">Deprecated</span>
                    : <span className="ps-badge ps-badge--live">Available</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <Toggle
                    on={activeModels.includes(m.id)}
                    onChange={() => toggle(m.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  return (
    <div className="settings-content">
      <h3 className="settings-section-title">API Keys</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: 20, lineHeight: 1.65 }}>
        Model provider keys are configured securely on the server via environment
        variables. In-app key management is coming soon.
      </p>
      {['OpenAI', 'Anthropic'].map(provider => (
        <div key={provider} className="settings-row">
          <div className="settings-row__label">
            <span className="settings-row__title">{provider}</span>
            <span className="settings-row__desc">Configured on the server via environment variables.</span>
          </div>
          <span className="ps-badge ps-badge--draft" style={{ fontSize: '11px' }}>Environment</span>
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button
          className="ps-btn-ghost"
          disabled
          style={disabledBtnStyle}
          title="In-app key management is coming soon"
        >
          + Add API Key
        </button>
      </div>
    </div>
  );
}

function DeploymentsSection({ settings, onSave }) {
  const [defaultEnv,           setDefaultEnv]           = useState(settings.defaultEnvironment ?? 'Production');
  const [autoDeployOnValidate, setAutoDeployOnValidate] = useState(settings.autoDeployOnValidate ?? false);
  const [region,               setRegion]               = useState(settings.deploymentRegion ?? 'us-east-1');
  const [saved,                setSaved]                = useState(false);

  useEffect(() => {
    setDefaultEnv(settings.defaultEnvironment ?? 'Production');
    setAutoDeployOnValidate(settings.autoDeployOnValidate ?? false);
    setRegion(settings.deploymentRegion ?? 'us-east-1');
  }, [settings]);

  const handleSave = async () => {
    await onSave({ defaultEnvironment: defaultEnv, autoDeployOnValidate, deploymentRegion: region });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-content">
      <h3 className="settings-section-title">Deployments</h3>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Default environment</span>
          <span className="settings-row__desc">Environment used when deploying from Studio.</span>
        </div>
        <select
          className="settings-input"
          style={{ appearance: 'none', cursor: 'pointer' }}
          value={defaultEnv}
          onChange={e => setDefaultEnv(e.target.value)}
        >
          <option>Production</option>
          <option>Staging</option>
        </select>
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Auto-deploy on validate</span>
          <span className="settings-row__desc">Trigger deployment when validation passes.</span>
        </div>
        <Toggle on={autoDeployOnValidate} onChange={setAutoDeployOnValidate} />
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Deployment region</span>
          <span className="settings-row__desc">Primary region for pipeline execution.</span>
        </div>
        <select
          className="settings-input"
          style={{ appearance: 'none', cursor: 'pointer' }}
          value={region}
          onChange={e => setRegion(e.target.value)}
        >
          <option>us-east-1</option>
          <option>us-west-2</option>
          <option>eu-west-1</option>
        </select>
      </div>
      <div style={{ paddingTop: 8 }}>
        <button className="ps-btn-primary" onClick={handleSave} style={{ height: 32 }}>
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function WorkspaceSection({ pipelines }) {
  return (
    <div className="settings-content">
      <h3 className="settings-section-title">Workspace</h3>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Plan</span>
          <span className="settings-row__desc">Your current subscription tier.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ps-badge ps-badge--draft" style={{ fontSize: '11px' }}>Starter</span>
          <button
            className="ps-btn-primary"
            style={{ height: 28, fontSize: '11px', ...disabledBtnStyle }}
            disabled
            title="Billing not yet connected"
          >
            Upgrade
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Pipeline limit</span>
          <span className="settings-row__desc">Maximum pipelines on your current plan.</span>
        </div>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {pipelines} / 10
        </span>
      </div>
      <div className="settings-row">
        <div className="settings-row__label">
          <span className="settings-row__title">Storage</span>
          <span className="settings-row__desc">Canvas data stored in Supabase cloud database.</span>
        </div>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Cloud
        </span>
      </div>
    </div>
  );
}

function TeamSection() {
  const { user } = useAuth();
  const name     = user?.name || user?.email?.split('@')[0] || 'You';
  const initials = user?.initials || name.slice(0, 2).toUpperCase();
  const email    = user?.email || '';

  return (
    <div className="settings-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="settings-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Team</h3>
        <button
          className="ps-btn-ghost"
          style={{ fontSize: '11px', ...disabledBtnStyle }}
          disabled
          title="Team invites are coming soon"
        >
          Invite member
        </button>
      </div>
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
        <table className="settings-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Member</th>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Role</th>
              <th style={{ padding: '8px 16px', background: 'var(--bg-surface)' }}>Last active</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="settings-member-avatar">{initials}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {name} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(you)</span>
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'Space Mono, monospace', color: 'var(--text-tertiary)' }}>{email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <span className="ps-badge ps-badge--live">Admin</span>
              </td>
              <td style={{ padding: '10px 16px', fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>
                Active now
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 14, lineHeight: 1.6 }}>
        You're the only member of this workspace. Inviting teammates is coming soon.
      </p>
    </div>
  );
}

export default function Settings() {
  const [section,        setSection]        = useState('General');
  const [settings,       setSettings]       = useState(null);
  const [pipelineCount,  setPipelineCount]  = useState(0);

  useEffect(() => {
    const load = async () => {
      const [s, ps] = await Promise.all([db.getSettings(), db.listPipelines()]);
      setSettings(s);
      setPipelineCount(ps.length);
    };
    load();
  }, []);

  const handleSave = async (patch) => {
    const updated = await db.saveSettings(patch);
    setSettings(updated);
  };

  if (!settings) {
    return (
      <PageTransition>
        <div className="ps-page">
          <div className="ps-page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'Space Mono, monospace', fontSize: '12px' }}>
              Loading settings…
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const sectionProps = { settings, onSave: handleSave };

  const sections = {
    General:     <GeneralSection     {...sectionProps} />,
    Models:      <ModelsSection      {...sectionProps} />,
    'API Keys':  <ApiKeysSection />,
    Deployments: <DeploymentsSection {...sectionProps} />,
    Workspace:   <WorkspaceSection   pipelines={pipelineCount} />,
    Team:        <TeamSection />,
  };

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Workspace</span>
          <h1 className="ps-page-header__title">Settings</h1>
        </div>
      </div>

      <div className="ps-page-body">
        <div className="settings-layout">
          <nav className="settings-nav">
            {SECTIONS.map(s => (
              <div
                key={s}
                role="button"
                tabIndex={0}
                className={`settings-nav__item${section === s ? ' settings-nav__item--active' : ''}`}
                onClick={() => setSection(s)}
                onKeyDown={e => e.key === 'Enter' && setSection(s)}
              >
                {s}
              </div>
            ))}
          </nav>
          {sections[section]}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
