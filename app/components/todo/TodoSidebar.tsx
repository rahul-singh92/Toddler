"use client";
import { useState, useEffect } from "react";
import { IconPlus, IconMinus } from "@tabler/icons-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Todo } from "../../types/todo";
import TodoDetailsModal from "./TodoDetailsModal";
import TodoContextMenu from "./TodoContextMenu";
import TodoRemovalAnimation from "../ui/TodoRemovalAnimation";
import DragToDeleteOverlay from "../ui/DragToDeleteOverlay";
import { useDragToDelete } from "../../hooks/useDragToDelete";
import { doc, updateDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";

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
  onEditTodo: (todo: Todo) => void; // Add this prop for editing
  loading?: boolean;
}

export default function TodoSidebar({
  sidebarCollapsed,
  groups,
  onAddTodo,
  onEditTodo, // Add this prop
  loading = false
}: TodoSidebarProps) {
  const [user] = useAuthState(auth);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    todo: Todo | null;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    todo: null
  });

  // State to track todos that are completing (for animation)
  const [completingTodos, setCompletingTodos] = useState<Set<string>>(new Set());
  const [removingTodos, setRemovingTodos] = useState<Set<string>>(new Set());
  const [hiddenTodos, setHiddenTodos] = useState<Set<string>>(new Set());

  // Track completed recurring todos (by original ID)
  const [completedRecurringTodos, setCompletedRecurringTodos] = useState<Set<string>>(new Set());
  const [deletingTodos, setDeletingTodos] = useState<Set<string>>(new Set());

  // Debug authentication state
  useEffect(() => {
    console.log("🔐 Auth State:", {
      user: user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      } : null,
      isLoading: loading
    });
  }, [user, loading]);

  // Load completed recurring todos on component mount
  useEffect(() => {
    const loadCompletedRecurringTodos = async () => {
      if (!user) return;

      try {
        const completedRecurringRef = collection(db, 'users', user.uid, 'completedRecurring');
        const snapshot = await getDocs(completedRecurringRef);

        const completed = new Set<string>();
        snapshot.forEach(doc => {
          completed.add(doc.data().originalTodoId);
        });

        setCompletedRecurringTodos(completed);
        console.log(`✅ Loaded ${completed.size} completed recurring todos`);
      } catch (error) {
        console.error("❌ Error loading completed recurring todos:", error);
      }
    };

    loadCompletedRecurringTodos();
  }, [user]);

  // Initialize collapsed state for all groups
  useEffect(() => {
    const initialCollapsed: Record<string, boolean> = {};
    groups.forEach(group => {
      if (!(group.key in collapsed)) {
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

  // Handle todo deletion
  const handleTodoDelete = async (todo: Todo) => {
    if (!user || !todo.id) {
      console.error("❌ User not authenticated or todo.id is missing");
      return;
    }

    const originalTodoId = todo.id.includes('-') ? todo.id.split('-')[0] : todo.id;
    const displayId = todo.id;

    console.log(`🗑️ Deleting todo: ${displayId}, original: ${originalTodoId}`);

    // Mark as deleting for animation
    setDeletingTodos(prev => new Set([...prev, displayId]));

    try {
      // Delete the original todo document
      const todoRef = doc(db, 'users', user.uid, 'todos', originalTodoId);
      await deleteDoc(todoRef);

      // If it was a recurring todo, also remove completion records
      if (todo.recurrence?.type !== 'none' && todo.recurrence?.type) {
        try {
          const completedRecurringRef = doc(db, 'users', user.uid, 'completedRecurring', originalTodoId);
          await deleteDoc(completedRecurringRef);

          setCompletedRecurringTodos(prev => {
            const newSet = new Set(prev);
            newSet.delete(originalTodoId);
            return newSet;
          });
        } catch (error) {
          // It's okay if the completion record doesn't exist
          console.log("No completion record to delete");
        }
      }

      console.log(`✅ Successfully deleted todo: "${todo.title}"`);

      // Animation delay before hiding
      setTimeout(() => {
        setDeletingTodos(prev => {
          const newSet = new Set(prev);
          newSet.delete(displayId);
          return newSet;
        });
        setHiddenTodos(prev => new Set([...prev, displayId]));
      }, 1000);

    } catch (error: any) {
      console.error("❌ Error deleting todo:", error);
      setDeletingTodos(prev => {
        const newSet = new Set(prev);
        newSet.delete(displayId);
        return newSet;
      });
      alert(`Failed to delete todo: ${error?.message || 'Unknown error'}`);
    }
  };

  // Use the drag-to-delete hook
  const {
    isDragging,
    draggedItem: draggedTodo,
    isOverTrash,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragToDelete<Todo>({
    onDelete: handleTodoDelete
  });

  // Simplified todo completion handler - works with original IDs only
  const handleTodoComplete = async (todo: Todo, completed: boolean) => {
    // Check authentication first
    if (!user) {
      console.error("❌ User not authenticated");
      alert("Please log in to complete todos");
      return;
    }

    if (!todo.id) {
      console.error("❌ Todo ID is missing");
      return;
    }

    // Always use the original todo ID (extract from instance ID if needed)
    const originalTodoId = todo.id.includes('-') ? todo.id.split('-')[0] : todo.id;
    const displayId = todo.id; // Keep display ID for UI state management

    console.log(`📋 Handling completion for todo: ${displayId}, original: ${originalTodoId}, completed: ${completed}`);

    if (completed) {
      // Mark as completing for animation (use display ID for UI state)
      setCompletingTodos(prev => new Set([...prev, displayId]));

      try {
        // Always work with the original todo document
        const todoRef = doc(db, 'users', user.uid, 'todos', originalTodoId);

        const updateData: any = {
          completed: true,
          completedAt: new Date(),
          updatedAt: new Date()
        };

        // If this is a recurring todo, end the recurrence today
        if (todo.recurrence?.type !== 'none' && todo.recurrence?.type) {
          const today = new Date();
          updateData.recurrence = {
            ...todo.recurrence,
            endDate: today
          };
          console.log(`🔁 Stopping recurrence for "${todo.title}" - ending on ${today.toDateString()}`);

          // Track this as a completed recurring todo
          const completedRecurringRef = doc(db, 'users', user.uid, 'completedRecurring', originalTodoId);

          await setDoc(completedRecurringRef, {
            originalTodoId: originalTodoId,
            todoTitle: todo.title,
            completedAt: new Date(),
            createdAt: new Date()
          });

          setCompletedRecurringTodos(prev => new Set([...prev, originalTodoId]));
        }

        // Update the original todo
        await updateDoc(todoRef, updateData);
        console.log(`✅ Successfully completed todo: "${todo.title}"`);

        // Continue with animation
        setTimeout(() => {
          setRemovingTodos(prev => new Set([...prev, displayId]));
          setCompletingTodos(prev => {
            const newSet = new Set(prev);
            newSet.delete(displayId);
            return newSet;
          });

          setTimeout(() => {
            setRemovingTodos(prev => {
              const newSet = new Set(prev);
              newSet.delete(displayId);
              return newSet;
            });

            setHiddenTodos(prev => new Set([...prev, displayId]));
          }, 800);
        }, 1000);
      } catch (error: any) {
        console.error("❌ Error completing todo:", error);

        // Remove from completing set if error
        setCompletingTodos(prev => {
          const newSet = new Set(prev);
          newSet.delete(displayId);
          return newSet;
        });

        // Show detailed error message
        alert(`Failed to complete todo: ${error?.message || 'Unknown error'}`);
      }
    } else {
      // Handle uncompleting - restore recurrence if needed
      try {
        const todoRef = doc(db, 'users', user.uid, 'todos', originalTodoId);

        const updateData: any = {
          completed: false,
          updatedAt: new Date()
        };

        // If this was a recurring todo, restore the recurrence
        if (todo.recurrence?.type !== 'none' && todo.recurrence?.type) {
          updateData.recurrence = {
            ...todo.recurrence,
            endDate: null // Remove the end date to restore recurrence
          };
          console.log(`🔁 Restored recurrence for "${todo.title}"`);

          // Remove from completed recurring todos
          const completedRecurringRef = doc(db, 'users', user.uid, 'completedRecurring', originalTodoId);
          await deleteDoc(completedRecurringRef);

          setCompletedRecurringTodos(prev => {
            const newSet = new Set(prev);
            newSet.delete(originalTodoId);
            return newSet;
          });
        }

        await updateDoc(todoRef, updateData);
        console.log(`✅ Successfully uncompleted todo: "${todo.title}"`);

        setHiddenTodos(prev => {
          const newSet = new Set(prev);
          newSet.delete(displayId);
          return newSet;
        });
      } catch (error: any) {
        console.error("❌ Error uncompleting todo:", error);
        alert(`Failed to uncomplete todo: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  // Handle checkbox click separately from todo click
  const handleCheckboxClick = (todo: Todo, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (!todo.id) {
      console.error("Todo ID is missing");
      return;
    }
    handleTodoComplete(todo, event.target.checked);
  };

  // Handle left click on todo (for details)
  const handleTodoClick = (todo: Todo) => {
    if (isDragging || contextMenu.isVisible) return; // Prevent modal from opening during drag or context menu
    setSelectedTodo(todo);
    setIsDetailsModalOpen(true);
  };

  // Handle right click on todo (for context menu)
  const handleTodoRightClick = (event: React.MouseEvent, todo: Todo) => {
    event.preventDefault();
    event.stopPropagation();

    // Close any existing context menu first
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, todo: null });

    // Small delay to prevent flickering
    setTimeout(() => {
      setContextMenu({
        isVisible: true,
        position: { x: event.clientX, y: event.clientY },
        todo: todo
      });
    }, 10);
  };

  const handleLabelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTodo(null);
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, todo: null });
  };

  // Enhanced filtering logic that separates recurring todos from date-based groups
  const getFilteredTodos = (todos: Todo[], groupKey: string, isDateBased: boolean = false) => {
    const seenOriginalIds = new Set<string>();

    return todos.filter(todo => {
      if (!todo.id) return false;

      // Get the original ID (for both regular and recurring todos)
      const originalId = todo.id.includes('-') ? todo.id.split('-')[0] : todo.id;

      // For date-based groups (This Week, This Month), exclude recurring todos
      if (isDateBased) {
        const isRecurring = todo.recurrence?.type !== 'none' || todo.id.includes('-');
        if (isRecurring) {
          return false; // Don't show recurring todos in date-based groups
        }
      } else {
        // For category-based groups, show only one instance of each recurring todo
        if (seenOriginalIds.has(originalId)) {
          return false;
        }
        seenOriginalIds.add(originalId);
      }

      // Hide if todo is completed or this recurring todo was completed
      if (todo.completed || completedRecurringTodos.has(originalId)) {
        return false;
      }

      return !hiddenTodos.has(todo.id) && !removingTodos.has(todo.id) && !deletingTodos.has(todo.id);
    });
  };

  // Check if there are any visible todos across all groups
  const hasVisibleTodos = groups.some(group =>
    getFilteredTodos(group.todos, group.key, group.isDateBased).length > 0
  );

  // Animation variants
  const particleVariants: Variants = {
    initial: {
      scale: 1,
      opacity: 1,
      rotate: 0
    },
    completing: {
      scale: [1, 1.1, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 0.5,
        ease: "easeInOut",
        repeat: 1,
        repeatType: "loop"
      }
    },
    deleting: {
      scale: [1, 1.1, 0.8, 0],
      opacity: [1, 1, 0.8, 0],
      rotate: [0, -5, 5, -10],
      transition: {
        duration: 1,
        ease: "easeOut"
      }
    },
    exploding: {
      scale: [1, 1.2, 0],
      opacity: [1, 1, 0],
      rotate: [0, 10, -10, 180],
      y: [-5, -20, 0],
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  // Show login prompt if not authenticated
  if (!user && !loading) {
    return (
      <motion.aside
        initial={false}
        animate={{ x: sidebarCollapsed ? -288 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-20 top-0 h-screen w-72 bg-black flex flex-col z-10 shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-center h-full p-5">
          <div className="text-white text-center">
            <p className="mb-2">Please log in</p>
            <p className="text-sm text-gray-400">to view your todos</p>
          </div>
        </div>
      </motion.aside>
    );
  }

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
      {/* Use the new DragToDeleteOverlay component */}
      <DragToDeleteOverlay
        isDragging={isDragging}
        isOverTrash={isOverTrash}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        draggedItemName="todo"
        position="top"
        trashSize={28}
      />

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
          {groups.length === 0 || !hasVisibleTodos ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="text-[#6A6A6A] text-center">
                <p className="mb-2">
                  {groups.length === 0 ? "No todos yet" : "No todos present"}
                </p>
                <p className="text-sm">Click the + button to create your todo</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const filteredTodos = getFilteredTodos(group.todos, group.key, group.isDateBased);

                if (filteredTodos.length === 0) return null;

                return (
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
                          <span className="text-[#6A6A6A] text-sm flex-shrink-0">({filteredTodos.length})</span>
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
                              <AnimatePresence mode="popLayout">
                                {filteredTodos.map((todo, i) => {
                                  if (!todo.id) return null;

                                  const isCompleting = completingTodos.has(todo.id);
                                  const isRemoving = removingTodos.has(todo.id);
                                  const isDeleting = deletingTodos.has(todo.id);
                                  const isRecurring = todo.recurrence?.type !== 'none' || todo.id.includes('-');

                                  return (
                                    <motion.li
                                      key={todo.id}
                                      className="relative"
                                      variants={particleVariants}
                                      initial="initial"
                                      animate={
                                        isDeleting ? "deleting" :
                                          isRemoving ? "exploding" :
                                            isCompleting ? "completing" : "initial"
                                      }
                                      exit={{
                                        opacity: 0,
                                        scale: 0.8,
                                        height: 0,
                                        marginBottom: 0,
                                        transition: { duration: 0.3 }
                                      }}
                                      layout
                                    >
                                      {/* Draggable Todo Item */}
                                      <div
                                        draggable={!isCompleting && !isRemoving && !isDeleting && !!todo.id}
                                        onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                                          if (todo.id) {
                                            handleDragStart(e, todo, todo.id);
                                          }
                                        }}
                                        onDragEnd={handleDragEnd}
                                        onContextMenu={(e) => handleTodoRightClick(e, todo)}
                                        className={`
                                          flex items-center space-x-2 px-2 py-1 rounded-md transition-all duration-200
                                          ${(!isCompleting && !isRemoving && !isDeleting && !!todo.id)
                                            ? 'hover:bg-[#1f1f1f] cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-[1.02]'
                                            : 'cursor-default'
                                          }
                                        `}
                                      >
                                        <TodoRemovalAnimation
                                          isVisible={isRemoving || isDeleting}
                                          color={todo.color || '#C8A2D6'}
                                          particleCount={isDeleting ? 12 : 8}
                                          type={isDeleting ? "burst" : "particles"}
                                        />

                                        {/* Checkbox */}
                                        <label
                                          className="relative flex items-center cursor-pointer flex-shrink-0"
                                          onClick={handleLabelClick}
                                        >
                                          <input
                                            type="checkbox"
                                            className="peer hidden"
                                            checked={isCompleting}
                                            onChange={(e) => handleCheckboxClick(todo, e)}
                                            disabled={isCompleting || isRemoving || isDeleting}
                                          />
                                          <motion.span
                                            className="w-5 h-5 rounded-md border border-[#424242] flex items-center justify-center transition-colors peer-checked:bg-[#C8A2D6] peer-checked:border-[#C8A2D6]"
                                            animate={isCompleting ? {
                                              scale: [1, 1.2, 1],
                                              borderColor: ["#424242", "#C8A2D6", "#C8A2D6"]
                                            } : {}}
                                            transition={{ duration: 0.3 }}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white hidden peer-checked:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          </motion.span>
                                        </label>

                                        {/* Todo Content */}
                                        <div
                                          className="flex-1 flex items-center justify-between min-w-0 cursor-pointer"
                                          onClick={() => handleTodoClick(todo)}
                                        >
                                          <motion.span
                                            className={`text-white text-sm truncate ${isCompleting ? 'line-through opacity-60' : ''
                                              } ${isDeleting ? 'opacity-60' : ''}`}
                                            title={todo.description || todo.title}
                                            animate={isCompleting ? {
                                              opacity: [1, 0.6],
                                              color: ["#ffffff", "#888888"]
                                            } : isDeleting ? {
                                              opacity: [1, 0.6],
                                              color: ["#ffffff", "#ef4444"]
                                            } : {}}
                                            transition={{ duration: 0.5 }}
                                          >
                                            {todo.title}
                                            {/* Show recurrence indicator only for recurring todos */}
                                            {isRecurring && (
                                              <span className="ml-2 text-xs text-[#8B5CF6] opacity-70" title="Recurring Todo">
                                                🔁
                                              </span>
                                            )}
                                          </motion.span>

                                          {/* Indicators */}
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

                                            <div
                                              className="w-3 h-3 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: todo.color }}
                                              title={`Category: ${todo.category}`}
                                            />
                                          </div>
                                        </div>

                                        {/* Success/Delete Indicator */}
                                        {isCompleting && (
                                          <motion.div
                                            className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{
                                              scale: [0, 1.2, 1],
                                              opacity: [0, 1, 1]
                                            }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                          />
                                        )}

                                        {isDeleting && (
                                          <motion.div
                                            className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{
                                              scale: [0, 1.2, 1],
                                              opacity: [0, 1, 1]
                                            }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                          />
                                        )}
                                      </div>
                                    </motion.li>
                                  );
                                })}
                              </AnimatePresence>
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
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
          
          /* Custom drag image styles */
          .drag-image {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}</style>
      </motion.aside>

      {/* Context Menu */}
      <TodoContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        todo={contextMenu.todo}
        onEdit={onEditTodo}
        onDelete={handleTodoDelete}
        onClose={handleCloseContextMenu}
      />

      <TodoDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        todo={selectedTodo}
      />
    </>
  );
}
