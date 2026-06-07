// pages/Studio.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { db } from '../lib/db';
import * as api from '../lib/api';
import { PipelineToolbar } from '../toolbar';
import { PipelineUI } from '../ui';
import { ValidationBar } from '../submit';
import InspectorPanel from '../components/InspectorPanel';
import CommandPalette from '../components/CommandPalette';

function DeployIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v7M3 5l3-4 3 4" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 9.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Studio() {
  const [searchParams] = useSearchParams();

  const {
    nodeCount, edgeCount,
    pipelineId, pipelineName, pipelineStatus,
    loadPipeline, newPipeline, renamePipeline, savePipeline, clearCanvas, deployPipeline,
    setSnapToGrid, setAutoSave, undo, redo,
  } = useStore(
    useShallow((s) => ({
      nodeCount:      s.nodes.length,
      edgeCount:      s.edges.length,
      pipelineId:     s.pipelineId,
      pipelineName:   s.pipelineName,
      pipelineStatus: s.pipelineStatus,
      loadPipeline:   s.loadPipeline,
      newPipeline:    s.newPipeline,
      renamePipeline: s.renamePipeline,
      savePipeline:   s.savePipeline,
      clearCanvas:    s.clearCanvas,
      deployPipeline: s.deployPipeline,
      setSnapToGrid:  s.setSnapToGrid,
      setAutoSave:    s.setAutoSave,
      undo:           s.undo,
      redo:           s.redo,
    }))
  );

  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [deploying,    setDeploying]    = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameValue,    setNameValue]    = useState('');
  const nameInputRef = useRef(null);

  // ── Load pipeline on mount + sync settings to canvas ─────
  useEffect(() => {
    const init = async () => {
      // Load workspace settings and apply to canvas state
      try {
        const settings = await db.getSettings();
        setSnapToGrid(settings.snapToGrid ?? true);
        setAutoSave(settings.autoSave ?? true);
      } catch {}

      const queryId = searchParams.get('id');
      if (queryId) {
        try {
          const meta = await db.getPipeline(queryId);
          if (meta) { await loadPipeline(queryId); return; }
        } catch {}
      }
      const currentId = db.getCurrentPipelineId();
      if (currentId) {
        try {
          const meta = await db.getPipeline(currentId);
          if (meta) { await loadPipeline(currentId); return; }
        } catch {}
      }
      await newPipeline();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CMD+K listener ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Undo / Redo (Cmd+Z / Cmd+Shift+Z / Cmd+Y) ────────────
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // e.key is uppercase 'Z' when Shift is held — normalize before comparing,
      // otherwise Cmd+Shift+Z (redo) never matches and redo silently breaks.
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const tag = e.target?.tagName;
      // Let native text undo work inside node inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      e.preventDefault();
      // Cmd+Shift+Z or Cmd+Y → redo; plain Cmd+Z → undo
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Validate ──────────────────────────────────────────────
  const handleValidate = useCallback(async () => {
    const { nodes, edges, pipelineId: pid, pipelineName: pname } = useStore.getState();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // If we have a pipeline ID, use the full validation endpoint (persists results)
      if (pid) {
        const data = await api.validatePipeline(pid, {
          nodes,
          edges,
          pipeline_name: pname,
        });
        setResult({
          is_dag:    data.isDAG,
          num_nodes: data.numNodes,
          num_edges: data.numEdges,
        });
      } else {
        // Fallback: parse-only (no persistence). Uses the configurable API base.
        const data = await api.parsePipeline({ nodes, edges });
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Deploy ────────────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (!pipelineId) return;
    setDeploying(true);
    try {
      await deployPipeline('staging');
      alert('Pipeline deployed successfully!');
    } catch (err) {
      alert(`Deploy failed: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  }, [pipelineId, deployPipeline]);

  const handleDismiss = () => { setResult(null); setError(null); };

  // ── Pipeline rename ───────────────────────────────────────
  const startRename = () => {
    setNameValue(pipelineName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 20);
  };

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== pipelineName) renamePipeline(trimmed);
    setEditingName(false);
  };

  const handleNameKey = (e) => {
    if (e.key === 'Enter')  commitRename();
    if (e.key === 'Escape') setEditingName(false);
  };

  // ── Manual save (Cmd+S) ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        savePipeline();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [savePipeline]);

  return (
    <div className="app">

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onValidate={handleValidate}
        onClearCanvas={clearCanvas}
        onUndo={undo}
        onRedo={redo}
      />

      {/* ── Top Navigation ─────────────────────────────── */}
      <header className="top-nav">

        <div className="top-nav__left">
          <div className="top-nav__brand">
            <Link to="/dashboard" className="top-nav__wordmark">
              PIPELINE<span className="top-nav__wordmark-dot">●</span>STUDIO
            </Link>
          </div>

          <div className="top-nav__divider-v" />

          <div className="top-nav__project">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleNameKey}
                style={{
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--border-active)',
                  borderRadius: '2px',
                  padding: '2px 6px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: 180,
                }}
              />
            ) : (
              <span
                className="top-nav__project-name"
                title="Click to rename"
                onClick={startRename}
                style={{ cursor: 'text' }}
              >
                {pipelineName}
              </span>
            )}
            <span className="top-nav__project-status">{pipelineStatus}</span>
          </div>
        </div>

        <div className="top-nav__center">
          <span className="top-nav__pipeline-name">
            {pipelineName
              ? `${pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workflow'}.graph`
              : 'workflow.graph'}
          </span>
        </div>

        <div className="top-nav__right">
          <div className="top-nav__stats">
            <div className="top-nav__stat">
              <span className="top-nav__stat-label">Nodes</span>
              <span className="top-nav__stat-value">{nodeCount}</span>
            </div>
            <div className="top-nav__stat-sep" />
            <div className="top-nav__stat">
              <span className="top-nav__stat-label">Edges</span>
              <span className="top-nav__stat-value">{edgeCount}</span>
            </div>
          </div>

          <button
            className="validate-btn"
            onClick={handleValidate}
            disabled={loading}
          >
            {loading ? 'Analyzing…' : 'Validate'}
          </button>

          <button
            className="deploy-btn"
            onClick={handleDeploy}
            disabled={deploying || !pipelineId}
            title={!pipelineId ? 'Save a pipeline first' : 'Deploy to staging'}
          >
            <DeployIcon />
            {deploying ? 'Deploying…' : 'Deploy'}
          </button>
        </div>

      </header>

      {/* ── 3-column main layout ───────────────────────── */}
      <div className="main-layout">
        <PipelineToolbar />
        <PipelineUI />
        <InspectorPanel />
      </div>

      {/* ── Bottom validation bar ──────────────────────── */}
      <ValidationBar
        result={result}
        loading={loading}
        error={error}
        onDismiss={handleDismiss}
      />

    </div>
  );
}

export default Studio;
