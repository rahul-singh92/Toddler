"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconEdit, IconTrash, IconLoader } from "@tabler/icons-react";
import { Todo } from "../../types/todo";

interface TodoContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  todo: Todo | null;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onClose: () => void;
}

export default function TodoContextMenu({
  isVisible,
  position,
  todo,
  onEdit,
  onDelete,
  onClose
}: TodoContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Adjust position to prevent menu from going off-screen
  const getAdjustedPosition = () => {
    if (!isVisible || !menuRef.current) return position;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10;
    }

    // Ensure minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);

    return { x, y };
  };

  const handleEdit = () => {
    if (todo && !isDeleting) {
      onEdit(todo);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (todo && !isDeleting) {
      setIsDeleting(true);
      try {
        await onDelete(todo);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!todo) return null;

  const adjustedPosition = getAdjustedPosition();

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Invisible backdrop */}
          <div className="fixed inset-0 z-[100]" />
          
          {/* Context Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[101] bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg shadow-2xl py-1 min-w-[140px] backdrop-blur-sm"
            style={{
              left: adjustedPosition.x,
              top: adjustedPosition.y,
            }}
          >
            {/* Todo Title Header */}
            <div className="px-3 py-2 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: todo.color }}
                />
                <span className="text-white text-xs font-medium truncate max-w-[100px]" title={todo.title}>
                  {todo.title}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Edit Option */}
              <button
                onClick={handleEdit}
                disabled={isDeleting}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconEdit size={14} className="text-[#C8A2D6]" />
                <span>Edit</span>
              </button>

              {/* Delete Option */}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <IconLoader size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <IconTrash size={14} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>

            {/* Todo Details Footer */}
            <div className="px-3 py-2 border-t border-[#2A2A2A] text-xs text-[#6A6A6A]">
              <div className="flex items-center gap-2">
                <span className="capitalize">{todo.category || 'uncategorized'}</span>
                <span>•</span>
                <span className="capitalize">{todo.priority} priority</span>
                {todo.recurrence?.type !== 'none' && (
                  <>
                    <span>•</span>
                    <span>🔁</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
