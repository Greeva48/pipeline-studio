import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  enter: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, y: -8, filter: 'blur(2px)',
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

export default function PageTransition({ children, style }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ width: '100%', ...style }}
    >
      {children}
    </motion.div>
  );
}
