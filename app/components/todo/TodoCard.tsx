"use client";
import { motion } from "framer-motion";
import { IconRepeat } from "@tabler/icons-react";
import { Todo } from "../../types/todo";

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  instanceDate?: Date;
  stackIndex?: number;
  isStacked?: boolean;
  isExpanded?: boolean;
  totalInStack?: number;
}

export default function TodoCard({
  todo,
  onClick,
  instanceDate,
  stackIndex = 0,
  isStacked = false,
  isExpanded = false,
  totalInStack = 1
}: TodoCardProps) {
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

  return (
    <motion.div 
      layout
      initial={false}
      animate={{
        ...stackStyles,
        scale: isExpanded ? (stackStyles.scale || 1.02) : 1
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        duration: 0.3
      }}
      className="p-3 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer relative overflow-hidden"
      style={{ 
        backgroundColor: todo.color,
        height: timeSpan.height,
        marginBottom: timeSpan.marginBottom,
        zIndex: stackStyles.zIndex,
        transform: stackStyles.transform,
        marginTop: stackStyles.marginTop
      }}
      onClick={onClick}
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

      {/* Main content */}
      <div className="h-full flex flex-col">
        {/* Title */}
        <h4 
          className="font-semibold text-sm mb-1 pr-4" 
          style={{ 
            color: textColor,
            lineHeight: '1.2'
          }}
        >
          {todo.title}
        </h4>
        
        {/* Time range */}
        <div className="text-xs font-medium mb-2" style={{ color: timeColor }}>
          {displayTime && formatTime(displayTime)}
          {todo.endTime && todo.startTime && ` - ${formatTime(todo.endTime)}`}
        </div>

        {/* Description for longer events */}
        {todo.description && timeSpan.height !== 'auto' && parseInt(timeSpan.height) > 100 && 
         (stackIndex === totalInStack - 1 || isExpanded) && (
          <div 
            className="text-xs opacity-75 flex-1 overflow-hidden"
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
      </div>
    </motion.div>
  );
}
