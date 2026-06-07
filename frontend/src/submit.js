// submit.js — ValidationBar
// Persistent bottom bar. Always visible. Shows pipeline analysis state.
// Rendered inside .studio-bottom in Studio.js.

import { useState, useEffect } from 'react';

export const ValidationBar = ({ result, loading, error, onDismiss }) => {
  const [timestamp, setTimestamp] = useState(null);

  // Capture timestamp when result or error arrives
  useEffect(() => {
    if (result || error) {
      setTimestamp(new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    }
  }, [result, error]);

  // Derive bottom bar modifier class
  const barMod = loading
    ? 'studio-bottom--loading'
    : result?.is_dag === true
    ? 'studio-bottom--success'
    : result?.is_dag === false || error
    ? 'studio-bottom--error'
    : '';

  // Idle state — no validation run yet
  if (!loading && !result && !error) {
    return (
      <div className={`studio-bottom`}>
        <div className="vbar">
          <span className="vbar__label">Pipeline Analysis</span>
          <div className="vbar__metric">
            <span className="vbar__metric-key">Status</span>
            <span className="vbar__metric-value" style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
              Ready
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`studio-bottom studio-bottom--loading`}>
        <div className="vbar">
          <span className="vbar__label">Pipeline Analysis</span>
          <div className="vbar__status">
            <span className="vbar__status-key">Status</span>
            <span className="vbar__status-value vbar__status-value--loading">
              Analyzing…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`studio-bottom ${barMod}`}>
      <div className="vbar">

        <span className="vbar__label">Pipeline Analysis</span>

        {result && (
          <>
            <div className="vbar__metric">
              <span className="vbar__metric-key">Nodes</span>
              <span className="vbar__metric-value">{result.num_nodes}</span>
            </div>

            <div className="vbar__metric">
              <span className="vbar__metric-key">Edges</span>
              <span className="vbar__metric-value">{result.num_edges}</span>
            </div>

            <div className="vbar__status">
              <span
                className="vbar__dot"
                style={{ background: result.is_dag ? 'var(--status-success)' : 'var(--status-error)' }}
              />
              <span className="vbar__status-key">Status</span>
              <span className={`vbar__status-value ${result.is_dag ? 'vbar__status-value--success' : 'vbar__status-value--error'}`}>
                {result.is_dag ? 'VALID DAG' : 'CYCLE DETECTED'}
              </span>
            </div>
          </>
        )}

        {error && (
          <>
            <div className="vbar__status">
              <span className="vbar__dot" style={{ background: 'var(--status-error)' }} />
              <span className="vbar__status-key">Status</span>
              <span className="vbar__status-value vbar__status-value--error">ERROR</span>
            </div>
            <span className="vbar__error">{error}</span>
          </>
        )}

        {timestamp && (
          <span className="vbar__time">{timestamp}</span>
        )}

        <span className="vbar__spacer" />

        <button className="vbar__dismiss" onClick={onDismiss} title="Clear">
          ✕
        </button>

      </div>
    </div>
  );
};
