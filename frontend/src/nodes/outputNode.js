// outputNode.js
// Defines a named output variable — the terminal sink of a pipeline branch.

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';

export const OutputNode = ({ id, data }) => {
  const [outputName, setOutputName] = useState(data?.outputName || 'output_1');
  const [outputType, setOutputType] = useState(data?.outputType || 'text');
  const updateNodeField = useStore((state) => state.updateNodeField);

  return (
    <BaseNode id={id} title="Output" color="#f97316">
      <Handle type="target" position={Position.Left} id={`${id}-value`} />
      <div className="node-field">
        <label className="node-label">Name</label>
        <input
          type="text"
          className="node-input nodrag"
          value={outputName}
          placeholder="output_1"
          onChange={(e) => {
            setOutputName(e.target.value);
            updateNodeField(id, 'outputName', e.target.value);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Type</label>
        <select
          className="node-select nodrag"
          value={outputType}
          onChange={(e) => {
            setOutputType(e.target.value);
            updateNodeField(id, 'outputType', e.target.value);
          }}
        >
          <option value="text">Text</option>
          <option value="json">JSON</option>
          <option value="image">Image</option>
          <option value="file">File</option>
        </select>
      </div>
    </BaseNode>
  );
};
