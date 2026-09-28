import { useEffect } from 'react';
import Lenis from 'lenis';

interface LenisScrollerProps {
  children: React.ReactNode;
}

export default function LenisScroller({ children }: LenisScrollerProps) {
  useEffect(() => {
    // Disable on mobile/touch to prevent jank
    if (window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window)) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
