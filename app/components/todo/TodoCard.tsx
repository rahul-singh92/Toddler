"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { IconRepeat } from "@tabler/icons-react";
import { Todo } from "../../types/todo";
import DragToDeleteOverlay from "../ui/DragToDeleteOverlay";
import { useDragToDelete } from "../../hooks/useDragToDelete";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  onDelete?: (todo: Todo) => void; // Optional callback for parent to handle deletion
  instanceDate?: Date;
  stackIndex?: number;
  isStacked?: boolean;
  isExpanded?: boolean;
  totalInStack?: number;
}

export default function TodoCard({
  todo,
  onClick,
  onDelete,
  instanceDate,
  stackIndex = 0,
  isStacked = false,
  isExpanded = false,
  totalInStack = 1
}: TodoCardProps) {
  const [user] = useAuthState(auth);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle todo deletion from Firestore
  const handleTodoDelete = async (todoToDelete: Todo) => {
    if (!user || !todoToDelete.id) {
      console.error("❌ User not authenticated or todo.id is missing");
      return;
    }

    // Extract original todo ID (in case it's a recurring instance)
    const originalTodoId = todoToDelete.id.includes('-') 
      ? todoToDelete.id.split('-')[0] 
      : todoToDelete.id;

    console.log(`🗑️ Deleting todo card: ${todoToDelete.id}, original: ${originalTodoId}`);

    setIsDeleting(true);

    try {
      // Delete the original todo document
      const todoRef = doc(db, 'users', user.uid, 'todos', originalTodoId);
      await deleteDoc(todoRef);

      console.log(`✅ Successfully deleted todo: "${todoToDelete.title}"`);

      // Call parent deletion callback if provided
      if (onDelete) {
        onDelete(todoToDelete);
      }

      // Small delay for smooth animation
      setTimeout(() => {
        setIsDeleting(false);
      }, 500);

    } catch (error: any) {
      console.error("❌ Error deleting todo:", error);
      setIsDeleting(false);
      alert(`Failed to delete todo: ${error?.message || 'Unknown error'}`);
    }
  };

  // Use the drag-to-delete hook
  const {
    isDragging,
    isOverTrash,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragToDelete<Todo>({
    onDelete: handleTodoDelete
  });

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Function to determine if the background color is light or dark
  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Use instanceDate for display if provided (for recurring todos)
  const displayTime = instanceDate || todo.startTime;

  // Determine text color based on background
  const textColor = isLightColor(todo.color) ? '#000000' : '#FFFFFF';
  const timeColor = isLightColor(todo.color) ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

  // Calculate duration and positioning
  const calculateTimeSpan = () => {
    if (!todo.startTime || !todo.endTime) {
      return { height: 'auto', marginBottom: '8px' };
    }

    const startHour = todo.startTime.getHours();
    const endHour = todo.endTime.getHours();
    const startMinutes = todo.startTime.getMinutes();
    const endMinutes = todo.endTime.getMinutes();

    // Convert to decimal hours
    const startDecimal = startHour + startMinutes / 60;
    const endDecimal = endHour + endMinutes / 60;
    
    // Calculate duration in hours
    const durationHours = endDecimal - startDecimal;
    
    // Each hour slot is 64px (h-16 = 4rem = 64px) + 16px gap (space-y-4)
    const pixelsPerHour = 64 + 16; // 80px total per hour
    const totalHeight = durationHours * pixelsPerHour - 16; // Subtract gap for last item
    
    return {
      height: `${Math.max(totalHeight, 64)}px`, // Minimum height of one slot
      marginBottom: '0px' // No margin since it spans multiple slots
    };
  };

  const timeSpan = calculateTimeSpan();

  // Stack positioning logic
  const getStackStyles = () => {
    if (!isStacked) return {};
    
    if (isExpanded) {
      // Fan-out positioning when expanded - spread horizontally
      const fanDistance = (stackIndex - (totalInStack - 1) / 2) * 120;
      const fanAngle = (stackIndex - (totalInStack - 1) / 2) * 8;
      
      return {
        transform: `translateX(${fanDistance}px) rotate(${fanAngle}deg)`,
        transformOrigin: 'center bottom',
        zIndex: 60 + stackIndex,
        scale: 1.02
      };
    }
    
    // Stack positioning - cards directly on top with minimal offset
    const stackOffset = stackIndex * 3;
    const depthOffset = stackIndex * -1;
    
    return {
      transform: `translateX(${stackOffset}px) translateY(${depthOffset}px)`,
      zIndex: 20 + stackIndex,
      marginTop: stackIndex === 0 ? '0px' : '-60px'
    };
  };

  const stackStyles = getStackStyles();

  // Handle card click (prevent modal from opening during drag)
  const handleCardClick = () => {
    if (isDragging) return;
    onClick();
  };

  return (
    <>
      {/* Drag-to-delete overlay */}
      <DragToDeleteOverlay
        isDragging={isDragging}
        isOverTrash={isOverTrash}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        draggedItemName="card"
        position="center"
        trashSize={32}
      />

      {/* Motion wrapper for animations */}
      <motion.div 
        layout
        initial={false}
        animate={{
          ...stackStyles,
          scale: isExpanded ? (stackStyles.scale || 1.02) : 1,
          opacity: isDeleting ? 0 : 1
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30,
          duration: 0.3
        }}
        style={{ 
          height: timeSpan.height,
          marginBottom: timeSpan.marginBottom,
          zIndex: stackStyles.zIndex,
          transform: stackStyles.transform,
          marginTop: stackStyles.marginTop
        }}
      >
        {/* Draggable div inside motion wrapper */}
        <div
          draggable={!!todo.id && !isDeleting}
          onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
            if (todo.id && !isDeleting) {
              handleDragStart(e, todo, todo.id);
            }
          }}
          onDragEnd={handleDragEnd}
          className={`
            h-full w-full p-3 rounded-lg shadow-md transition-all duration-200 relative overflow-hidden
            ${(!isDeleting && !!todo.id) 
              ? 'cursor-grab active:cursor-grabbing hover:shadow-xl hover:scale-[1.02]' 
              : 'cursor-pointer'
            }
            ${isDeleting ? 'pointer-events-none' : ''}
          `}
          style={{ 
            backgroundColor: todo.color
          }}
          onClick={handleCardClick}
        >
          {/* Stack indicator - show count on top card */}
          {isStacked && stackIndex === totalInStack - 1 && totalInStack > 1 && !isExpanded && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-bold shadow-lg">
              {totalInStack}
            </div>
          )}

          {/* Recurring indicator */}
          {todo.recurrence?.type !== 'none' && (
            <div className="absolute top-2 right-2">
              <IconRepeat size={10} style={{ color: timeColor }} />
            </div>
          )}

          {/* Drag indicator - subtle dots when draggable */}
          {!!todo.id && !isDeleting && (
            <div className="absolute top-2 left-2 opacity-30 hover:opacity-60 transition-opacity">
              <div className="flex space-x-0.5">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: timeColor }}></div>
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: timeColor }}></div>
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: timeColor }}></div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="h-full flex flex-col">
            {/* Title */}
            <h4 
              className="font-semibold text-sm mb-1 pr-4 pl-4" 
              style={{ 
                color: textColor,
                lineHeight: '1.2'
              }}
            >
              {todo.title}
            </h4>
            
            {/* Time range */}
            <div className="text-xs font-medium mb-2 pl-4" style={{ color: timeColor }}>
              {displayTime && formatTime(displayTime)}
              {todo.endTime && todo.startTime && ` - ${formatTime(todo.endTime)}`}
            </div>

            {/* Description for longer events */}
            {todo.description && timeSpan.height !== 'auto' && parseInt(timeSpan.height) > 100 && 
             (stackIndex === totalInStack - 1 || isExpanded) && (
              <div 
                className="text-xs opacity-75 flex-1 overflow-hidden pl-4"
                style={{ color: timeColor }}
              >
                {todo.description}
              </div>
            )}

            {/* Completion indicator - small dot */}
            {todo.completed && (
              <div 
                className="absolute bottom-2 right-2 w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: isLightColor(todo.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'
                }}
              />
            )}

            {/* Deletion indicator */}
            {isDeleting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                <div className="text-xs font-medium" style={{ color: textColor }}>
                  Deleting...
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
