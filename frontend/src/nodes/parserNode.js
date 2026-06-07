// parserNode.js
// Extracts structured fields from raw LLM text output.
// Each field name becomes a labeled source handle — completes the pipeline story:
// Input → PromptTemplate → LLM → Parser → Output

import { useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode, getHandleStyle } from './BaseNode';

export const ParserNode = ({ id, data }) => {
  const [fieldText, setFieldText] = useState(data?.fieldText || 'name\nemail\nsummary');
  const updateNodeField = useStore((state) => state.updateNodeField);

  const fields = useMemo(() => {
    return fieldText.split('\n').map((f) => f.trim()).filter(Boolean);
  }, [fieldText]);

  return (
    <BaseNode id={id} title="Parser" color="#fb7185" style={{ minWidth: 200 }}>
      <Handle type="target" position={Position.Left} id={`${id}-raw`} />
      <div className="node-field">
        <label className="node-label">Fields (one per line)</label>
        <textarea
          className="node-textarea nodrag"
          value={fieldText}
          onChange={(e) => {
            setFieldText(e.target.value);
            updateNodeField(id, 'fieldText', e.target.value);
          }}
          rows={3}
          placeholder={'name\nemail\nsummary'}
        />
      </div>
      {fields.map((field, i) => (
        <Handle
          key={field}
          type="source"
          position={Position.Right}
          id={`${id}-${field}`}
          style={getHandleStyle(i, fields.length)}
        />
      ))}
    </BaseNode>
  );
};
