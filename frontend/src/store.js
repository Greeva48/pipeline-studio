// store.js — Pipeline canvas state + async persistence via real backend
import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { db } from './lib/db';

// Debounce helper — avoids thrashing the API on every keystroke
let saveTimer = null;
function debouncedSave(id, nodes, edges, delay = 600) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => db.saveCanvas(id, { nodes, edges }), delay);
}

// Push new state snapshot to history, truncating any redo chain.
// Returns the history fields to merge into Zustand state.
function pushHistory(s, newNodes, newEdges) {
  const _history = [...s._history.slice(0, s._historyIndex + 1), { nodes: newNodes, edges: newEdges }];
  if (_history.length > 50) _history.shift();
  return { _history, _historyIndex: _history.length - 1 };
}

// Flag to skip edge-delete history push when it's a cascade from node deletion
let _pendingNodeDelete = false;

// Whether the current pipeline should be auto-persisted to the backend.
// Read-only starter templates (no owner) are never saved; the autoSave setting
// gates background persistence for normal pipelines. History/undo still work
// locally regardless — only the network save is gated.
function canPersist(s) {
  return !!s.pipelineId && !s.readOnly && s.autoSave;
}

export const useStore = create((set, get) => ({
  // ── Pipeline metadata ────────────────────────────────────────────────
  pipelineId:     null,
  pipelineName:   'New Pipeline',
  pipelineStatus: 'draft',

  // ── Canvas state ──────────────────────────────────────────────────
  nodes: [],
  edges: [],
  nodeIDs: {},

  // ── Undo/Redo history ─────────────────────────────────────────────
  _history: [{ nodes: [], edges: [] }],
  _historyIndex: 0,

  // ── Canvas settings (loaded from workspace settings) ──────────────
  snapToGrid: true,
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  autoSave: true,
  setAutoSave: (v) => set({ autoSave: v }),

  // True when the loaded pipeline is a read-only starter template (no owner).
  readOnly: false,

  // ── Selection ─────────────────────────────────────────────────────
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // ── Loading state ─────────────────────────────────────────────────
  loading: false,

  // ── Load a pipeline from backend ──────────────────────────────────
  loadPipeline: async (id) => {
    set({ loading: true });
    try {
      const [meta, canvas] = await Promise.all([
        db.getPipeline(id),
        db.loadCanvas(id),
      ]);
      db.setCurrentPipelineId(id);
      const nodes = canvas.nodes ?? [];
      const edges = canvas.edges ?? [];
      // Server templates carry an explicit ownerId === null; localStorage-only
      // pipelines have no ownerId key at all and must stay editable.
      const readOnly = !!meta && 'ownerId' in meta && meta.ownerId === null;
      set({
        pipelineId:     id,
        pipelineName:   meta?.name   ?? 'New Pipeline',
        pipelineStatus: meta?.status ?? 'draft',
        readOnly,
        nodes,
        edges,
        nodeIDs:        {},
        selectedNodeId: null,
        loading:        false,
        _history:       [{ nodes, edges }],
        _historyIndex:  0,
      });
    } catch {
      set({ loading: false });
    }
  },

  // ── Create + load a new pipeline ──────────────────────────────────
  newPipeline: async () => {
    set({ loading: true });
    try {
      const pipeline = await db.createPipeline();
      db.setCurrentPipelineId(pipeline.id);
      set({
        pipelineId:     pipeline.id,
        pipelineName:   pipeline.name,
        pipelineStatus: 'draft',
        readOnly:       false,
        nodes:          [],
        edges:          [],
        nodeIDs:        {},
        selectedNodeId: null,
        loading:        false,
        _history:       [{ nodes: [], edges: [] }],
        _historyIndex:  0,
      });
      return pipeline;
    } catch {
      set({ loading: false });
    }
  },

  // ── Rename current pipeline ───────────────────────────────────────
  renamePipeline: (name) => {
    const { pipelineId, readOnly } = get();
    if (pipelineId && !readOnly) db.updatePipeline(pipelineId, { name });
    set({ pipelineName: name });
  },

  // ── Immediate save (Cmd+S — explicit, ignores autoSave but not readOnly) ──
  savePipeline: () => {
    const { pipelineId, readOnly, nodes, edges } = get();
    if (pipelineId && !readOnly) {
      clearTimeout(saveTimer);
      db.saveCanvas(pipelineId, { nodes, edges });
    }
  },

  // ── Clear canvas ───────────────────────────────────────────────────
  clearCanvas: () => {
    set((s) => {
      if (s.pipelineId && !s.readOnly) db.saveCanvas(s.pipelineId, { nodes: [], edges: [] });
      return { nodes: [], edges: [], nodeIDs: {}, selectedNodeId: null, ...pushHistory(s, [], []) };
    });
  },

  // ── Node ID generator ──────────────────────────────────────────────
  getNodeID: (type) => {
    const ids = { ...get().nodeIDs };
    ids[type] = (ids[type] ?? 0) + 1;
    set({ nodeIDs: ids });
    return `${type}-${ids[type]}`;
  },

  // ── ReactFlow callbacks ────────────────────────────────────────────
  addNode: (node) => {
    set((s) => {
      const nodes = [...s.nodes, node];
      if (canPersist(s)) debouncedSave(s.pipelineId, nodes, s.edges);
      return { nodes, ...pushHistory(s, nodes, s.edges) };
    });
  },

  onNodesChange: (changes) => {
    const hasDelete = changes.some((c) => c.type === 'remove');
    if (hasDelete) {
      _pendingNodeDelete = true;
      Promise.resolve().then(() => { _pendingNodeDelete = false; });
    }
    set((s) => {
      const nodes = applyNodeChanges(changes, s.nodes);
      if (canPersist(s)) debouncedSave(s.pipelineId, nodes, s.edges);
      return hasDelete ? { nodes, ...pushHistory(s, nodes, s.edges) } : { nodes };
    });
  },

  onEdgesChange: (changes) => {
    set((s) => {
      const hasDelete = changes.some((c) => c.type === 'remove');
      const edges = applyEdgeChanges(changes, s.edges);
      if (canPersist(s)) debouncedSave(s.pipelineId, s.nodes, edges);
      // Skip history push when edges are removed as a cascade from node deletion
      return (hasDelete && !_pendingNodeDelete) ? { edges, ...pushHistory(s, s.nodes, edges) } : { edges };
    });
  },

  onConnect: (connection) => {
    set((s) => {
      const edges = addEdge({ ...connection, type: 'smoothstep' }, s.edges);
      if (canPersist(s)) debouncedSave(s.pipelineId, s.nodes, edges);
      return { edges, ...pushHistory(s, s.nodes, edges) };
    });
  },

  updateNodeField: (nodeId, fieldName, fieldValue) => {
    set((s) => {
      const nodes = s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, [fieldName]: fieldValue } } : n
      );
      if (canPersist(s)) debouncedSave(s.pipelineId, nodes, s.edges);
      return { nodes };
    });
  },

  // Called by ReactFlow's onNodeDragStop to snapshot dragged positions
  snapshotForDrag: () => {
    set((s) => pushHistory(s, s.nodes, s.edges));
  },

  // ── Delete a node by id (used by InspectorPanel delete button) ──────
  deleteNode: (nodeId) => {
    set((s) => {
      const nodes = s.nodes.filter((n) => n.id !== nodeId);
      const edges = s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      if (canPersist(s)) debouncedSave(s.pipelineId, nodes, edges);
      return { nodes, edges, selectedNodeId: null, ...pushHistory(s, nodes, edges) };
    });
  },

  // ── Undo / Redo ────────────────────────────────────────────────────
  undo: () => {
    const { _history, _historyIndex, pipelineId } = get();
    if (_historyIndex <= 0) return;
    const idx = _historyIndex - 1;
    const { nodes, edges } = _history[idx];
    if (canPersist(get())) debouncedSave(pipelineId, nodes, edges);
    set({ nodes, edges, _historyIndex: idx, selectedNodeId: null });
  },

  redo: () => {
    const { _history, _historyIndex, pipelineId } = get();
    if (_historyIndex >= _history.length - 1) return;
    const idx = _historyIndex + 1;
    const { nodes, edges } = _history[idx];
    if (canPersist(get())) debouncedSave(pipelineId, nodes, edges);
    set({ nodes, edges, _historyIndex: idx, selectedNodeId: null });
  },

  // ── Deploy current pipeline ────────────────────────────────────────
  deployPipeline: async (environment = 'staging') => {
    const { pipelineId, readOnly } = get();
    if (!pipelineId) throw new Error('No pipeline loaded');
    if (readOnly) throw new Error('Starter templates are read-only. Duplicate it to deploy.');
    const deployment = await db.createDeployment(pipelineId, environment);
    set({ pipelineStatus: 'live' });
    return deployment;
  },
}));
