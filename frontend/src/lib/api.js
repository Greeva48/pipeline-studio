// lib/api.js — Authenticated REST client for the Pipeline Studio FastAPI backend.
// All methods return Promises. The auth token is fetched from Supabase on each call.

import { getAuthToken } from './supabase';

// Configurable for production; falls back to the local dev server.
// Set REACT_APP_API_URL at build time to point at the deployed backend.
export const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function authHeaders() {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body) {
  const headers = await authHeaders();
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data;
}

const get  = (path)         => request('GET',    path);
const post = (path, body)   => request('POST',   path, body);
const put  = (path, body)   => request('PUT',    path, body);
const del  = (path)         => request('DELETE', path);

// ── Projects ────────────────────────────────────────────────
export const listProjects   = ()       => get('/api/projects');
export const getProject     = (id)     => get(`/api/projects/${id}`);
export const createProject  = (body)   => post('/api/projects', body);
export const updateProject  = (id, b)  => put(`/api/projects/${id}`, b);
export const deleteProject  = (id)     => del(`/api/projects/${id}`);

// ── Canvas ──────────────────────────────────────────────────
export const loadCanvas = (id)         => get(`/api/projects/${id}/canvas`);
export const saveCanvas = (id, body)   => put(`/api/projects/${id}/canvas`, body);

// ── Validation ──────────────────────────────────────────────
export const validatePipeline   = (id, body) => post(`/api/projects/${id}/validate`, body);
export const listValidationRuns = ()         => get('/api/validation-runs');
export const listPipelineRuns   = (id)       => get(`/api/projects/${id}/validation-runs`);

// ── Deployments ─────────────────────────────────────────────
export const listDeployments    = (env)       => get(`/api/deployments${env ? `?env=${env}` : ''}`);
export const createDeployment   = (body)      => post('/api/deployments', body);
export const archiveDeployment  = (id)        => put(`/api/deployments/${id}/archive`, {});

// ── Activity ────────────────────────────────────────────────
export const listActivity = (limit = 50)  => get(`/api/activity?limit=${limit}`);

// ── Settings ────────────────────────────────────────────────
export const getSettings    = ()     => get('/api/settings');
export const updateSettings = (body) => put('/api/settings', body);

// ── Auth ────────────────────────────────────────────────────
export const getMe = () => get('/api/auth/me');

// ── Legacy parse (keep for validation bar fallback) ─────────
export const parsePipeline = (body) => post('/pipelines/parse', body);
