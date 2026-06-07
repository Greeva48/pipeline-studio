// vectorSearchNode.js
// Retrieves semantically similar documents from a vector store.
// Core building block of RAG pipelines — directly relevant to VectorShift's product.

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';

export const VectorSearchNode = ({ id, data }) => {
  const [collection, setCollection] = useState(data?.collection || '');
  const [topK, setTopK] = useState(data?.topK || 5);
  const [metric, setMetric] = useState(data?.metric || 'cosine');
  const updateNodeField = useStore((state) => state.updateNodeField);

  return (
    <BaseNode id={id} title="Vector Search" color="#facc15" style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} id={`${id}-query`} />
      <div className="node-field">
        <label className="node-label">Collection</label>
        <input
          type="text"
          className="node-input nodrag"
          value={collection}
          placeholder="my-collection"
          onChange={(e) => {
            setCollection(e.target.value);
            updateNodeField(id, 'collection', e.target.value);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Top K</label>
        <input
          type="number"
          className="node-input nodrag"
          value={topK}
          min={1}
          max={50}
          onChange={(e) => {
            const val = Number(e.target.value);
            setTopK(val);
            updateNodeField(id, 'topK', val);
          }}
        />
      </div>
      <div className="node-field">
        <label className="node-label">Similarity</label>
        <select
          className="node-select nodrag"
          value={metric}
          onChange={(e) => {
            setMetric(e.target.value);
            updateNodeField(id, 'metric', e.target.value);
          }}
        >
          <option value="cosine">Cosine</option>
          <option value="euclidean">Euclidean</option>
          <option value="dot">Dot Product</option>
        </select>
      </div>
      <Handle type="source" position={Position.Right} id={`${id}-context`} />
    </BaseNode>
  );
};
