"use client";
import React, { useEffect, useState } from "react";

interface InfiniteWalkingLoaderProps {
  speed?: number; // Time in ms for full progress
}

const InfiniteWalkingLoader: React.FC<InfiniteWalkingLoaderProps> = ({
  speed = 2000,
}) => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / speed, 1); // 0 → 1
      setPosition(progress * 100);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [speed]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full mt-10">
      <div className="relative w-72 h-6 bg-gray-200 rounded-full overflow-hidden">
        {/* Progress bar fill */}
        <div
          className="absolute top-0 left-0 h-6 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-100"
          style={{ width: `${position}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Loading your todos...
      </p>
    </div>
  );
};

export default InfiniteWalkingLoader;
