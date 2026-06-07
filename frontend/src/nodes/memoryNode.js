// memoryNode.js
// Stores conversation history for stateful agent pipelines.
// Signals understanding of agent architecture beyond single-turn LLM calls.

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode, getHandleStyle } from './BaseNode';

const INPUT_HANDLES = [
  { id: 'message', label: 'New Message' },
  { id: 'clear', label: 'Clear Signal' },
];

export const MemoryNode = ({ id, data }) => {
  const [sessionKey, setSessionKey] = useState(data?.sessionKey || 'default');
  const [windowSize, setWindowSize] = useState(data?.windowSize || 10);
  const updateNodeField = useStore((state) => state.updateNodeField);

  return (
    <BaseNode id={id} title="Memory" color="#14b8a6">
      {INPUT_HANDLES.map((handle, i) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Left}
          id={`${id}-${handle.id}`}
          style={getHandleStyle(i, INPUT_HANDLES.length)}
        />
      ))}
      <div className="node-field">
        <label className="node-label">Session Key</label>
        <input
          type="text"
          className="node-input nodrag"
          value={sessionKey}
          placeholder="default"
          onChange={(e) => {
            setSessionKey(e.target.value);
            updateNodeField(id, 'sessionKey', e.target.value);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Window Size</label>
        <input
          type="number"
          className="node-input nodrag"
          value={windowSize}
          min={1}
          max={100}
          onChange={(e) => {
            const val = Number(e.target.value);
            setWindowSize(val);
            updateNodeField(id, 'windowSize', val);
          }}
        />
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-history`} />
    </BaseNode>
  );
};
