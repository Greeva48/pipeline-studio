import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function MagneticButton({ children, strength = 0.25, className, style, ...props }) {
  const ref = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 280, damping: 24, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 280, damping: 24, mass: 0.5 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - r.left - r.width  / 2) * strength);
    rawY.set((e.clientY - r.top  - r.height / 2) * strength);
  };

  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.span
      ref={ref}
      style={{ x, y, display: 'inline-block', ...style }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      {...props}
    >
      {children}
    </motion.span>
  );
}
