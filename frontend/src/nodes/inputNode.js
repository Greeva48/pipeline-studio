// inputNode.js
// Defines a named input variable that enters the pipeline from the outside world.

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';

export const InputNode = ({ id, data }) => {
  const [inputName, setInputName] = useState(data?.inputName || 'input_1');
  const [inputType, setInputType] = useState(data?.inputType || 'text');
  const updateNodeField = useStore((state) => state.updateNodeField);

  return (
    <BaseNode id={id} title="Input" color="#4ade80">
      <div className="node-field">
        <label className="node-label">Name</label>
        <input
          type="text"
          className="node-input nodrag"
          value={inputName}
          placeholder="input_1"
          onChange={(e) => {
            setInputName(e.target.value);
            updateNodeField(id, 'inputName', e.target.value);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Type</label>
        <select
          className="node-select nodrag"
          value={inputType}
          onChange={(e) => {
            setInputType(e.target.value);
            updateNodeField(id, 'inputType', e.target.value);
          }}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="file">File</option>
        </select>
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-value`} />
    </BaseNode>
  );
};
