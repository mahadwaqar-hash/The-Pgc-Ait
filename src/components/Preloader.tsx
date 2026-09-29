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
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] text-white pointer-events-auto"
        >
          <div className="flex flex-col items-center justify-center gap-12 relative w-full h-full max-w-sm mx-auto">
            {/* Animatic Center */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Spinning nodes */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-white/20 rounded-full"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white]" />
                <div className="absolute bottom-1/4 left-0 w-2 h-2 bg-white/60 rounded-full" />
                <div className="absolute bottom-1/4 right-0 w-2 h-2 bg-white/60 rounded-full" />
              </motion.div>
              
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-white/10 rounded-full"
              >
                <div className="absolute top-1/4 right-0 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]" />
                <div className="absolute bottom-1/4 left-0 w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_10px_#38bdf8]" />
              </motion.div>

              {/* Pulsing Core */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-8 h-8 bg-white rounded-full shadow-[0_0_30px_white]"
              />
            </div>

            {/* Connecting Text */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-display text-2xl italic tracking-tighter"
              >
                Establishing Mesh
              </motion.div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 h-1 bg-white/50 rounded-full"
                  />
                ))}
              </div>
            </div>
            
            <motion.div 
              className="absolute bottom-10 text-[10px] font-mono tracking-[0.2em] uppercase text-white/30"
            >
              PGC • {progress}%
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
