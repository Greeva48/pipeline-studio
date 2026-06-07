// toolbar.js

import { useState } from 'react';
import { DraggableNode } from './draggableNode';
import { nodeConfig } from './nodes/index';

const GROUPS = [
  { id: 'io',    label: 'I / O',  types: ['customInput', 'customOutput'] },
  { id: 'ai',    label: 'AI',     types: ['llm', 'promptTemplate']       },
  { id: 'data',  label: 'Data',   types: ['text', 'vectorSearch']        },
  { id: 'logic', label: 'Logic',  types: ['router', 'memory', 'parser']  },
];

const byType = Object.fromEntries(nodeConfig.map((n) => [n.type, n]));

export const PipelineToolbar = () => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // When searching, flatten all nodes and filter; otherwise show grouped
  const isSearching = q.length > 0;
  const allNodes = nodeConfig.filter((n) =>
    n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)
  );

  return (
    <aside className="node-library">

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="sidebar-search">
        <input
          className="sidebar-search__input"
          type="text"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* ── Node list ──────────────────────────────────────── */}
      <div className="node-library__scroll">
        {isSearching ? (
          <div className="node-library__group">
            {allNodes.length === 0 ? (
              <div style={{
                padding: '12px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
              }}>
                No results.
              </div>
            ) : (
              allNodes.map((node) => (
                <DraggableNode
                  key={node.type}
                  type={node.type}
                  label={node.label}
                  color={node.color}
                />
              ))
            )}
          </div>
        ) : (
          GROUPS.map((group) => (
            <div key={group.id} className="node-library__group">
              <div className="node-library__group-label">{group.label}</div>
              {group.types.map((type) => {
                const node = byType[type];
                return node ? (
                  <DraggableNode
                    key={type}
                    type={type}
                    label={node.label}
                    color={node.color}
                  />
                ) : null;
              })}
            </div>
          ))
        )}
      </div>

    </aside>
  );
};
