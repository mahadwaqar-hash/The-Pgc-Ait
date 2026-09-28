import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 5) + 1;
      
      // Elegant pause
      if (current > 65 && current < 70) {
        current = 67;
        setTimeout(() => setProgress(67), 400); 
      } else if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setIsComplete(true), 800);
      }
      
      setProgress(current);
    }, 30);

    return () => {
      clearInterval(interval);
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={() => document.body.style.overflow = 'auto'}>
      {!isComplete && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] text-white pointer-events-auto"
        >
          <div className="flex flex-col items-center justify-center gap-12">
            <div className="font-display text-7xl md:text-9xl italic tracking-tighter opacity-90">
              {progress}%
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[10px] font-body tracking-[0.3em] uppercase text-[#555]"
            >
              Curating Experience
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
