// ui.js

import { useState, useRef, useCallback } from 'react';
import ReactFlow, { Controls, Background } from 'reactflow';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { nodeTypes } from './nodes/index';
import CanvasBackground from './components/CanvasBackground';
import EmptyCanvas from './components/EmptyCanvas';

import 'reactflow/dist/style.css';

const gridSize = 24;
const proOptions = { hideAttribution: true };

const selector = (state) => ({
  nodes:             state.nodes,
  edges:             state.edges,
  snapToGrid:        state.snapToGrid,
  getNodeID:         state.getNodeID,
  addNode:           state.addNode,
  onNodesChange:     state.onNodesChange,
  onEdgesChange:     state.onEdgesChange,
  onConnect:         state.onConnect,
  setSelectedNodeId: state.setSelectedNodeId,
  snapshotForDrag:   state.snapshotForDrag,
});

export const PipelineUI = () => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const {
    nodes,
    edges,
    snapToGrid,
    getNodeID,
    addNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    snapshotForDrag,
  } = useStore(useShallow(selector));

  const getInitNodeData = (nodeID, type) => ({ id: nodeID, nodeType: type });

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;
      const { nodeType: type } = JSON.parse(data);
      if (!type) return;

      // screenToFlowPosition replaces deprecated project() — takes absolute screen coords,
      // no bounds subtraction needed
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeID = getNodeID(type);
      addNode({ id: nodeID, type, position, data: getInitNodeData(nodeID, type) });
    },
    [reactFlowInstance, getNodeID, addNode]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div ref={reactFlowWrapper} className="canvas-wrapper">
      <CanvasBackground />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={setReactFlowInstance}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={snapshotForDrag}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        deleteKeyCode={['Backspace', 'Delete']}
        connectionLineType="smoothstep"
        fitView
      >
        <Background
          variant="dots"
          gap={gridSize}
          size={1}
          color="#1C2028"
        />
        <Controls />
      </ReactFlow>

      {/* Empty canvas hint — position:absolute, inset:0, sits above ReactFlow */}
      <EmptyCanvas />
    </div>
  );
};
