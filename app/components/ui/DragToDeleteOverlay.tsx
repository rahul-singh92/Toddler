"use client";
import { motion, AnimatePresence } from "framer-motion";
import { IconTrash } from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface DragToDeleteOverlayProps {
  isDragging: boolean;
  isOverTrash: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  draggedItemName?: string;
  position?: 'top' | 'center';
  trashSize?: number;
}

export default function DragToDeleteOverlay({
  isDragging,
  isOverTrash,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedItemName = "item",
  position = 'top',
  trashSize = 28
}: DragToDeleteOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const topPosition = position === 'top' ? 'top-12' : 'top-1/2 -translate-y-1/2';

  const overlayContent = (
    <AnimatePresence>
      {isDragging && (
        <>
          {/* Dimming overlay - now with very high z-index */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] pointer-events-none"
          />

          {/* Top red gradient when over trash */}
          <AnimatePresence>
            {isOverTrash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-500/30 to-transparent z-[9999] pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Elegant Trash Zone */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: isOverTrash ? 1.15 : 1,
            }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`fixed ${topPosition} left-1/2 transform -translate-x-1/2 z-[10000]`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Main Trash Icon */}
            <motion.div
              animate={{
                scale: isOverTrash ? 1.1 : 1,
                rotate: isOverTrash ? [0, -3, 3, -3, 0] : 0,
              }}
              transition={{ 
                duration: isOverTrash ? 0.4 : 0.3,
                repeat: isOverTrash ? Infinity : 0,
                ease: "easeInOut"
              }}
              className={`
                p-4 rounded-2xl transition-all duration-300 shadow-xl backdrop-blur-sm
                ${isOverTrash 
                  ? 'bg-red-500/90 shadow-red-500/40' 
                  : 'bg-gray-800/90 hover:bg-gray-700/90 shadow-black/30'
                }
              `}
            >
              {/* Trash Can with Opening Animation */}
              <div className="relative">
                <motion.div
                  animate={{
                    rotateX: isOverTrash ? -15 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ transformOrigin: 'bottom center' }}
                >
                  <IconTrash 
                    size={trashSize} 
                    className={`transition-colors duration-300 ${
                      isOverTrash ? 'text-white' : 'text-gray-300'
                    }`} 
                  />
                </motion.div>
                
                {/* Trash Can Lid */}
                <motion.div
                  animate={{
                    y: isOverTrash ? -3 : 0,
                    rotate: isOverTrash ? -5 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`
                    absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-1 rounded-full
                    ${isOverTrash ? 'bg-white' : 'bg-gray-300'}
                  `}
                />
              </div>
            </motion.div>

            {/* Elegant Text Indicator */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              >
                <motion.div
                  animate={{
                    scale: isOverTrash ? 1.05 : 1,
                  }}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 backdrop-blur-sm
                    ${isOverTrash 
                      ? 'bg-red-500/90 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-gray-800/90 text-gray-200 shadow-lg shadow-black/20'
                    }
                  `}
                >
                  {isOverTrash ? `🗑️ Release to Delete ${draggedItemName}` : `Drop here to delete ${draggedItemName}`}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Subtle Glow Effect */}
            {isOverTrash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1.2 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-red-500/20 rounded-3xl blur-xl -z-10"
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render to document.body using portal
  return createPortal(overlayContent, document.body);
}
