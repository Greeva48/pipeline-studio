// CommandPalette.js
// Global CMD+K overlay for Studio.
// Keyboard: ↑↓ navigate, Enter execute, Esc close.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

const COMMANDS = [
  /* Navigate */
  { id: 'go-dashboard',    group: 'Navigate',  label: 'Open Dashboard',     shortcut: null,   action: 'navigate', to: '/dashboard'  },
  { id: 'go-projects',     group: 'Navigate',  label: 'Open Projects',      shortcut: null,   action: 'navigate', to: '/projects'   },
  { id: 'go-deployments',  group: 'Navigate',  label: 'Open Deployments',   shortcut: null,   action: 'navigate', to: '/deployments'},
  { id: 'go-validation',   group: 'Navigate',  label: 'Open Validation',    shortcut: null,   action: 'navigate', to: '/validation' },
  /* Pipeline */
  { id: 'validate',        group: 'Pipeline',  label: 'Validate Pipeline',  shortcut: 'V',    action: 'validate'  },
  { id: 'undo',            group: 'Pipeline',  label: 'Undo',               shortcut: '⌘Z',   action: 'undo'      },
  { id: 'redo',            group: 'Pipeline',  label: 'Redo',               shortcut: '⌘⇧Z',  action: 'redo'      },
  { id: 'clear-canvas',    group: 'Pipeline',  label: 'Clear Canvas',       shortcut: null,   action: 'clear'     },
  /* Nodes */
  { id: 'add-input',       group: 'Add Node',  label: 'Add Input',          shortcut: null,   action: 'add-node', nodeType: 'customInput'    },
  { id: 'add-llm',         group: 'Add Node',  label: 'Add LLM',            shortcut: null,   action: 'add-node', nodeType: 'llm'            },
  { id: 'add-output',      group: 'Add Node',  label: 'Add Output',         shortcut: null,   action: 'add-node', nodeType: 'customOutput'   },
  { id: 'add-prompt',      group: 'Add Node',  label: 'Add Prompt Template',shortcut: null,   action: 'add-node', nodeType: 'promptTemplate' },
  { id: 'add-text',        group: 'Add Node',  label: 'Add Text',           shortcut: null,   action: 'add-node', nodeType: 'text'           },
  { id: 'add-vector',      group: 'Add Node',  label: 'Add Vector Search',  shortcut: null,   action: 'add-node', nodeType: 'vectorSearch'   },
  { id: 'add-router',      group: 'Add Node',  label: 'Add Router',         shortcut: null,   action: 'add-node', nodeType: 'router'         },
  { id: 'add-memory',      group: 'Add Node',  label: 'Add Memory',         shortcut: null,   action: 'add-node', nodeType: 'memory'         },
  { id: 'add-parser',      group: 'Add Node',  label: 'Add Parser',         shortcut: null,   action: 'add-node', nodeType: 'parser'         },
];

export default function CommandPalette({ open, onClose, onValidate, onClearCanvas, onUndo, onRedo }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { getNodeID, addNode } = useStore(
    useShallow(s => ({ getNodeID: s.getNodeID, addNode: s.addNode }))
  );

  const filtered = query
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  /* Keep cursor in range */
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(Math.max(0, filtered.length - 1));
  }, [filtered.length, cursor]);

  const execute = useCallback((cmd) => {
    onClose();
    if (cmd.action === 'navigate') {
      navigate(cmd.to);
    } else if (cmd.action === 'validate') {
      onValidate?.();
    } else if (cmd.action === 'undo') {
      onUndo?.();
    } else if (cmd.action === 'redo') {
      onRedo?.();
    } else if (cmd.action === 'clear') {
      onClearCanvas?.();
    } else if (cmd.action === 'add-node') {
      const id = getNodeID(cmd.nodeType);
      addNode({ id, type: cmd.nodeType, position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 }, data: { id, nodeType: cmd.nodeType } });
    }
  }, [onClose, navigate, onValidate, onUndo, onRedo, onClearCanvas, getNodeID, addNode]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && filtered[cursor]) { execute(filtered[cursor]); }
  };

  if (!open) return null;

  /* Group results */
  const groups = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '18vh',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-base)',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'palette-enter 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.5" stroke="#F5F7FA" strokeWidth="1.3"/>
            <path d="M10 10l2.5 2.5" stroke="#F5F7FA" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands…"
            style={{
              flex: 1, height: 48, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--text-primary)',
            }}
          />
          <kbd style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            padding: '2px 6px', background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-base)', borderRadius: '2px',
            color: 'var(--text-tertiary)', flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{
              padding: '24px', textAlign: 'center',
              fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)',
            }}>
              No commands found.
            </div>
          )}

          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group}>
              <div style={{
                padding: '6px 16px 3px',
                fontFamily: 'Space Mono, monospace', fontSize: '9px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}>
                {group}
              </div>
              {cmds.map(cmd => {
                const idx = globalIdx++;
                const active = idx === cursor;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setCursor(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', cursor: 'pointer',
                      background: active ? 'var(--bg-surface-3)' : 'transparent',
                      transition: 'background 0.08s',
                    }}
                  >
                    <span style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '13px',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      flex: 1,
                    }}>
                      {cmd.label}
                    </span>
                    {cmd.shortcut && (
                      <kbd style={{
                        fontFamily: 'Space Mono, monospace', fontSize: '10px',
                        padding: '1px 6px',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-base)',
                        borderRadius: '2px',
                        color: 'var(--text-tertiary)',
                      }}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
