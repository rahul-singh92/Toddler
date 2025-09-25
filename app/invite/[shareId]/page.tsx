"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { TodoInvitation, CollaboratorInfo } from "../../types/collaboration";
import { Todo } from "../../types/todo";
import { IconUsers, IconCalendar, IconClock, IconTag, IconCheck, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import TodoCard from "../../components/todo/TodoCard";
import { isSameDay, isThisWeek, isThisMonth } from "../../utils/dateHelpers";
import Image from "next/image";

// Import shared todo components
import SharedTodoHeader from "../../components/sharedTodo/SharedTodoHeader";
import LoginPrompt from "../../components/sharedTodo/LoginPrompt";
import LoadingState from "../../components/sharedTodo/LoadingState";
import ErrorState from "../../components/sharedTodo/ErrorState";
import FilterTabs from "../../components/sharedTodo/FilterTabs";

interface SharedTodoPageState {
  invitation: TodoInvitation | null;
  todos: Todo[];
  loading: boolean;
  error: string;
  userRole: 'viewer' | 'editor' | 'none';
}

export default function SharedTodoPage() {
  const { shareId } = useParams();
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  
  const [state, setState] = useState<SharedTodoPageState>({
    invitation: null,
    todos: [],
    loading: true,
    error: "",
    userRole: 'none'
  });

  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'completed'>('all');
  
  // New state for joining process and authentication
  const [isJoining, setIsJoining] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [shouldAutoAcceptAfterAuth, setShouldAutoAcceptAfterAuth] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Helper function to clean data for Firestore (remove undefined values)
  const cleanFirestoreData = (obj: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursively clean nested objects
          cleaned[key] = cleanFirestoreData(value as Record<string, unknown>);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  };

  // ✅ Store invitation link for post-auth redirect
  useEffect(() => {
    if (typeof window !== 'undefined' && shareId) {
      sessionStorage.setItem('pendingInvitation', shareId as string);
    }
  }, [shareId]);

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!shareId || typeof shareId !== 'string') {
        setState(prev => ({ ...prev, error: "Invalid share link", loading: false }));
        return;
      }

      try {
        // Fetch invitation/share metadata (even for unauthenticated users)
        const inviteDoc = await getDoc(doc(db, 'todoInvitations', shareId));
        
        if (!inviteDoc.exists()) {
          setState(prev => ({ ...prev, error: "This shared link doesn't exist or has expired", loading: false }));
          return;
        }

        const inviteData = inviteDoc.data();
        const invitationData: TodoInvitation = {
          id: inviteDoc.id,
          shareId: inviteData.shareId,
          createdBy: inviteData.createdBy,
          createdAt: inviteData.createdAt?.toDate ? inviteData.createdAt.toDate() : inviteData.createdAt,
          todoIds: inviteData.todoIds || [],
          title: inviteData.title,
          description: inviteData.description,
          expiresAt: inviteData.expiresAt?.toDate ? inviteData.expiresAt.toDate() : inviteData.expiresAt,
          invitedUsers: inviteData.invitedUsers || [],
          acceptedUsers: inviteData.acceptedUsers || [],
          status: inviteData.status
        };
        
        // Check if link has expired
        if (invitationData.expiresAt && invitationData.expiresAt < new Date()) {
          setState(prev => ({ ...prev, error: "This shared link has expired", loading: false }));
          return;
        }

        // ✅ Store invitation data even for unauthenticated users
        setState(prev => ({ 
          ...prev, 
          invitation: invitationData, 
          loading: false
        }));

        // Only fetch todos and determine role if user is authenticated
        if (user) {
          // Determine user role
          let userRole: 'viewer' | 'editor' | 'none' = 'none';
          const collaborator = invitationData.acceptedUsers.find(u => u.userId === user.uid);
          if (collaborator) {
            userRole = collaborator.role === 'admin' ? 'editor' : collaborator.role;
          } else if (invitationData.createdBy === user.uid) {
            userRole = 'editor'; // Owner has editor access
          }

          setState(prev => ({ ...prev, userRole }));

          // Set up real-time listener for todos
          if (invitationData.todoIds.length > 0) {
            const todosRef = collection(db, 'users', invitationData.createdBy, 'todos');
            const todosQuery = query(todosRef, where('__name__', 'in', invitationData.todoIds));

            const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
              const sharedTodos: Todo[] = [];
              snapshot.forEach((todoDoc) => {
                const data = todoDoc.data();
                sharedTodos.push({
                  id: todoDoc.id,
                  title: data.title,
                  description: data.description,
                  category: data.category,
                  links: data.links || [],
                  startTime: data.startTime?.toDate ? data.startTime.toDate() : data.startTime,
                  endTime: data.endTime?.toDate ? data.endTime.toDate() : data.endTime,
                  completed: data.completed,
                  priority: data.priority,
                  color: data.color,
                  style: data.style,
                  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
                  updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date(),
                  sharedWith: data.sharedWith || [],
                  recurrence: {
                    type: data.recurrence?.type || 'none',
                    interval: data.recurrence?.interval,
                    endDate: data.recurrence?.endDate?.toDate ? data.recurrence.endDate.toDate() : data.recurrence?.endDate
                  },
                  ownerId: invitationData.createdBy,
                });
              });
              
              setState(prev => ({ 
                ...prev, 
                todos: sharedTodos
              }));
            }, (error) => {
              console.error("Error fetching shared todos:", error);
              setState(prev => ({ 
                ...prev, 
                error: "Failed to load shared todos"
              }));
            });

            return () => unsubscribe();
          }

          // ✅ Auto-accept invitation if user just signed in
          if (shouldAutoAcceptAfterAuth && userRole === 'none') {
            setShouldAutoAcceptAfterAuth(false);
            handleAcceptInvitation();
          }
        }

      } catch (error) {
        console.error("Error fetching shared data:", error);
        setState(prev => ({ 
          ...prev, 
          error: "Failed to load shared data", 
          loading: false 
        }));
      }
    };

    // Only fetch data after auth loading is complete
    if (!authLoading) {
      fetchSharedData();
    }
  }, [shareId, user, authLoading, shouldAutoAcceptAfterAuth]);

  // ✅ Enhanced Google Sign In with Error Handling
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLoginError(null); // Clear previous errors
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // Set flag to auto-accept invitation after successful sign in
        setShouldAutoAcceptAfterAuth(true);
        console.log("✅ Successfully signed in:", result.user.email);
      }
    } catch (error: unknown) {
    console.error("❌ Sign in error:", error);
  
    // Handle different types of auth errors
    let errorMessage = "Failed to sign in. Please try again.";
  
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as { code: string };
      if (authError.code === 'auth/cancelled-popup-request' || authError.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign in was cancelled. Please try again if you want to join the collaboration.";
      } else if (authError.code === 'auth/popup-blocked') {
        errorMessage = "Pop-up was blocked by your browser. Please enable pop-ups and try again.";
      } else if (authError.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (authError.code === 'auth/too-many-requests') {
        errorMessage = "Too many sign-in attempts. Please wait a moment and try again.";
      }
    }
      
      setLoginError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle todo completion toggle (only if user has editor role)
  const handleTodoToggle = async (todo: Todo) => {
    if (!user || !state.invitation || state.userRole !== 'editor' || !todo.id) return;

    try {
      const todoRef = doc(db, 'users', state.invitation.createdBy, 'todos', todo.id);
      await updateDoc(todoRef, {
        completed: !todo.completed,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  // ✅ Handle accepting invitation directly
  const handleAcceptInvitation = async () => {
    if (!user || !state.invitation) {
      console.error("User not authenticated or invitation not loaded");
      return;
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = state.invitation.acceptedUsers.some(u => u.userId === user.uid);
    if (isAlreadyCollaborator) {
      // Already a collaborator, just redirect
      router.push('/todo');
      return;
    }

    setIsJoining(true);

    try {
      console.log("🤝 Starting invitation acceptance process...");

      // Get current user's data from Firestore for proper display name
      const currentUserRef = doc(db, 'users', user.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : null;

      const currentUserDisplayName = currentUserData 
        ? `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || 
          user.email!.split('@')[0]
        : user.displayName || user.email!.split('@')[0];

      // Create collaborator info
      const collaboratorInfo: CollaboratorInfo = {
        email: user.email!,
        displayName: currentUserDisplayName,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        userId: user.uid,
        acceptedAt: new Date(),
        role: 'editor'
      };

      // Get owner info for sharedBy field
      const ownerRef = doc(db, 'users', state.invitation.createdBy);
      const ownerSnap = await getDoc(ownerRef);
      const ownerData = ownerSnap.exists() ? ownerSnap.data() : null;

      const ownerDisplayName = ownerData
        ? `${ownerData.firstName || ''} ${ownerData.lastName || ''}`.trim() ||
          ownerData.email?.split('@')[0] || 'Unknown User'
          : 'Unknown User';

      const sharedByInfo = {
        userId: state.invitation.createdBy,
        displayName: ownerDisplayName,
        email: ownerData?.email || '',
        photoURL: ownerData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.invitation.createdBy}`
      };

      // Use batch write for all operations
      const batch = writeBatch(db);

      // 1. Update invitation with accepted user
      const inviteRef = doc(db, 'todoInvitations', state.invitation.id);
      batch.update(inviteRef, {
        acceptedUsers: arrayUnion(collaboratorInfo),
        status: 'active'
      });

      // 2. Update original todos with new collaborator
      for (const todo of state.todos) {
        if (todo.id) {
          const originalTodoRef = doc(db, 'users', state.invitation.createdBy, 'todos', todo.id);
          batch.update(originalTodoRef, {
            sharedWith: arrayUnion(collaboratorInfo)
          });
        }
      }

      // 3. Copy shared todos to accepting user's collection
      for (const todo of state.todos) {
        const newTodoRef = doc(collection(db, 'users', user.uid, 'todos'));
        
        const sharedTodo = {
          title: todo.title,
          description: todo.description || "",
          category: todo.category || "",
          links: todo.links || [],
          startTime: todo.startTime || null,
          endTime: todo.endTime || null,
          completed: todo.completed || false,
          priority: todo.priority || 'medium',
          color: todo.color || '#6366f1',
          style: todo.style || null,
          recurrence: {
            type: todo.recurrence?.type || 'none',
            interval: todo.recurrence?.interval || null,
            endDate: todo.recurrence?.endDate || null
          },
          sharedWith: [collaboratorInfo],
          
          // Collaboration fields
          isShared: true,
          originalId: todo.id,
          originalOwnerId: state.invitation.createdBy,
          collaborationType: 'collaborator' as const,
          sharedBy: sharedByInfo,
          ownerId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Clean the data before adding to batch
        const cleanedTodo = cleanFirestoreData(sharedTodo);
        batch.set(newTodoRef, cleanedTodo);
      }

      await batch.commit();

      console.log("✅ Successfully accepted invitation and copied todos!");

      // Clear the pending invitation
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingInvitation');
      }

      // Show success state briefly before redirect
      setState(prev => ({ ...prev, userRole: 'editor' }));
      
      // Redirect to main todo page after 1 second
      setTimeout(() => {
        router.push('/todo');
      }, 1000);

    } catch (error: unknown) {
      console.error("❌ Error accepting invitation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        error: `Failed to join collaboration: ${errorMessage}` 
      }));
    } finally {
      setIsJoining(false);
    }
  };

  // Filter todos based on selected filter
  const getFilteredTodos = () => {
    return state.todos.filter(todo => {
      switch (filter) {
        case 'week':
          return todo.startTime ? isThisWeek(todo.startTime) : isThisWeek(todo.createdAt);
        case 'month':
          return todo.startTime ? isThisMonth(todo.startTime) : isThisMonth(todo.createdAt);
        case 'completed':
          return todo.completed;
        default:
          return true;
      }
    });
  };

  const filteredTodos = getFilteredTodos();

  // Group todos by date
  const todayTodos = filteredTodos.filter(todo => {
    const date = todo.startTime || todo.createdAt;
    return isSameDay(date, new Date());
  });

  const upcomingTodos = filteredTodos.filter(todo => {
    const date = todo.startTime || todo.createdAt;
    return date > new Date() && !isSameDay(date, new Date());
  });

  const pastTodos = filteredTodos.filter(todo => {
    const date = todo.startTime || todo.createdAt;
    return date < new Date() && !isSameDay(date, new Date()) && !todo.completed;
  });

  // ✅ Show loading state
  if (authLoading || (state.loading && !state.invitation)) {
    return <LoadingState />;
  }

  // ✅ Show error state
  if (state.error) {
    return <ErrorState error={state.error} />;
  }

  // ✅ Show login required state for unauthenticated users
  if (!user && state.invitation) {
    return (
      <LoginPrompt 
        invitation={state.invitation}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        loginError={loginError}
      />
    );
  }

  const { invitation, todos, userRole } = state;

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header with dark theme */}
      <SharedTodoHeader 
        invitation={invitation}
        userRole={userRole}
        onAcceptInvitation={handleAcceptInvitation}
        onSignIn={handleSignIn}
        isJoining={isJoining}
        isSigningIn={isSigningIn}
        user={user}
        loginError={loginError}
      />

      {/* Main Content */}
      <div className="p-6">
        {/* Collaboration Stats Bar */}
        <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-4 mb-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <IconCalendar size={16} className="text-[#C8A2D6]" />
                <span className="font-medium">{todos.length} todos</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <IconUsers size={16} className="text-[#C8A2D6]" />
                <span className="font-medium">{invitation?.acceptedUsers.length || 0} collaborators</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <IconCheck size={16} className="text-[#C8A2D6]" />
                <span className="font-medium">{todos.filter(t => t.completed).length} completed</span>
              </div>
              {invitation?.expiresAt && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <IconClock size={16} className="text-[#C8A2D6]" />
                  <span>Expires {invitation.expiresAt.toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Team Avatars */}
            {invitation?.acceptedUsers && invitation.acceptedUsers.length > 0 && (
              <div className="flex -space-x-2">
                {invitation.acceptedUsers.slice(0, 4).map((collaborator) => (
                  <div key={collaborator.userId} className="relative group">
                    <Image
                      src={collaborator.photoURL}
                      alt={collaborator.displayName}
                      className="w-8 h-8 rounded-full border-2 border-[#C8A2D6] shadow-sm"
                    />
                  </div>
                ))}
                {invitation.acceptedUsers.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-[#C8A2D6] shadow-sm flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-300">
                      +{invitation.acceptedUsers.length - 4}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <FilterTabs 
          todos={state.todos}
          filter={filter}
          filteredTodos={filteredTodos}
          onFilterChange={setFilter}
        />

        {/* Content */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
              <IconCalendar size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No todos found</h3>
            <p className="text-gray-400">
              {filter === 'all' 
                ? "No todos have been shared yet." 
                : `No todos match the ${filter} filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Today's Todos */}
            {todayTodos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <div className="w-2 h-2 bg-[#C8A2D6] rounded-full mr-3"></div>
                  Today ({todayTodos.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todayTodos.map(todo => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTodo(todo);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <TodoCard
                          todo={todo}
                          onClick={() => {}}
                        />
                      </div>
                      {userRole === 'editor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTodoToggle(todo);
                          }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            todo.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-600 hover:border-[#C8A2D6] bg-[#1A1A1A] text-gray-400 hover:text-[#C8A2D6]'
                          }`}
                        >
                          {todo.completed && <IconCheck size={12} />}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Todos */}
            {upcomingTodos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  Upcoming ({upcomingTodos.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTodos.map(todo => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTodo(todo);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <TodoCard
                          todo={todo}
                          onClick={() => {}}
                        />
                      </div>
                      {userRole === 'editor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTodoToggle(todo);
                          }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            todo.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-600 hover:border-[#C8A2D6] bg-[#1A1A1A] text-gray-400 hover:text-[#C8A2D6]'
                          }`}
                        >
                          {todo.completed && <IconCheck size={12} />}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Todos */}
            {pastTodos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                  Past ({pastTodos.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastTodos.map(todo => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTodo(todo);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <TodoCard
                          todo={todo}
                          onClick={() => {}}
                        />
                      </div>
                      {userRole === 'editor' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTodoToggle(todo);
                          }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            todo.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-600 hover:border-[#C8A2D6] bg-[#1A1A1A] text-gray-400 hover:text-[#C8A2D6]'
                          }`}
                        >
                          {todo.completed && <IconCheck size={12} />}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Todo Details Modal (Dark Theme) */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedTodo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={() => setIsDetailsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1A1A] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">{selectedTodo.title}</h2>
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="p-2 rounded hover:bg-gray-800 transition-colors"
                  >
                    <IconX size={20} className="text-gray-400" />
                  </button>
                </div>

                {selectedTodo.description && (
                  <p className="text-gray-300 mb-4">{selectedTodo.description}</p>
                )}

                <div className="space-y-3">
                  {selectedTodo.category && (
                    <div className="flex items-center space-x-2 text-sm">
                      <IconTag size={16} className="text-[#C8A2D6]" />
                      <span className="text-gray-400">{selectedTodo.category}</span>
                    </div>
                  )}

                  {selectedTodo.startTime && (
                    <div className="flex items-center space-x-2 text-sm">
                      <IconClock size={16} className="text-[#C8A2D6]" />
                      <span className="text-gray-400">
                        {selectedTodo.startTime.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm">
                    <IconCheck size={16} className="text-[#C8A2D6]" />
                    <span className={`font-medium ${
                      selectedTodo.completed ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {selectedTodo.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  {selectedTodo.priority && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedTodo.priority === 'high' ? 'bg-red-400' :
                        selectedTodo.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}></div>
                      <span className="text-gray-400 capitalize">{selectedTodo.priority} priority</span>
                    </div>
                  )}
                </div>

                {userRole === 'editor' && (
                  <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => {
                        handleTodoToggle(selectedTodo);
                        setIsDetailsModalOpen(false);
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedTodo.completed
                          ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-700'
                          : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-700'
                      }`}
                    >
                      Mark as {selectedTodo.completed ? 'Pending' : 'Complete'}
                    </button>
                  </div>
                )}

                {userRole === 'none' && (
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400 text-center mb-4">
                      Join this collaboration to interact with todos
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={handleAcceptInvitation}
                        disabled={isJoining}
                        className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                          isJoining 
                            ? 'bg-gray-700 cursor-not-allowed' 
                            : 'bg-[#C8A2D6] hover:bg-[#B591C8] shadow-lg'
                        }`}
                      >
                        {isJoining ? 'Joining...' : 'Join Collaboration'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
