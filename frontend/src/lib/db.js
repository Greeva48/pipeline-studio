// lib/db.js — API-backed data service.
// All methods now return Promises backed by the FastAPI backend + Supabase.
// The interface contract is the same as the original localStorage version,
// allowing pages/store to adopt async data fetching with minimal changes.

import * as api from './api';

// ── Helpers ─────────────────────────────────────────────────────────────

function lsRead(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Default settings ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  workspaceName:        'Pipeline Studio',
  defaultPipelineName:  'workflow.graph',
  autoSave:             true,
  snapToGrid:           true,
  defaultEnvironment:   'Production',
  autoDeployOnValidate: false,
  deploymentRegion:     'us-east-1',
  activeModels:         ['gpt-4o', 'claude-sonnet-4-6'],
};

export const db = {

  // ── Pipelines ─────────────────────────────────────────────────────────

  async listPipelines() {
    try {
      return await api.listProjects();
    } catch {
      return lsRead('ps_pipelines', []);
    }
  },

  async getPipeline(id) {
    try {
      return await api.getProject(id);
    } catch {
      const list = lsRead('ps_pipelines', []);
      return list.find(p => p.id === id) ?? null;
    }
  },

  async createPipeline({ name = 'New Pipeline', description = '', accentColor = '#A855F7' } = {}) {
    try {
      const pipeline = await api.createProject({ name, description, accent_color: accentColor });
      return pipeline;
    } catch {
      // Fallback: localStorage
      const id  = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      const pipeline = { id, name, description, accentColor, status: 'draft', nodeCount: 0, edgeCount: 0, createdAt: now, updatedAt: now };
      lsWrite('ps_pipelines', [pipeline, ...lsRead('ps_pipelines', [])]);
      return pipeline;
    }
  },

  async updatePipeline(id, patch) {
    // Map camelCase UI keys to snake_case API keys
    const body = {};
    if (patch.name !== undefined)        body.name        = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.accentColor !== undefined) body.accent_color = patch.accentColor;
    if (patch.status !== undefined)      body.status      = patch.status;
    try {
      return await api.updateProject(id, body);
    } catch {
      const list = lsRead('ps_pipelines', []);
      const updated = list.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p);
      lsWrite('ps_pipelines', updated);
      return updated.find(p => p.id === id) ?? null;
    }
  },

  async deletePipeline(id) {
    try {
      await api.deleteProject(id);
    } catch {
      lsWrite('ps_pipelines', lsRead('ps_pipelines', []).filter(p => p.id !== id));
      try { localStorage.removeItem(`ps_canvas_${id}`); } catch {}
    }
    if (this.getCurrentPipelineId() === id) lsWrite('ps_current_pipeline', null);
  },

  // ── Canvas ────────────────────────────────────────────────────────────

  async saveCanvas(id, { nodes, edges }) {
    try {
      await api.saveCanvas(id, { nodes, edges });
    } catch {
      lsWrite(`ps_canvas_${id}`, { nodes, edges });
      const list = lsRead('ps_pipelines', []).map(p =>
        p.id === id ? { ...p, nodeCount: nodes.length, edgeCount: edges.length, updatedAt: new Date().toISOString() } : p
      );
      lsWrite('ps_pipelines', list);
    }
  },

  async loadCanvas(id) {
    if (!id) return { nodes: [], edges: [] };
    try {
      const data = await api.loadCanvas(id);
      return { nodes: data.nodes || [], edges: data.edges || [] };
    } catch {
      return lsRead(`ps_canvas_${id}`, { nodes: [], edges: [] });
    }
  },

  // ── Current pipeline tracking ─────────────────────────────────────────

  getCurrentPipelineId() {
    return lsRead('ps_current_pipeline', null);
  },

  setCurrentPipelineId(id) {
    lsWrite('ps_current_pipeline', id);
  },

  // ── Validation runs ───────────────────────────────────────────────────

  async addValidationRun({ pipelineId, pipelineName, isDAG, nodeCount, edgeCount, error }) {
    // Validation runs are now persisted server-side by api.validatePipeline.
    // This method is kept for backward compatibility but only writes a local fallback.
    const run = {
      id:           `run-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      pipelineId:   pipelineId ?? null,
      pipelineName: pipelineName ?? '',
      isDAG:        isDAG ?? false,
      nodeCount:    nodeCount ?? 0,
      edgeCount:    edgeCount ?? 0,
      error:        error ?? null,
      timestamp:    new Date().toISOString(),
    };
    const runs = lsRead('ps_validation_runs', []);
    lsWrite('ps_validation_runs', [run, ...runs].slice(0, 50));
    return run;
  },

  async listValidationRuns() {
    try {
      return await api.listValidationRuns();
    } catch {
      return lsRead('ps_validation_runs', []);
    }
  },

  // ── Activity log ──────────────────────────────────────────────────────

  logActivity({ type, pipelineId, pipelineName, detail, dotColor }) {
    // Activity is logged server-side; nothing to do here.
    // Keep a local fallback for offline mode.
    const item = {
      id:           `act-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type, pipelineId: pipelineId ?? null, pipelineName: pipelineName ?? '',
      detail: detail ?? '', dotColor: dotColor ?? '#6B7280',
      timestamp: new Date().toISOString(),
    };
    const log = lsRead('ps_activity', []);
    lsWrite('ps_activity', [item, ...log].slice(0, 100));
  },

  async listActivity() {
    try {
      return await api.listActivity(50);
    } catch {
      return lsRead('ps_activity', []);
    }
  },

  // ── Settings ──────────────────────────────────────────────────────────

  async getSettings() {
    try {
      return await api.getSettings();
    } catch {
      return { ...DEFAULT_SETTINGS, ...lsRead('ps_settings', {}) };
    }
  },

  async saveSettings(patch) {
    // Map camelCase → snake_case for backend
    const body = {};
    if (patch.workspaceName !== undefined)       body.workspace_name           = patch.workspaceName;
    if (patch.defaultPipelineName !== undefined) body.default_pipeline_name    = patch.defaultPipelineName;
    if (patch.autoSave !== undefined)            body.auto_save                = patch.autoSave;
    if (patch.snapToGrid !== undefined)          body.snap_to_grid             = patch.snapToGrid;
    if (patch.defaultEnvironment !== undefined)  body.default_environment      = patch.defaultEnvironment;
    if (patch.autoDeployOnValidate !== undefined) body.auto_deploy_on_validate = patch.autoDeployOnValidate;
    if (patch.deploymentRegion !== undefined)    body.deployment_region        = patch.deploymentRegion;
    if (patch.activeModels !== undefined)        body.active_models            = patch.activeModels;

    try {
      return await api.updateSettings(body);
    } catch {
      const current = lsRead('ps_settings', {});
      const merged  = { ...DEFAULT_SETTINGS, ...current, ...patch };
      lsWrite('ps_settings', merged);
      return merged;
    }
  },

  // ── Deployments ───────────────────────────────────────────────────────

  async listDeployments(env) {
    try {
      return await api.listDeployments(env);
    } catch {
      return [];
    }
  },

  async createDeployment(pipelineId, environment = 'staging') {
    // Deployments require the backend — there is intentionally no local fallback.
    // Surface a clear, actionable error instead of a raw "Failed to fetch":
    //  1) localStorage-only pipelines have ids like `pipeline-<ts>` (not server UUIDs),
    //     which means the backend was unreachable when they were created.
    //  2) a network TypeError means the API server isn't running.
    if (!pipelineId || String(pipelineId).startsWith('pipeline-')) {
      throw new Error(
        'This pipeline has not been saved to the server yet. Make sure the backend is running, then create or reopen the pipeline before deploying.'
      );
    }
    try {
      return await api.createDeployment({ pipeline_id: pipelineId, environment });
    } catch (err) {
      if (err instanceof TypeError || /failed to fetch|networkerror/i.test(err.message || '')) {
        throw new Error(`Cannot reach the backend at ${api.BASE}. Start the API server and try again.`);
      }
      throw err;
    }
  },

  async archiveDeployment(deploymentId) {
    return await api.archiveDeployment(deploymentId);
  },
};
