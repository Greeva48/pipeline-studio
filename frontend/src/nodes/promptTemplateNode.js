// promptTemplateNode.js
// Parameterized prompt with system + user sections and {{variable}} input handles.
// Most domain-relevant node for an AI pipeline builder.

import { useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode, getHandleStyle } from './BaseNode';

export const PromptTemplateNode = ({ id, data }) => {
  const [systemPrompt, setSystemPrompt] = useState(data?.systemPrompt || 'You are a helpful AI assistant.');
  const [userPrompt, setUserPrompt] = useState(data?.userPrompt || '{{query}}');
  const updateNodeField = useStore((state) => state.updateNodeField);

  const variables = useMemo(() => {
    const combined = `${systemPrompt} ${userPrompt}`;
    const matches = [...combined.matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map((m) => m[1].trim()))];
  }, [systemPrompt, userPrompt]);

  return (
    <BaseNode id={id} title="Prompt Template" color="#ec4899" style={{ minWidth: 240 }}>
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
        <label className="node-label">System</label>
        <textarea
          className="node-textarea nodrag"
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            updateNodeField(id, 'systemPrompt', e.target.value);
          }}
          rows={2}
          placeholder="System instructions..."
        />
      </div>
      <div className="node-field">
        <label className="node-label">User Template</label>
        <textarea
          className="node-textarea nodrag"
          value={userPrompt}
          onChange={(e) => {
            setUserPrompt(e.target.value);
            updateNodeField(id, 'userPrompt', e.target.value);
          }}
          rows={3}
          placeholder="Use {{variable}} for dynamic inputs"
        />
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-prompt`} />
    </BaseNode>
  );
};
