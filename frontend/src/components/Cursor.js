import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function Cursor() {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const scale = useMotionValue(1);

  const x  = useSpring(mx,    { stiffness: 700, damping: 38, mass: 0.4 });
  const y  = useSpring(my,    { stiffness: 700, damping: 38, mass: 0.4 });
  const sc = useSpring(scale, { stiffness: 400, damping: 28 });

  useEffect(() => {
    const move = (e) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el?.closest('a, button, [role="button"], input, textarea, select, label');
      scale.set(interactive ? 2.5 : 1);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, [mx, my, scale]);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: 5, height: 5,
        borderRadius: '50%',
        background: 'rgba(168, 85, 247, 0.55)',
        pointerEvents: 'none',
        zIndex: 99999,
        x, y, scale: sc,
        translateX: '-50%',
        translateY: '-50%',
        mixBlendMode: 'normal',
      }}
    />
  );
}
