"use client";
import { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import LeftSidebar from "../components/LeftSidebar";
import TodoModal from "../components/TodoModal";
import TodoSidebar from "../components/todo/TodoSidebar";
import TodoDetailsModal from "../components/todo/TodoDetailsModal";
import { IconChevronLeft, IconChevronRight, IconRepeat } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { Todo } from "../types/todo";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";

function getWeekNumber(date: Date) {
  const firstDayofYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - firstDayofYear.getTime()) / 86400000;
  return Math.ceil((pastDays + firstDayofYear.getDay() + 1) / 7);
}

// Helper function to get 5 days centered around today
function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const weekDates = [];
  
  // Show: yesterday, today, tomorrow, day after tomorrow, day after that
  for (let i = -1; i <= 3; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    weekDates.push(date);
  }
  
  return weekDates;
}

// Helper function to generate recurring dates for a todo
function generateRecurringDates(todo: Todo, viewStartDate: Date, viewEndDate: Date): Date[] {
  if (!todo.recurrence || todo.recurrence.type === 'none' || !todo.startTime) {
    return []; // Return empty array for non-recurring todos
  }

  const dates: Date[] = [];
  const startDate = new Date(todo.startTime);
  const interval = todo.recurrence.interval || 1;
  
  // Set end date - either recurrence end date or 6 months from start (to prevent infinite generation)
  let endDate = viewEndDate;
  if (todo.recurrence.endDate) {
    const recurrenceEndDate = typeof todo.recurrence.endDate === 'string' 
      ? new Date(todo.recurrence.endDate) 
      : todo.recurrence.endDate instanceof Date 
        ? todo.recurrence.endDate
        : new Date(todo.recurrence.endDate);
    endDate = new Date(Math.min(endDate.getTime(), recurrenceEndDate.getTime()));
  }

  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate && dates.length < 100) { // Limit to prevent infinite loops
    // Check if current date is within our view range
    if (currentDate >= viewStartDate && currentDate <= viewEndDate) {
      dates.push(new Date(currentDate));
    }
    
    // Calculate next occurrence
    switch (todo.recurrence.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
      default:
        break;
    }
    
    // Safety check to prevent infinite loops
    if (currentDate.getTime() === startDate.getTime()) {
      break;
    }
  }
  
  return dates;
}

// Helper function to check if a date is in this week
function isThisWeek(date: Date): boolean {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const todayDay = todayStart.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  const mondayStart = new Date(todayStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  
  const sundayEnd = new Date(mondayStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
  
  return date >= mondayStart && date <= sundayEnd;
}

// Helper function to check if a date is on the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

// Helper function to check if a date is in this month
function isThisMonth(date: Date): boolean {
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function HeaderBar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const monthYear = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const week = getWeekNumber(currentDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 5 : -5));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="sticky top-0 z-30 bg-white px-8 py-5 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-bold text-gray-900">{monthYear}</h1>
        <div className="flex items-center space-x-4">
          <span className="text-4xl leading-none text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-gray-700">W{week}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <IconChevronLeft size={20} stroke={2} className="text-gray-600" />
          </button>
          <button 
            onClick={() => navigateWeek('next')}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <IconChevronRight size={20} stroke={2} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex space-x-3">
        <button 
          onClick={goToToday}
          className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Today
        </button>
        <button className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
          Share
        </button>
      </div>
    </div>
  );
}

interface TodoGroup {
  key: string;
  title: string;
  todos: Todo[];
  isDateBased?: boolean;
}

// Minimal Todo card component with full background color
function TodoCard({ todo, onClick, instanceDate }: { todo: Todo; onClick: () => void; instanceDate?: Date }) {
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

  return (
    <div 
      className="p-3 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden"
      style={{ 
        backgroundColor: todo.color
      }}
      onClick={onClick}
    >
      {/* Recurring indicator */}
      {todo.recurrence?.type !== 'none' && (
        <div className="absolute top-2 right-2">
          <IconRepeat size={10} style={{ color: timeColor }} />
        </div>
      )}

      {/* Main content */}
      <div>
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
        
        {/* Start Time */}
        {displayTime && (
          <p 
            className="text-xs font-medium" 
            style={{ color: timeColor }}
          >
            {formatTime(displayTime)}
          </p>
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
    </div>
  );
}

/* --- Todo page --- */
export default function TodoPage() {
  const [user] = useAuthState(auth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekDates, setCurrentWeekDates] = useState(getCurrentWeekDates());

  // Update week dates when component mounts
  useEffect(() => {
    setCurrentWeekDates(getCurrentWeekDates());
  }, []);

  // Fetch todos from Firestore in real-time
  useEffect(() => {
    if (!user) {
      setTodos([]);
      setLoading(false);
      return;
    }

    const todosRef = collection(db, 'users', user.uid, 'todos');
    const q = query(todosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosList: Todo[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        todosList.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          category: data.category,
          links: data.links || [],
          startTime: data.startTime?.toDate(),
          endTime: data.endTime?.toDate(),
          completed: data.completed,
          priority: data.priority,
          color: data.color,
          style: data.style,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sharedWith: data.sharedWith || [],
          recurrence: {
            type: data.recurrence?.type || 'none',
            interval: data.recurrence?.interval,
            endDate: data.recurrence?.endDate?.toDate?.() || data.recurrence?.endDate
          },
          ownerId: data.ownerId,
        });
      });
      setTodos(todosList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching todos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle new todo added from modal
  const handleTodoAdded = (newTodo: Todo) => {
    console.log("New todo added:", newTodo);
  };

  // Handle todo click
  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setIsDetailsModalOpen(true);
  };

  // Group todos dynamically with recurrence expansion
  const getGroupedTodos = (): TodoGroup[] => {
    if (loading || todos.length === 0) {
      return [];
    }

    const groups: TodoGroup[] = [];
    
    // Expand recurring todos
    const expandedTodos: Todo[] = [];
    const viewStartDate = new Date(Math.min(...currentWeekDates.map(d => d.getTime())));
    const viewEndDate = new Date(Math.max(...currentWeekDates.map(d => d.getTime())));
    
    todos.forEach(todo => {
      if (todo.recurrence?.type !== 'none' && todo.startTime) {
        // Generate recurring instances
        const recurringDates = generateRecurringDates(todo, viewStartDate, viewEndDate);
        recurringDates.forEach(date => {
          expandedTodos.push({
            ...todo,
            id: `${todo.id}-${date.getTime()}`, // Unique ID for each instance
            startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                              todo.startTime!.getHours(), todo.startTime!.getMinutes()),
            endTime: todo.endTime ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                                           todo.endTime.getHours(), todo.endTime.getMinutes()) : undefined
          });
        });
      } else {
        // Non-recurring todos or all-day todos
        expandedTodos.push(todo);
      }
    });

    // Date-based groups with expanded todos
    const thisWeekTodos = expandedTodos.filter(todo => {
      if (todo.startTime) return isThisWeek(todo.startTime);
      return isThisWeek(todo.createdAt);
    });

    const thisMonthTodos = expandedTodos.filter(todo => {
      if (todo.startTime) return isThisMonth(todo.startTime);
      return isThisMonth(todo.createdAt);
    });

    if (thisWeekTodos.length > 0) {
      groups.push({
        key: "thisWeek",
        title: "This Week",
        todos: thisWeekTodos,
        isDateBased: true,
      });
    }

    if (thisMonthTodos.length > 0) {
      groups.push({
        key: "thisMonth",
        title: "This Month",
        todos: thisMonthTodos,
        isDateBased: true,
      });
    }

    // Category-based groups with original todos (no expansion for sidebar)
    const categoriesMap = new Map<string, Todo[]>();
    
    todos.forEach(todo => {
      const category = todo.category || 'uncategorized';
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(todo);
    });

    categoriesMap.forEach((todosList, category) => {
      groups.push({
        key: category,
        title: category.charAt(0).toUpperCase() + category.slice(1),
        todos: todosList,
        isDateBased: false,
      });
    });

    return groups;
  };

  const groups = getGroupedTodos();

  // Get todos for a specific date - WITH RECURRENCE EXPANSION
  const getTodosForDate = (date: Date): Todo[] => {
    const result: Todo[] = [];
    const viewStartDate = new Date(Math.min(...currentWeekDates.map(d => d.getTime())));
    const viewEndDate = new Date(Math.max(...currentWeekDates.map(d => d.getTime())));
    
    todos.forEach(todo => {
      if (todo.recurrence?.type !== 'none' && todo.startTime) {
        // Check if this recurring todo should appear on this date
        const recurringDates = generateRecurringDates(todo, viewStartDate, viewEndDate);
        const matchingDate = recurringDates.find(recurDate => isSameDay(recurDate, date));
        
        if (matchingDate) {
          // Create instance for this date
          result.push({
            ...todo,
            id: `${todo.id}-${matchingDate.getTime()}`,
            startTime: new Date(matchingDate.getFullYear(), matchingDate.getMonth(), matchingDate.getDate(), 
                              todo.startTime.getHours(), todo.startTime.getMinutes()),
            endTime: todo.endTime ? new Date(matchingDate.getFullYear(), matchingDate.getMonth(), matchingDate.getDate(), 
                                           todo.endTime.getHours(), todo.endTime.getMinutes()) : undefined
          });
        }
      } else {
        // Non-recurring todos
        if (todo.startTime) {
          if (isSameDay(todo.startTime, date)) {
            result.push(todo);
          }
        } else {
          if (isSameDay(todo.createdAt, date)) {
            result.push(todo);
          }
        }
      }
    });
    
    return result;
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen overflow-hidden bg-gray-50">
        {/* LEFT SIDEBAR */}
        <LeftSidebar onToggleSidebar={() => setSidebarCollapsed((s) => !s)} />

        {/* TODO SIDEBAR */}
        <TodoSidebar
          sidebarCollapsed={sidebarCollapsed}
          groups={groups}
          onAddTodo={() => setIsModalOpen(true)}
          loading={loading}
        />

        {/* Main content area */}
        <motion.main 
          initial={false} 
          animate={{ marginLeft: sidebarCollapsed ? "5rem" : "23rem" }} 
          transition={{ duration: 0.3, ease: "easeInOut" }} 
          className="flex-1 overflow-x-hidden bg-white"
        >
          {/* Fixed top header */}
          <HeaderBar />
          
          {/* Calendar Grid */}
          <div className="p-6">
            {/* Date Headers Row */}
            <div className="grid grid-cols-6 gap-4 mb-6">
              {/* Empty space for time labels column */}
              <div></div>
              
              {/* Date headers */}
              {currentWeekDates.map((date, index) => {
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div key={index} className="text-center">
                    <div className={`text-5xl font-bold mb-1 ${
                      isToday 
                        ? 'text-black' 
                        : 'text-gray-400'
                    }`}>
                      {date.getDate().toString().padStart(2, '0')}
                    </div>
                    <div className={`text-sm font-medium lowercase tracking-wide ${
                      isToday 
                        ? 'text-black font-bold' 
                        : 'text-gray-500 font-normal'
                    }`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    {/* Small vertical line under the day name - darker for current day */}
                    <div className="flex justify-center mt-2">
                      <div className={`w-0.5 h-4 ${
                        isToday 
                          ? 'bg-black' 
                          : 'bg-gray-300'
                      }`}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time labels column + Date columns - EXPANDED TIME RANGE */}
            <div className="grid grid-cols-6 gap-4">
              {/* Time labels column - Extended from 6 AM to 11 PM */}
              <div className="space-y-4">
                <div className="h-20 flex items-start pt-2">
                  <span className="text-xs text-gray-500 font-medium">all day</span>
                </div>
                {/* Time slots - Extended range */}
                {Array.from({ length: 17 }, (_, i) => {
                  const hour = i + 6; // Start from 6 AM
                  let timeLabel;
                  if (hour === 0) timeLabel = '12 am';
                  else if (hour === 12) timeLabel = '12 pm';
                  else if (hour < 12) timeLabel = `${hour} am`;
                  else timeLabel = `${hour - 12} pm`;
                  
                  return (
                    <div key={hour} className="h-16 flex items-start">
                      <span className="text-xs text-gray-500 font-medium">{timeLabel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Date columns - 5 days centered around today */}
              {currentWeekDates.map((date, index) => {
                const dayTodos = getTodosForDate(date);
                
                return (
                  <div key={index} className="space-y-4">
                    {/* All day events */}
                    <div className="min-h-[80px] space-y-2">
                      {dayTodos
                        .filter(todo => !todo.startTime || todo.startTime.getHours() === 0)
                        .map(todo => (
                          <TodoCard 
                            key={todo.id} 
                            todo={todo} 
                            onClick={() => handleTodoClick(todo)}
                          />
                        ))}
                    </div>

                    {/* Time slot events - Extended range 6 AM to 11 PM */}
                    <div className="space-y-4">
                      {Array.from({ length: 17 }, (_, hourIndex) => {
                        const hour = hourIndex + 6; // Start from 6 AM
                        const hourTodos = dayTodos.filter(todo => 
                          todo.startTime && todo.startTime.getHours() === hour
                        );
                        
                        return (
                          <div key={hour} className="min-h-[64px] relative">
                            {hourTodos.length > 0 && (
                              <div className="space-y-2">
                                {hourTodos.map(todo => (
                                  <TodoCard 
                                    key={todo.id} 
                                    todo={todo} 
                                    onClick={() => handleTodoClick(todo)}
                                    instanceDate={todo.startTime}
                                  />
                                ))}
                              </div>
                            )}
                            {/* Time slot grid line */}
                            <div className="absolute inset-0 border-t border-gray-100 pointer-events-none"></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.main>

        {/* Todo Modal */}
        <TodoModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTodoAdded={handleTodoAdded}
        />

        {/* Todo Details Modal */}
        <TodoDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          todo={selectedTodo}
        />
      </div>
    </ProtectedRoute>
  );
}
