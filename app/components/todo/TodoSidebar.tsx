"use client";
import { useState, useEffect } from "react";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { Todo } from "../../types/todo";
import TodoDetailsModal from "./TodoDetailsModal"; // Add this import

interface TodoGroup {
  key: string;
  title: string;
  todos: Todo[];
  isDateBased?: boolean;
}

interface TodoSidebarProps {
  sidebarCollapsed: boolean;
  groups: TodoGroup[];
  onAddTodo: () => void;
  loading?: boolean;
}

export default function TodoSidebar({ 
  sidebarCollapsed, 
  groups, 
  onAddTodo, 
  loading = false 
}: TodoSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  
  // Add these states for the details modal
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
  }, [groups.length, collapsed]);

  const toggleGroup = (groupKey: string) => {
    setCollapsed(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Add this function to handle todo clicks
  const handleTodoClick = (todo: Todo, event: React.MouseEvent) => {
    // Prevent checkbox click from triggering
    if ((event.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    
    setSelectedTodo(todo);
    setIsDetailsModalOpen(true);
  };

  // Add this function to close the details modal
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTodo(null);
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <>
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
            onClick={onAddTodo}
            aria-label="Add Todo" 
            className="w-9 h-9 bg-[#252525] rounded-md flex items-center justify-center text-white shadow-sm hover:bg-[#1f1f1f] transition-colors flex-shrink-0" 
            type="button"
          >
            <IconPlus size={16} className="text-white" stroke={1.5} />
          </button>
        </div>

        {/* Scrollable Todo Groups Container with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pt-3 sidebar-custom-scrollbar">
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
                                className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-[#1f1f1f] transition-colors duration-200 cursor-pointer"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25, delay: i * 0.07 }}
                                onClick={(e) => handleTodoClick(todo, e)} // Add click handler
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

        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          .sidebar-custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .sidebar-custom-scrollbar::-webkit-scrollbar-track {
            background: #1A1A1A;
            border-radius: 3px;
            margin: 8px 0;
          }
          
          .sidebar-custom-scrollbar::-webkit-scrollbar-thumb {
            background: #3A3A3A;
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          
          .sidebar-custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #C8A2D6;
          }
          
          .sidebar-custom-scrollbar::-webkit-scrollbar-thumb:active {
            background: #B892C6;
          }
          
          /* For Firefox */
          .sidebar-custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #3A3A3A #1A1A1A;
          }
        `}</style>
      </motion.aside>

      {/* Todo Details Modal */}
      <TodoDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        todo={selectedTodo}
      />
    </>
  );
}
