"use client";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import LeftSidebar from "../components/LeftSidebar";
import TodoModal from "../components/TodoModal";
import TodoSidebar from "../components/todo/TodoSidebar";
import TodoDetailsModal from "../components/todo/TodoDetailsModal";
import StackedTodoCards from "../components/todo/StackedTodoCards";
import TodoCard from "../components/todo/TodoCard";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { Todo } from "../types/todo";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { 
  getWeekNumber, 
  getCurrentWeekDates, 
  isThisWeek, 
  isSameDay, 
  isThisMonth 
} from "../utils/dateHelpers";
import { 
  generateRecurringDates, 
  groupOverlappingTodos 
} from "../utils/todoHelpers";

function HeaderBar({ 
  currentWeekStartDate, 
  onNavigateWeek, 
  onGoToToday 
}: { 
  currentWeekStartDate: Date;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
}) {
  const monthYear = currentWeekStartDate.toLocaleString("default", { month: "long", year: "numeric" });
  const week = getWeekNumber(currentWeekStartDate);

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
            onClick={() => onNavigateWeek('prev')}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <IconChevronLeft size={20} stroke={2} className="text-gray-600" />
          </button>
          <button 
            onClick={() => onNavigateWeek('next')}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <IconChevronRight size={20} stroke={2} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex space-x-3">
        <button 
          onClick={onGoToToday}
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

// Helper function to get Monday of the week for any given date
const getMondayOfWeek = (date: Date): Date => {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
  monday.setDate(monday.getDate() + daysToMonday);
  return monday;
};

// Helper function to generate full week dates (Monday to Sunday - 7 days)
const getWeekDates = (mondayDate: Date): Date[] => {
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    weekDates.push(date);
  }
  return weekDates;
};

export default function TodoPage() {
  const [user] = useAuthState(auth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ ADD THESE EDIT FUNCTIONALITY STATES
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  // Scroll container refs for synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  // Track current week start (Monday)
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState(() => getMondayOfWeek(new Date()));
  const [currentWeekDates, setCurrentWeekDates] = useState(() => getWeekDates(getMondayOfWeek(new Date())));
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update week dates when week start date changes
  useEffect(() => {
    const weekDates = getWeekDates(currentWeekStartDate);
    setCurrentWeekDates(weekDates);
  }, [currentWeekStartDate]);

  // Function to center today's column with proper dimension checks
  const centerTodayColumn = () => {
    const today = new Date();
    const todayIndex = currentWeekDates.findIndex(date => isSameDay(date, today));
    
    if (todayIndex === -1 || !headerScrollRef.current || !contentScrollRef.current) {
      return;
    }

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      const headerContainer = headerScrollRef.current!;
      const contentContainer = contentScrollRef.current!;
      
      // Check if container has proper dimensions
      const containerWidth = contentContainer.clientWidth;
      if (containerWidth === 0) {
        // Retry after a short delay if dimensions aren't ready
        setTimeout(centerTodayColumn, 100);
        return;
      }

      const dayWidth = 180; // minWidth from styling
      const gap = 16; // gap-4 = 16px
      const dayTotalWidth = dayWidth + gap;
      
      // Calculate position to center today's column
      const todayLeftEdge = todayIndex * dayTotalWidth;
      const scrollPosition = todayLeftEdge - (containerWidth / 2) + (dayWidth / 2);
      
      // Ensure we don't scroll beyond bounds
      const maxScroll = Math.max(0, (currentWeekDates.length * dayTotalWidth) - containerWidth);
      const finalScrollPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
      
      // Scroll both containers simultaneously
      headerContainer.scrollTo({
        left: finalScrollPosition,
        behavior: isInitialLoad ? 'auto' : 'smooth' // Instant on initial load, smooth otherwise
      });
      contentContainer.scrollTo({
        left: finalScrollPosition,
        behavior: isInitialLoad ? 'auto' : 'smooth'
      });
    });
  };

  // Use useLayoutEffect for initial centering to avoid flash
  useLayoutEffect(() => {
    if (isInitialLoad) {
      // Multiple attempts to ensure proper centering
      const attempts = [0, 50, 150, 300]; // Progressive delays
      attempts.forEach(delay => {
        setTimeout(() => {
          centerTodayColumn();
          if (delay === 300) setIsInitialLoad(false); // Mark initial load complete
        }, delay);
      });
    }
  }, [currentWeekDates, isInitialLoad]);

  // Regular useEffect for subsequent centering
  useEffect(() => {
    if (!isInitialLoad) {
      centerTodayColumn();
    }
  }, [currentWeekDates]);

  // Synchronize scrolling between header and content
  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Week navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStartDate);
    newWeekStart.setDate(currentWeekStartDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStartDate(newWeekStart);
  };

  const goToToday = () => {
    const todayMondayStart = getMondayOfWeek(new Date());
    setCurrentWeekStartDate(todayMondayStart);
    
    // Force re-centering after state update
    setTimeout(() => {
      centerTodayColumn();
    }, 100);
  };

  // Enhanced horizontal scrolling with better vertical scroll detection
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      const isOverScrollContainer = target?.closest('.horizontal-scroll-container');
      
      if (isOverScrollContainer) {
        const container = isOverScrollContainer as HTMLElement;
        const canScrollHorizontally = container.scrollWidth > container.clientWidth;
        const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);
        
        if (canScrollHorizontally && isVerticalScroll) {
          if (e.shiftKey || Math.abs(e.deltaX) > 0) {
            e.preventDefault();
            const scrollAmount = e.deltaY;
            
            // Scroll both containers
            if (headerScrollRef.current) {
              headerScrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
              });
            }
            if (contentScrollRef.current) {
              contentScrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
              });
            }
          }
        }
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle window resize to re-center today's column
  useEffect(() => {
    const handleResize = () => {
      setTimeout(centerTodayColumn, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentWeekDates]);

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

  // ✅ ADD THESE EDIT HANDLER FUNCTIONS
  // Handle edit todo (called from context menu)
  const handleEditTodo = (todo: Todo) => {
    console.log("✏️ Edit todo requested:", todo.title);
    setEditingTodo(todo);
    setIsEditModalOpen(true);
  };

  // Handle todo updated from edit modal
  const handleTodoUpdated = (updatedTodo: Todo) => {
    console.log("✅ Todo updated:", updatedTodo.title);
    setIsEditModalOpen(false);
    setEditingTodo(null);
    // The real-time listener should automatically update the todos list
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTodo(null);
  };

  // Handle closing details modal
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTodo(null);
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
      if (todo.startTime) {
        return currentWeekDates.some(weekDate => isSameDay(todo.startTime!, weekDate));
      }
      return currentWeekDates.some(weekDate => isSameDay(todo.createdAt, weekDate));
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

  // Get todos for a specific date
  const getTodosForDate = (date: Date): Todo[] => {
    const result: Todo[] = [];
    const viewStartDate = new Date(Math.min(...currentWeekDates.map(d => d.getTime())));
    const viewEndDate = new Date(Math.max(...currentWeekDates.map(d => d.getTime())));
    
    todos.forEach(todo => {
      if (todo.recurrence?.type !== 'none' && todo.startTime) {
        const recurringDates = generateRecurringDates(todo, viewStartDate, viewEndDate);
        const matchingDate = recurringDates.find(recurDate => isSameDay(recurDate, date));
        
        if (matchingDate) {
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

        {/* TODO SIDEBAR - ✅ ADD THE onEditTodo PROP */}
        <TodoSidebar
          sidebarCollapsed={sidebarCollapsed}
          groups={groups}
          onAddTodo={() => setIsModalOpen(true)}
          onEditTodo={handleEditTodo} // ✅ ADD THIS LINE
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
          <HeaderBar 
            currentWeekStartDate={currentWeekStartDate}
            onNavigateWeek={navigateWeek}
            onGoToToday={goToToday}
          />
          
          {/* Calendar Grid */}
          <div className="p-6">
            {/* Synchronized Scrollable Date Headers Row */}
            <div className="grid grid-cols-1 gap-4 mb-6" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div></div>
              
              {/* Horizontally scrollable date headers */}
              <div 
                ref={headerScrollRef}
                className="overflow-x-auto scrollbar-hide horizontal-scroll-container"
                onScroll={handleHeaderScroll}
              >
                <div className="flex gap-4 min-w-max">
                  {currentWeekDates.map((date, index) => {
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div key={index} className="text-center flex-shrink-0" style={{ minWidth: '180px' }}>
                        <div className={`text-5xl font-bold mb-1 ${
                          isToday ? 'text-black' : 'text-gray-400'
                        }`}>
                          {date.getDate().toString().padStart(2, '0')}
                        </div>
                        <div className={`text-sm font-medium lowercase tracking-wide ${
                          isToday ? 'text-black font-bold' : 'text-gray-500 font-normal'
                        }`}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="flex justify-center mt-2">
                          <div className={`w-0.5 h-4 ${
                            isToday ? 'bg-black' : 'bg-gray-300'
                          }`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time labels column + Synchronized Scrollable Date columns */}
            <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'auto 1fr' }}>
              {/* Fixed Time labels column */}
              <div className="space-y-4">
                <div className="h-20 flex items-start pt-2">
                  <span className="text-xs text-gray-500 font-medium">all day</span>
                </div>
                {Array.from({ length: 17 }, (_, i) => {
                  const hour = i + 6;
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

              {/* Horizontally scrollable days container */}
              <div 
                ref={contentScrollRef}
                className="overflow-x-auto scrollbar-hide horizontal-scroll-container"
                onScroll={handleContentScroll}
              >
                <div className="flex gap-4 min-w-max">
                  {currentWeekDates.map((date, index) => {
                    const dayTodos = getTodosForDate(date);
                    
                    return (
                      <div key={index} className="relative flex-shrink-0" style={{ minWidth: '180px' }}>
                        {/* All day events */}
                        <div className="min-h-[80px] space-y-2 mb-4">
                          {dayTodos
                            .filter(todo => !todo.startTime || todo.startTime.getHours() === 0)
                            .map(todo => (
                              <TodoCard 
                                key={todo.id} 
                                todo={todo} 
                                onClick={() => handleTodoClick(todo)}
                                onDelete={(deletedTodo) => {
                                  console.log('Card deleted:', deletedTodo.title);
                                  // Real-time listener will handle the update
                                }}
                              />
                            ))}
                        </div>

                        {/* Time slot events */}
                        <div className="relative" style={{ minHeight: '1360px' }}>
                          {(() => {
                            const timedTodos = dayTodos.filter(todo => todo.startTime && todo.startTime.getHours() > 0);
                            const overlappingGroups = groupOverlappingTodos(timedTodos);
                            
                            return overlappingGroups.map((todoGroup, groupIndex) => {
                              const firstTodo = todoGroup[0];
                              const startHour = firstTodo.startTime!.getHours();
                              const startMinutes = firstTodo.startTime!.getMinutes();
                              
                              const hoursFromStart = startHour - 6;
                              const minutesFromStart = startMinutes;
                              const topOffset = (hoursFromStart * 80) + (minutesFromStart / 60 * 80);
                              
                              return (
                                <div
                                  key={`group-${groupIndex}`}
                                  className="absolute w-full"
                                  style={{ 
                                    top: `${Math.max(topOffset, 0)}px`,
                                    zIndex: 10 + groupIndex
                                  }}
                                >
                                  <StackedTodoCards 
                                    todos={todoGroup}
                                    onTodoClick={handleTodoClick}
                                  />
                                </div>
                              );
                            });
                          })()}

                          {/* Background grid lines */}
                          {Array.from({ length: 17 }, (_, hourIndex) => (
                            <div 
                              key={hourIndex} 
                              className="absolute w-full border-t border-gray-100 pointer-events-none"
                              style={{ 
                                top: `${hourIndex * 80}px`,
                                height: '64px'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.main>

        {/* ✅ ADD THE EDIT MODAL */}
        {/* Create New Todo Modal */}
        <TodoModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTodoAdded={handleTodoAdded}
        />

        {/* Edit Todo Modal */}
        <TodoModal 
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onTodoAdded={handleTodoUpdated}
          editingTodo={editingTodo} // Pass the todo to edit
        />

        <TodoDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          todo={selectedTodo}
        />
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </ProtectedRoute>
  );
}
