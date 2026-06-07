// LiveGraph.js
// Canvas-based animated pipeline graph — requestAnimationFrame particle system.
// 60fps. Particles travel bezier edges. Nodes pulse. Connection points flash on arrival.

import { useEffect, useRef } from 'react';

const NODES = [
  { id: 'input',  label: 'INPUT',  subtitle: 'customInput_01',    color: '#4ADE80', rx: 0.10,  ry: 0.50, phase: 0.00 },
  { id: 'prompt', label: 'PROMPT', subtitle: 'promptTemplate_01', color: '#EC4899', rx: 0.375, ry: 0.26, phase: 1.26 },
  { id: 'memory', label: 'MEMORY', subtitle: 'memory_01',         color: '#14B8A6', rx: 0.375, ry: 0.74, phase: 2.51 },
  { id: 'llm',    label: 'LLM',    subtitle: 'llm_01',            color: '#A855F7', rx: 0.645, ry: 0.50, phase: 3.77 },
  { id: 'output', label: 'OUTPUT', subtitle: 'customOutput_01',   color: '#F97316', rx: 0.90,  ry: 0.50, phase: 5.03 },
];

const EDGES = [
  { from: 'input',  to: 'prompt', color: '#4ADE80', speed: 0.0016, count: 2 },
  { from: 'input',  to: 'memory', color: '#4ADE80', speed: 0.0014, count: 2 },
  { from: 'prompt', to: 'llm',    color: '#EC4899', speed: 0.0018, count: 2 },
  { from: 'memory', to: 'llm',    color: '#14B8A6', speed: 0.0017, count: 2 },
  { from: 'llm',    to: 'output', color: '#A855F7', speed: 0.0020, count: 3 },
];

function cbez(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
    y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
  };
}

function hexA(hex, alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return hex + a;
}

function rrect(ctx, x, y, w, h, r) {
  if (Array.isArray(r)) {
    const [tl, tr, br, bl] = r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x, y, x + tl, y, tl);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function nodeRect(node, W, H) {
  const nw = Math.max(100, Math.min(128, W * 0.13));
  const nh = 38;
  return { x: node.rx * W - nw * 0.5, y: node.ry * H - nh * 0.5, w: nw, h: nh };
}

function handles(node, W, H) {
  const r = nodeRect(node, W, H);
  return {
    L: { x: r.x,       y: r.y + r.h * 0.5 },
    R: { x: r.x + r.w, y: r.y + r.h * 0.5 },
  };
}

function edgePath(fromN, toN, W, H) {
  const a = handles(fromN, W, H).R;
  const b = handles(toN,   W, H).L;
  const dx = b.x - a.x;
  const bend = dx * 0.42;
  return { p0: a, p1: { x: a.x + bend, y: a.y }, p2: { x: b.x - bend, y: b.y }, p3: b };
}

function drawNode(ctx, node, W, H, t, pulseMap) {
  const { x, y, w, h } = nodeRect(node, W, H);
  const breathe = 0.35 + 0.3 * Math.sin(t * 0.006 + node.phase);
  const pulseAge = pulseMap[node.id] ?? Infinity;
  const pulseStr = pulseAge < 60 ? Math.max(0, 1 - pulseAge / 60) : 0;

  // Ambient glow (breathing)
  const glowA = breathe * 0.06 + pulseStr * 0.22;
  if (glowA > 0.005) {
    const rad = Math.max(w, h) * 1.1;
    const grd = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, rad);
    grd.addColorStop(0, hexA(node.color, glowA));
    grd.addColorStop(1, hexA(node.color, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(x - rad * 0.5, y - rad * 0.5, w + rad, h + rad);
  }

  // Background
  ctx.fillStyle = '#0F141A';
  rrect(ctx, x, y, w, h, 3);
  ctx.fill();

  // Border — breathes
  ctx.strokeStyle = `rgba(37,45,56,${0.5 + 0.5 * breathe + pulseStr * 0.4})`;
  ctx.lineWidth = 1;
  rrect(ctx, x, y, w, h, 3);
  ctx.stroke();

  // Accent bar left
  ctx.fillStyle = hexA(node.color, 0.85 + pulseStr * 0.15);
  rrect(ctx, x, y, 3, h, [3, 0, 0, 3]);
  ctx.fill();

  // Label
  ctx.font = `700 8px 'Space Grotesk', system-ui, sans-serif`;
  ctx.fillStyle = hexA(node.color, 0.9 + pulseStr * 0.1);
  ctx.textAlign = 'left';
  ctx.fillText(node.label, x + 10, y + 14);

  // Subtitle
  ctx.font = `400 7px 'Space Mono', monospace`;
  ctx.fillStyle = 'rgba(55,65,81,0.9)';
  ctx.fillText(node.subtitle, x + 10, y + 27);

  // Handle circles
  const hs = handles(node, W, H);
  [hs.L, hs.R].forEach(hh => {
    ctx.beginPath();
    ctx.arc(hh.x, hh.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#252D38';
    ctx.fill();
    ctx.strokeStyle = '#0F141A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawEdge(ctx, edge, W, H) {
  const fromN = NODES.find(n => n.id === edge.from);
  const toN   = NODES.find(n => n.id === edge.to);
  const p = edgePath(fromN, toN, W, H);
  ctx.beginPath();
  ctx.moveTo(p.p0.x, p.p0.y);
  ctx.bezierCurveTo(p.p1.x, p.p1.y, p.p2.x, p.p2.y, p.p3.x, p.p3.y);
  ctx.setLineDash([3.5, 3]);
  ctx.strokeStyle = 'rgba(37,45,56,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawParticle(ctx, p, W, H) {
  const edge  = EDGES[p.ei];
  const fromN = NODES.find(n => n.id === edge.from);
  const toN   = NODES.find(n => n.id === edge.to);
  const path  = edgePath(fromN, toN, W, H);
  const pt    = cbez(path.p0, path.p1, path.p2, path.p3, p.t);

  let alpha = 1;
  if (p.t < 0.07) alpha = p.t / 0.07;
  else if (p.t > 0.93) alpha = (1 - p.t) / 0.07;

  // Main particle
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, p.size ?? 2.4, 0, Math.PI * 2);
  ctx.fillStyle = hexA(edge.color, alpha * 0.95);
  ctx.fill();

  // Trailing glow
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, (p.size ?? 2.4) * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = hexA(edge.color, alpha * 0.12);
  ctx.fill();
}

export default function LiveGraph({ className, style }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const gridRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    // Build particle array
    const particles = [];
    EDGES.forEach((edge, ei) => {
      for (let i = 0; i < edge.count; i++) {
        particles.push({
          ei,
          t: i / edge.count,
          speed: edge.speed * (0.85 + Math.random() * 0.3),
          size: 2 + Math.random() * 0.8,
        });
      }
    });

    // pulseMap: nodeId → frames since last particle arrived
    const pulseMap = {};

    stateRef.current = { particles, t: 0, W: 0, H: 0, pulseMap };

    function buildGrid(logW, logH) {
      const gc = document.createElement('canvas');
      gc.width  = Math.ceil(logW * dpr);
      gc.height = Math.ceil(logH * dpr);
      const gx = gc.getContext('2d');
      gx.scale(dpr, dpr);
      const step = 24;
      gx.fillStyle = 'rgba(26,32,48,0.5)';
      for (let x = step; x < logW; x += step) {
        for (let y = step; y < logH; y += step) {
          gx.beginPath();
          gx.arc(x, y, 0.9, 0, Math.PI * 2);
          gx.fill();
        }
      }
      gridRef.current = gc;
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width || 400;
      H = rect.height || 220;
      canvas.width  = Math.ceil(W * dpr);
      canvas.height = Math.ceil(H * dpr);
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      if (stateRef.current) { stateRef.current.W = W; stateRef.current.H = H; }
      buildGrid(W, H);
    }

    resize();

    function render() {
      const state = stateRef.current;
      if (!state || !state.W) { rafRef.current = requestAnimationFrame(render); return; }

      const { particles: parts, t: tick, W: lW, H: lH, pulseMap: pm } = state;
      const ctx = canvas.getContext('2d');

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lW, lH);

      if (gridRef.current) ctx.drawImage(gridRef.current, 0, 0, lW, lH);

      EDGES.forEach(e => drawEdge(ctx, e, lW, lH));

      // Age pulse events
      Object.keys(pm).forEach(k => { pm[k] = (pm[k] ?? 0) + 1; });

      // Update + draw particles; fire pulse when particle reaches destination
      parts.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) {
          p.t -= 1;
          // Fire pulse on destination node
          const destId = EDGES[p.ei].to;
          pm[destId] = 0;
        }
        drawParticle(ctx, p, lW, lH);
      });

      NODES.forEach(n => drawNode(ctx, n, lW, lH, tick, pm));

      // Label
      ctx.font = `400 8px 'Space Mono', monospace`;
      ctx.fillStyle = 'rgba(37,45,56,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText('PIPELINE_GRAPH / DAG', lW - 8, lH - 6);
      ctx.textAlign = 'left';

      state.t++;
      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      stateRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
}
