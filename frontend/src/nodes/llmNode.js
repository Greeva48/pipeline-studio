// llmNode.js
// Calls a language model with a prompt and returns the generated response.

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';

export const LLMNode = ({ id, data }) => {
  const [model,       setModel]       = useState(data?.model       || 'gpt-4o');
  const [temperature, setTemperature] = useState(data?.temperature ?? 0.7);
  const [maxTokens,   setMaxTokens]   = useState(data?.maxTokens   || 1024);
  const updateNodeField = useStore((state) => state.updateNodeField);

  return (
    <BaseNode id={id} title="LLM" color="#a855f7" style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} id={`${id}-prompt`} />
      <div className="node-field">
        <label className="node-label">Model</label>
        <select
          className="node-select nodrag"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            updateNodeField(id, 'model', e.target.value);
          }}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-sonnet-4-6">Claude Sonnet 4</option>
          <option value="claude-opus-4-8">Claude Opus 4</option>
        </select>
      </div>
      <div className="node-field">
        <label className="node-label">Temperature</label>
        <input
          type="number"
          className="node-input nodrag"
          value={temperature}
          min={0}
          max={2}
          step={0.1}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setTemperature(val);
            updateNodeField(id, 'temperature', val);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Max Tokens</label>
        <input
          type="number"
          className="node-input nodrag"
          value={maxTokens}
          min={1}
          max={8192}
          step={1}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setMaxTokens(val);
            updateNodeField(id, 'maxTokens', val);
          }}
        />
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-response`} />
    </BaseNode>
  );
};
