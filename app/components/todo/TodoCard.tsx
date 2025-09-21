"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { IconRepeat } from "@tabler/icons-react";
import { Todo } from "../../types/todo";
import DragToDeleteOverlay from "../ui/DragToDeleteOverlay";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  onDelete?: (todo: Todo) => void;
  onContextMenu?: (event: React.MouseEvent, todo: Todo) => void; // ✅ ADD THIS
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
  onContextMenu, // ✅ ADD THIS
  instanceDate,
  stackIndex = 0,
  isStacked = false,
  isExpanded = false,
  totalInStack = 1
}: TodoCardProps) {
  const [user] = useAuthState(auth);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Manual drag state management
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Handle todo deletion from Firestore
  const handleTodoDelete = async (todoToDelete: Todo) => {
    if (!user || !todoToDelete.id) {
      console.error("❌ User not authenticated or todo.id is missing");
      return;
    }

    const originalTodoId = todoToDelete.id.includes('-') 
      ? todoToDelete.id.split('-')[0] 
      : todoToDelete.id;

    console.log(`🗑️ Deleting todo card: ${todoToDelete.id}, original: ${originalTodoId}`);

    setIsDeleting(true);

    try {
      const todoRef = doc(db, 'users', user.uid, 'todos', originalTodoId);
      await deleteDoc(todoRef);

      console.log(`✅ Successfully deleted todo: "${todoToDelete.title}"`);

      if (onDelete) {
        onDelete(todoToDelete);
      }

      setTimeout(() => {
        setIsDeleting(false);
      }, 500);

    } catch (error: any) {
      console.error("❌ Error deleting todo:", error);
      setIsDeleting(false);
      alert(`Failed to delete todo: ${error?.message || 'Unknown error'}`);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const displayTime = instanceDate || todo.startTime;
  const textColor = isLightColor(todo.color) ? '#000000' : '#FFFFFF';
  const timeColor = isLightColor(todo.color) ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

  const calculateTimeSpan = () => {
    if (!todo.startTime || !todo.endTime) {
      return { height: 'auto', marginBottom: '8px' };
    }

    const startHour = todo.startTime.getHours();
    const endHour = todo.endTime.getHours();
    const startMinutes = todo.startTime.getMinutes();
    const endMinutes = todo.endTime.getMinutes();

    const startDecimal = startHour + startMinutes / 60;
    const endDecimal = endHour + endMinutes / 60;
    
    const durationHours = endDecimal - startDecimal;
    
    const pixelsPerHour = 64 + 16; // 80px total per hour
    const totalHeight = durationHours * pixelsPerHour - 16;
    
    return {
      height: `${Math.max(totalHeight, 64)}px`,
      marginBottom: '0px'
    };
  };

  const timeSpan = calculateTimeSpan();

  const getStackStyles = () => {
    if (!isStacked) return {};
    
    if (isExpanded) {
      const fanDistance = (stackIndex - (totalInStack - 1) / 2) * 120;
      const fanAngle = (stackIndex - (totalInStack - 1) / 2) * 8;
      
      return {
        transform: `translateX(${fanDistance}px) rotate(${fanAngle}deg)`,
        transformOrigin: 'center bottom',
        zIndex: 60 + stackIndex,
        scale: 1.02
      };
    }
    
    const stackOffset = stackIndex * 3;
    const depthOffset = stackIndex * -1;
    
    return {
      transform: `translateX(${stackOffset}px) translateY(${depthOffset}px)`,
      zIndex: 20 + stackIndex,
      marginTop: stackIndex === 0 ? '0px' : '-60px'
    };
  };

  const stackStyles = getStackStyles();

  const handleCardClick = () => {
    if (isDragging) return;
    onClick();
  };

  // ✅ ADD RIGHT-CLICK HANDLER
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && !isDragging && !isDeleting) {
      onContextMenu(e, todo);
    }
  };

  // Custom drag start handler that creates card-like drag image
  const createCardDragImage = () => {
    const dragImage = document.createElement('div');
    const cardHeight = timeSpan.height === 'auto' ? 64 : Math.min(parseInt(timeSpan.height), 120);
    const cardWidth = 180;

    dragImage.style.cssText = `
      position: absolute;
      top: -2000px;
      left: -2000px;
      width: ${cardWidth}px;
      height: ${cardHeight}px;
      padding: 12px;
      background: ${todo.color};
      border-radius: 8px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10000;
      transform: rotate(2deg) scale(0.95);
      overflow: hidden;
    `;

    dragImage.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; position: relative;">
        ${todo.recurrence?.type !== 'none' ? `<div style="position: absolute; top: 0; right: 0; font-size: 8px; opacity: 0.7;">🔁</div>` : ''}
        <div style="position: absolute; top: 4px; left: 4px; display: flex; gap: 2px; opacity: 0.5;">
          <div style="width: 3px; height: 3px; border-radius: 50%; background: ${timeColor};"></div>
          <div style="width: 3px; height: 3px; border-radius: 50%; background: ${timeColor};"></div>
          <div style="width: 3px; height: 3px; border-radius: 50%; background: ${timeColor};"></div>
        </div>
        <div style="font-size: 14px; font-weight: 600; color: ${textColor}; line-height: 1.2; margin: 12px 12px 4px 12px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${todo.title}
        </div>
        ${displayTime ? `<div style="font-size: 11px; font-weight: 500; color: ${timeColor}; margin: 0 12px 4px 12px;">
          ${formatTime(displayTime)}${todo.endTime && todo.startTime ? ` - ${formatTime(todo.endTime)}` : ''}
        </div>` : ''}
        ${todo.description && cardHeight > 80 ? `<div style="font-size: 11px; color: ${timeColor}; opacity: 0.75; margin: 0 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${todo.description}
        </div>` : ''}
        ${todo.completed ? `<div style="position: absolute; bottom: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: ${isLightColor(todo.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'};"></div>` : ''}
      </div>
    `;

    return dragImage;
  };

  // Manual drag event handlers
  const handleCustomDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!todo.id || isDeleting) return;

    console.log('🎯 Custom drag start called');

    // Set drag data
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.effectAllowed = 'move';

    // Create and set custom drag image SYNCHRONOUSLY
    const dragImage = createCardDragImage();
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
    
    // Clean up drag image
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);

    // Set dragging state
    setIsDragging(true);
    console.log('🔥 Drag state set to true');
  };

  const handleCustomDragEnd = () => {
    console.log('🏁 Drag end called');
    setIsDragging(false);
    setIsOverTrash(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOverTrash(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOverTrash(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('💧 Drop detected');
    
    setIsOverTrash(false);
    setIsDragging(false);
    
    // Delete the todo
    if (todo) {
      handleTodoDelete(todo);
    }
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
          onDragStart={handleCustomDragStart}
          onDragEnd={handleCustomDragEnd}
          onContextMenu={handleRightClick} // ✅ ADD THIS
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
