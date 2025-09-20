"use client";
import { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import LeftSidebar from "../components/LeftSidebar";
import TodoModal from "../components/TodoModal";
import { IconPlus, IconMinus, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { Todo } from "../types/todo";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";

function getWeekNumber(date: Date) {
  const firstDayofYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - firstDayofYear.getTime()) / 86400000;
  return Math.ceil((pastDays + firstDayofYear.getDay() + 1) / 7);
}

// Helper function to check if a date is in this week
function isThisWeek(date: Date): boolean {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Get the start of this week (Monday)
  const todayDay = todayStart.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay; // Handle Sunday (0) as last day of week
  const mondayStart = new Date(todayStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  
  // Get the end of this week (Sunday)
  const sundayEnd = new Date(mondayStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
  
  return date >= mondayStart && date <= sundayEnd;
}

// Helper function to check if a date is in this month
function isThisMonth(date: Date): boolean {
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function HeaderBar() {
  const today = new Date();
  const [monthYear] = useState(today.toLocaleString("default", { month: "long", year: "numeric" }));
  const [week] = useState(getWeekNumber(today));

  return (
    <div className="sticky top-0 z-30 bg-white px-8 py-5 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-bold">{monthYear}</h1>
        <div className="flex items-center space-x-4">
          <span className="text-4xl leading-none">/</span>
          <select className="font-semibold text-lg bg-transparent focus:outline-none cursor-pointer">
            <option value={week}>W{week}</option>
          </select>
        </div>
        <button className="p-2 rounded hover:bg-gray-100">
          <IconChevronLeft size={22} stroke={2.2} />
        </button>
        <button className="p-2 rounded hover:bg-gray-100">
          <IconChevronRight size={22} stroke={2.2} />
        </button>
      </div>

      <div className="flex space-x-3">
        <button className="px-4 py-2 rounded-md bg-[#EAEAEA] text-base font-medium hover:bg-[#D5D5D5]">Today</button>
        <button className="px-4 py-2 rounded-md bg-black text-white text-base font-medium hover:bg-[#1A1A1A]">Share</button>
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

/* --- Todo page --- */
export default function TodoPage() {
  const [user] = useAuthState(auth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
          recurrence: data.recurrence || { type: 'none' },
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
    // Real-time listener will automatically update the todos
  };

  // Group todos dynamically
  const getGroupedTodos = (): TodoGroup[] => {
    if (loading || todos.length === 0) {
      return [];
    }

    const groups: TodoGroup[] = [];

    // Date-based groups
    const thisWeekTodos = todos.filter(todo => {
      if (todo.startTime) return isThisWeek(todo.startTime);
      return isThisWeek(todo.createdAt);
    });

    const thisMonthTodos = todos.filter(todo => {
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

    // Category-based groups
    const categoriesMap = new Map<string, Todo[]>();
    
    todos.forEach(todo => {
      const category = todo.category || 'uncategorized';
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(todo);
    });

    // Convert categories to groups
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

  // Initialize collapsed state for all groups
  useEffect(() => {
    const initialCollapsed: Record<string, boolean> = {};
    groups.forEach(group => {
      if (!(group.key in collapsed)) {
        // Show "This Week" expanded by default, others collapsed
        initialCollapsed[group.key] = group.key !== "thisWeek";
      }
    });
    
    if (Object.keys(initialCollapsed).length > 0) {
      setCollapsed(prev => ({ ...prev, ...initialCollapsed }));
    }
  }, [groups.length]);

  const toggleGroup = (groupKey: string) => {
    setCollapsed(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen overflow-hidden">
          <LeftSidebar onToggleSidebar={() => setSidebarCollapsed((s) => !s)} />
          <motion.aside
            initial={false}
            animate={{ x: sidebarCollapsed ? -288 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed left-20 top-0 h-screen w-72 bg-black flex flex-col z-10 shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-center h-full p-5">
              <div className="text-white">Loading todos...</div>
            </div>
          </motion.aside>
          <motion.main 
            initial={false} 
            animate={{ marginLeft: sidebarCollapsed ? "5rem" : "23rem" }} 
            transition={{ duration: 0.3, ease: "easeInOut" }} 
            className="flex-1 overflow-x-hidden"
          >
            <HeaderBar />
            <div className="p-6">
              <div className="text-center">Loading your todos...</div>
            </div>
          </motion.main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen overflow-hidden">
        {/* LEFT SIDEBAR */}
        <LeftSidebar onToggleSidebar={() => setSidebarCollapsed((s) => !s)} />

        {/* Second Sidebar (slides horizontally behind left sidebar) */}
        <motion.aside
          initial={false}
          animate={{ x: sidebarCollapsed ? -288 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed left-20 top-0 h-screen w-72 bg-black flex flex-col z-10 shadow-lg overflow-hidden"
        >
          {/* Fixed Sidebar header */}
          <div className="flex-shrink-0 flex items-center justify-between p-5">
            <h2 className="text-white text-3xl font-medium tracking-wide">Todos</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              aria-label="Add Todo" 
              className="w-9 h-9 bg-[#252525] rounded-md flex items-center justify-center text-white shadow-sm hover:bg-[#1f1f1f] transition-colors flex-shrink-0" 
              type="button"
            >
              <IconPlus size={16} className="text-white" stroke={1.5} />
            </button>
          </div>

          {/* Scrollable Todo Groups Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pt-3">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="text-[#6A6A6A] text-center">
                  <p className="mb-2">No todos yet</p>
                  <p className="text-sm">Click the + button to create your first todo</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div key={group.key} className="mb-2">
                    <div className="bg-[#151515] rounded-lg overflow-hidden">
                      <button
                        className="w-full flex justify-between items-center px-3 py-2 font-medium hover:bg-[#1f1f1f] transition text-left"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span className={`truncate ${collapsed[group.key] ? "text-[#BDBDBD]" : "text-[#C8A2D6]"}`}>
                            {group.title}
                          </span>
                          <span className="text-[#6A6A6A] text-sm flex-shrink-0">({group.todos.length})</span>
                        </div>

                        <div className="flex-shrink-0 ml-2">
                          {collapsed[group.key] ? (
                            <IconPlus size={16} className="text-[#6A6A6A]" />
                          ) : (
                            <IconMinus size={16} className="text-[#6A6A6A]" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {!collapsed[group.key] && (
                          <motion.div
                            className="overflow-hidden"
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: "auto" }} 
                            exit={{ opacity: 0, height: 0 }} 
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <ul className="p-3 space-y-2">
                              {group.todos.map((todo, i) => (
                                <motion.li
                                  key={todo.id}
                                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-[#1f1f1f] transition-colors duration-200"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.25, delay: i * 0.07 }}
                                >
                                  <label className="relative flex items-center cursor-pointer flex-shrink-0">
                                    <input 
                                      type="checkbox" 
                                      className="peer hidden" 
                                      defaultChecked={todo.completed}
                                      onChange={(e) => {
                                        // TODO: Update todo completion status in Firestore
                                        console.log("Todo completion toggled:", todo.id, e.target.checked);
                                      }}
                                    />
                                    <span className="w-5 h-5 rounded-md border border-[#424242] flex items-center justify-center transition-colors peer-checked:bg-[#C8A2D6] peer-checked:border-[#C8A2D6]">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                  </label>

                                  <div className="flex-1 flex items-center justify-between min-w-0">
                                    <span 
                                      className={`text-white text-sm truncate ${todo.completed ? 'line-through opacity-60' : ''}`}
                                      title={todo.description || todo.title}
                                    >
                                      {todo.title}
                                    </span>
                                    
                                    {/* Priority indicator */}
                                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                      {todo.priority === 'high' && (
                                        <div className="w-2 h-2 rounded-full bg-red-500" title="High Priority" />
                                      )}
                                      {todo.priority === 'medium' && (
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" title="Medium Priority" />
                                      )}
                                      {todo.priority === 'low' && (
                                        <div className="w-2 h-2 rounded-full bg-green-500" title="Low Priority" />
                                      )}
                                      
                                      {/* Color indicator */}
                                      <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0" 
                                        style={{ backgroundColor: todo.color }}
                                        title={`Category: ${todo.category}`}
                                      />
                                    </div>
                                  </div>
                                </motion.li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.aside>

        {/* Main content area */}
        <motion.main 
          initial={false} 
          animate={{ marginLeft: sidebarCollapsed ? "5rem" : "23rem" }} 
          transition={{ duration: 0.3, ease: "easeInOut" }} 
          className="flex-1 overflow-x-hidden"
        >
          {/* Fixed top header */}
          <HeaderBar />
          <div className="p-6">
            <h1 className="text-2xl font-bold">Your Todo App</h1>
            <p>Welcome! You are logged in.</p>
            
            {/* Stats */}
            {todos.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#C8A2D6]/10 rounded-lg border border-[#C8A2D6]/20">
                  <p className="text-[#C8A2D6] font-medium">Total Todos</p>
                  <p className="text-2xl font-bold text-gray-900">{todos.length}</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {todos.filter(todo => todo.completed).length}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 font-medium">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {todos.filter(todo => {
                      if (todo.startTime) return isThisWeek(todo.startTime);
                      return isThisWeek(todo.createdAt);
                    }).length}
                  </p>
                </div>
              </div>
            )}

            <div className="h-[150vh] bg-gray-100 mt-6 rounded-lg p-4">
              <p>Scroll to see sidebars stay fixed.</p>
              
              {/* Recent Activity */}
              {todos.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  {todos.slice(0, 5).map(todo => (
                    <div key={todo.id} className="p-4 bg-white rounded-lg shadow-sm border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{todo.title}</h4>
                          {todo.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{todo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            <span className="capitalize">Category: {todo.category}</span>
                            <span className="capitalize">Priority: {todo.priority}</span>
                            <span>Created: {todo.createdAt.toLocaleDateString()}</span>
                            {todo.startTime && (
                              <span>Due: {todo.startTime.toLocaleDateString()}</span>
                            )}
                          </div>
                          {todo.links.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Links: {todo.links.length}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                          {todo.completed && (
                            <span className="text-green-600 text-xs font-medium">✓ Done</span>
                          )}
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: todo.color }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.main>

        {/* Todo Modal */}
        <TodoModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTodoAdded={handleTodoAdded}
        />
      </div>
    </ProtectedRoute>
  );
}
