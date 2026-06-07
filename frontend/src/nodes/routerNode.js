// routerNode.js
// Semantic router — classifies input and routes to one of N labeled outputs.
// Demonstrates the same dynamic handle mechanic as TextNode but for outputs.

import { useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode, getHandleStyle } from './BaseNode';

export const RouterNode = ({ id, data }) => {
  const [routeText, setRouteText] = useState(data?.routeText || 'general\ntechnical\ncreative');
  const updateNodeField = useStore((state) => state.updateNodeField);

  const routes = useMemo(() => {
    return routeText.split('\n').map((r) => r.trim()).filter(Boolean);
  }, [routeText]);

  return (
    <BaseNode id={id} title="Router" color="#3b82f6" style={{ minWidth: 200 }}>
      <Handle type="target" position={Position.Left} id={`${id}-input`} />
      <div className="node-field">
        <label className="node-label">Routes (one per line)</label>
        <textarea
          className="node-textarea nodrag"
          value={routeText}
          onChange={(e) => {
            setRouteText(e.target.value);
            updateNodeField(id, 'routeText', e.target.value);
          }}
          rows={3}
          placeholder={'general\ntechnical\ncreative'}
        />
      </div>
      {routes.map((route, i) => (
        <Handle
          key={route}
          type="source"
          position={Position.Right}
          id={`${id}-${route}`}
          style={getHandleStyle(i, routes.length)}
        />
      ))}
    </BaseNode>
  );
};
