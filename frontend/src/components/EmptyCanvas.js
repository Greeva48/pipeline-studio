// EmptyCanvas.js
// Shown when the ReactFlow canvas has zero nodes.
// pointer-events: none except for the instructional area.

import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

const SUGGESTED = [
  { label: 'Input',  color: '#4ADE80' },
  { label: 'LLM',    color: '#A855F7' },
  { label: 'Output', color: '#F97316' },
];

export default function EmptyCanvas() {
  const nodeCount = useStore(useShallow(s => s.nodes.length));

  if (nodeCount > 0) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        maxWidth: 380,
        textAlign: 'center',
      }}>

        {/* Suggested pipeline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          opacity: 0.35,
        }}>
          {SUGGESTED.map((n, i) => (
            <div key={n.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base)',
                borderRadius: '3px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                position: 'relative',
              }}>
                <div style={{ width: 3, height: 20, background: n.color, borderRadius: 2 }} />
                <span style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: n.color,
                  textTransform: 'uppercase',
                }}>
                  {n.label}
                </span>
              </div>
              {i < SUGGESTED.length - 1 && (
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <line x1="0" y1="6" x2="18" y2="6" stroke="var(--border-active)" strokeWidth="1" strokeDasharray="3 2" />
                  <path d="M15 3l3 3-3 3" stroke="var(--border-active)" strokeWidth="1" strokeLinecap="round" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Headline */}
        <div>
          <p style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-tertiary)',
            margin: '0 0 6px',
          }}>
            Start building your pipeline.
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            opacity: 0.7,
            margin: 0,
            lineHeight: 1.55,
          }}>
            Drag a node from the left panel onto the canvas,<br />
            or press <kbd style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '10px',
              padding: '1px 5px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '2px',
              color: 'var(--text-secondary)',
            }}>⌘K</kbd> to search.
          </p>
        </div>

        {/* Keyboard hints */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: '10px',
          fontFamily: 'Space Mono, monospace',
          color: 'var(--text-tertiary)',
          opacity: 0.5,
        }}>
          <span>V — Validate</span>
          <span>·</span>
          <span>⌘K — Commands</span>
        </div>

      </div>
    </div>
  );
}
