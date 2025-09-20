"use client";
import { motion } from "framer-motion";

interface TodoRemovalAnimationProps {
  isVisible: boolean;
  color?: string;
  particleCount?: number;
  type?: 'particles' | 'burst' | 'spiral';
}

export default function TodoRemovalAnimation({ 
  isVisible,
  color = '#C8A2D6',
  particleCount = 8,
  type = 'particles'
}: TodoRemovalAnimationProps) {
  if (!isVisible) return null;

  const renderParticles = () => {
    return Array.from({ length: particleCount }, (_, i) => (
      <motion.div
        key={`particle-${i}`}
        className="absolute w-1 h-1 rounded-full pointer-events-none"
        initial={{ 
          opacity: 0, 
          scale: 0,
          x: 0,
          y: 0
        }}
        animate={{ 
          opacity: [0, 1, 0],
          scale: [0, 1, 0],
          x: [(Math.random() - 0.5) * 60],
          y: [(Math.random() - 0.5) * 60],
        }}
        transition={{
          duration: 0.6,
          delay: i * 0.1,
          ease: "easeOut"
        }}
        style={{
          backgroundColor: color,
          left: '50%',
          top: '50%',
        }}
      />
    ));
  };

  const renderBurst = () => {
    return Array.from({ length: 12 }, (_, i) => {
      return (
        <motion.div
          key={`burst-${i}`}
          className="absolute w-0.5 h-4 pointer-events-none"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ 
            scaleY: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.05,
            ease: "easeOut"
          }}
          style={{
            backgroundColor: color,
            left: '50%',
            top: '50%',
            transformOrigin: '50% 100%',
            rotate: `${i * 30}deg`
          }}
        />
      );
    });
  };

  const renderSpiral = () => {
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * 2 * Math.PI;
      const radius = 30;
      
      return (
        <motion.div
          key={`spiral-${i}`}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: Math.cos(angle) * 5,
            y: Math.sin(angle) * 5
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: Math.cos(angle + Math.PI * 2) * radius,
            y: Math.sin(angle + Math.PI * 2) * radius,
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.1,
            ease: "easeOut"
          }}
          style={{
            backgroundColor: color,
            left: '50%',
            top: '50%',
          }}
        />
      );
    });
  };

  const renderAnimation = () => {
    switch (type) {
      case 'particles':
        return renderParticles();
      case 'burst':
        return renderBurst();
      case 'spiral':
        return renderSpiral();
      default:
        return renderParticles();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {renderAnimation()}
    </div>
  );
}
