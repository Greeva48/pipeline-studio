// textNode.js
// Static or template text value. Supports {{variable}} syntax: each variable
// becomes a dynamic target handle on the left, matching PromptTemplateNode's mechanic
// but for a plain string output rather than a formatted prompt.

import { useState, useMemo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode, getHandleStyle } from './BaseNode';

export const TextNode = ({ id, data }) => {
  const [text, setText] = useState(data?.text || '');
  const updateNodeField = useStore((state) => state.updateNodeField);
  const textareaRef = useRef(null);

  const variables = useMemo(() => {
    const matches = [...text.matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map((m) => m[1].trim()))];
  }, [text]);

  // Auto-resize textarea height to fit content (dynamic resize - assignment requirement)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  return (
    <BaseNode id={id} title="Text" color="#94a3b8" style={{ minWidth: 220 }}>
      {variables.map((variable, i) => (
        <Handle
          key={variable}
          type="target"
          position={Position.Left}
          id={`${id}-${variable}`}
          style={getHandleStyle(i, variables.length)}
        />
      ))}
      <div className="node-field">
        <label className="node-label">Text</label>
        <textarea
          ref={textareaRef}
          className="node-textarea nodrag"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateNodeField(id, 'text', e.target.value);
          }}
          rows={4}
          style={{ resize: 'none', overflow: 'hidden', minHeight: '80px' }}
          placeholder="Enter text or use {{variable}} for dynamic inputs"
        />
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-output`} />
    </BaseNode>
  );
};
