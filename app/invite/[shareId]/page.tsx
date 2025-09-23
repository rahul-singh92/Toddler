"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, writeBatch, arrayUnion, setDoc, deleteDoc } from "firebase/firestore";
import { TodoInvitation, CollaboratorInfo } from "../../types/collaboration";
import { Todo } from "../../types/todo";
import { IconUsers, IconCalendar, IconClock, IconTag, IconArrowLeft, IconCheck, IconX, IconEye, IconEdit, IconShare, IconExternalLink } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import TodoCard from "../../components/todo/TodoCard";
import { isSameDay, isThisWeek, isThisMonth } from "../../utils/dateHelpers";

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
  
  // New state for joining process
  const [isJoining, setIsJoining] = useState(false);

  // Helper function to clean data for Firestore (remove undefined values)
  const cleanFirestoreData = (obj: any): any => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursively clean nested objects
          cleaned[key] = cleanFirestoreData(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  };

  useEffect(() => {
    const fetchSharedData = async () => {
      if (!shareId || typeof shareId !== 'string') {
        setState(prev => ({ ...prev, error: "Invalid share link", loading: false }));
        return;
      }

      try {
        // Fetch invitation/share metadata
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

        // Determine user role
        let userRole: 'viewer' | 'editor' | 'none' = 'none';
        if (user) {
          const collaborator = invitationData.acceptedUsers.find(u => u.userId === user.uid);
          if (collaborator) {
            userRole = collaborator.role === 'admin' ? 'editor' : collaborator.role;
          } else if (invitationData.createdBy === user.uid) {
            userRole = 'editor'; // Owner has editor access
          }
        }

        setState(prev => ({ 
          ...prev, 
          invitation: invitationData, 
          userRole 
        }));

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
              todos: sharedTodos, 
              loading: false 
            }));
          }, (error) => {
            console.error("Error fetching shared todos:", error);
            setState(prev => ({ 
              ...prev, 
              error: "Failed to load shared todos", 
              loading: false 
            }));
          });

          return () => unsubscribe();
        } else {
          setState(prev => ({ ...prev, loading: false }));
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

    fetchSharedData();
  }, [shareId, user]);

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

  // ✅ UPDATED: Handle accepting invitation directly with comprehensive debugging
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
      console.log("User ID:", user.uid);
      console.log("Invitation ID:", state.invitation.id);
      console.log("Creator ID:", state.invitation.createdBy);
      console.log("Todo count:", state.todos.length);

      // Create collaborator info
      const collaboratorInfo: CollaboratorInfo = {
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        userId: user.uid,
        acceptedAt: new Date(),
        role: 'editor'
      };

      console.log("👤 Collaborator info:", collaboratorInfo);

      // Get owner info for sharedBy field
      console.log("🔍 Fetching owner info...");
      const ownerRef = doc(db, 'users', state.invitation.createdBy);
      const ownerSnap = await getDoc(ownerRef);
      const ownerData = ownerSnap.exists() ? ownerSnap.data() : null;

      console.log("👑 Owner data:", ownerData ? "Found" : "Not found");

      const sharedByInfo = {
        userId: state.invitation.createdBy,
        displayName: ownerData?.displayName || 'Unknown User',
        email: ownerData?.email || '',
        photoURL: ownerData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.invitation.createdBy}`
      };

      console.log("📋 SharedBy info:", sharedByInfo);

      // Test individual operations first to isolate the issue
      console.log("🧪 TESTING INDIVIDUAL OPERATIONS...");

      // Test 1: Try updating invitation only
      try {
        console.log("🧪 Test 1: Updating invitation...");
        const inviteRef = doc(db, 'todoInvitations', state.invitation.id);
        await updateDoc(inviteRef, {
          acceptedUsers: arrayUnion(collaboratorInfo),
          status: 'active'
        });
        console.log("✅ Test 1 PASSED: Invitation updated successfully");
      } catch (error) {
        console.error("❌ Test 1 FAILED: Error updating invitation:", error);
        throw new Error("Failed at invitation update");
      }

      // Test 2: Try updating one original todo
      if (state.todos.length > 0 && state.todos[0].id) {
        try {
          console.log("🧪 Test 2: Updating original todo...");
          const firstTodoRef = doc(db, 'users', state.invitation.createdBy, 'todos', state.todos[0].id);
          await updateDoc(firstTodoRef, {
            sharedWith: arrayUnion(collaboratorInfo)
          });
          console.log("✅ Test 2 PASSED: Original todo updated successfully");
        } catch (error) {
          console.error("❌ Test 2 FAILED: Error updating original todo:", error);
          console.error("Todo path:", `users/${state.invitation.createdBy}/todos/${state.todos[0].id}`);
          throw new Error("Failed at original todo update");
        }
      }

      // Test 3: Try creating one new todo
      try {
        console.log("🧪 Test 3: Creating new todo...");
        const testTodo = state.todos[0];
        const newTodoRef = doc(collection(db, 'users', user.uid, 'todos'));
        
        const sharedTodo = {
          title: testTodo.title + " (Test)",
          description: testTodo.description || "",
          category: testTodo.category || "",
          links: testTodo.links || [],
          startTime: testTodo.startTime || null,
          endTime: testTodo.endTime || null,
          completed: testTodo.completed || false,
          priority: testTodo.priority || 'medium',
          color: testTodo.color || '#6366f1',
          style: testTodo.style || null,
          recurrence: {
            type: testTodo.recurrence?.type || 'none',
            interval: testTodo.recurrence?.interval || null,
            endDate: testTodo.recurrence?.endDate || null
          },
          sharedWith: [collaboratorInfo],
          
          // Collaboration fields
          isShared: true,
          originalId: testTodo.id,
          originalOwnerId: state.invitation.createdBy,
          collaborationType: 'collaborator' as const,
          sharedBy: sharedByInfo,
          ownerId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Clean the data before saving
        const cleanedTodo = cleanFirestoreData(sharedTodo);
        console.log("📝 Test todo data:", cleanedTodo);
        
        await setDoc(newTodoRef, cleanedTodo);
        console.log("✅ Test 3 PASSED: New todo created successfully");
        
        // Clean up test todo
        await deleteDoc(newTodoRef);
        console.log("🧹 Test todo cleaned up");
        
      } catch (error) {
        console.error("❌ Test 3 FAILED: Error creating new todo:", error);
        console.error("User path:", `users/${user.uid}/todos`);
        throw new Error("Failed at new todo creation");
      }

      console.log("🎉 ALL TESTS PASSED! Proceeding with batch operation...");

      // Now proceed with the full batch operation
      const batch = writeBatch(db);

      // 1. Update invitation with accepted user
      console.log("📦 Batch: Adding invitation update...");
      const inviteRef = doc(db, 'todoInvitations', state.invitation.id);
      batch.update(inviteRef, {
        acceptedUsers: arrayUnion(collaboratorInfo),
        status: 'active'
      });

      // 2. Update original todos with new collaborator
      console.log("📦 Batch: Adding original todos updates...");
      for (const todo of state.todos) {
        if (todo.id) {
          const originalTodoRef = doc(db, 'users', state.invitation.createdBy, 'todos', todo.id);
          batch.update(originalTodoRef, {
            sharedWith: arrayUnion(collaboratorInfo)
          });
        }
      }

      // 3. Copy shared todos to accepting user's collection
      console.log("📦 Batch: Adding new todos creation...");
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

      console.log("📦 Committing batch with", state.todos.length * 2 + 1, "operations...");
      await batch.commit();

      console.log("✅ Successfully accepted invitation and copied todos!");

      // Show success state briefly before redirect
      setState(prev => ({ ...prev, userRole: 'editor' }));
      
      // Redirect to main todo page after 1 second
      setTimeout(() => {
        router.push('/todo');
      }, 1000);

    } catch (error: any) {
      console.error("❌ Error accepting invitation:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      setState(prev => ({ 
        ...prev, 
        error: `Failed to join collaboration: ${error.message || 'Unknown error'}` 
      }));
    } finally {
      setIsJoining(false);
    }
  };

  // Handle sharing this link
  const handleShareLink = async () => {
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      console.log("Link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
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

  if (authLoading || state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared todos...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconX size={32} className="text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Shared Todos</h1>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <div className="space-x-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { invitation, todos, userRole } = state;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <IconArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invitation?.title}</h1>
                <p className="text-sm text-gray-600 mt-1">{invitation?.description}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                userRole === 'editor' 
                  ? 'bg-green-100 text-green-700' 
                  : userRole === 'viewer' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {userRole === 'editor' ? (
                  <>
                    <IconEdit size={12} />
                    <span>Editor</span>
                  </>
                ) : userRole === 'viewer' ? (
                  <>
                    <IconEye size={12} />
                    <span>Viewer</span>
                  </>
                ) : (
                  <>
                    <IconUsers size={12} />
                    <span>Public View</span>
                  </>
                )}
              </div>

              {/* Share Link Button */}
              <button
                onClick={handleShareLink}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Copy share link"
              >
                <IconShare size={16} className="text-gray-600" />
              </button>

              {/* Join Collaboration Button */}
              {userRole === 'none' && user && (
                <button
                  onClick={handleAcceptInvitation}
                  disabled={isJoining}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                    isJoining 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isJoining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <IconExternalLink size={14} />
                      <span>Join Collaboration</span>
                    </>
                  )}
                </button>
              )}

              {/* Success state for joined users */}
              {userRole === 'editor' && isJoining && (
                <div className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg flex items-center space-x-2">
                  <IconCheck size={14} />
                  <span>Joined! Redirecting...</span>
                </div>
              )}

              {/* Sign In Button */}
              {!user && (
                <button
                  onClick={() => {/* Add your auth flow */}}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Collaboration Info */}
          <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <IconCalendar size={16} />
              <span>{todos.length} todos</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <IconUsers size={16} />
              <span>{invitation?.acceptedUsers.length || 0} collaborators</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <IconCheck size={16} />
              <span>{todos.filter(t => t.completed).length} completed</span>
            </div>
            {invitation?.expiresAt && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <IconClock size={16} />
                <span>Expires {invitation.expiresAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Collaborators Avatars */}
          {invitation?.acceptedUsers && invitation.acceptedUsers.length > 0 && (
            <div className="flex items-center space-x-3 mt-4">
              <span className="text-sm font-medium text-gray-700">Team:</span>
              <div className="flex -space-x-2">
                {invitation.acceptedUsers.slice(0, 5).map((collaborator) => (
                  <div key={collaborator.userId} className="relative group">
                    <img
                      src={collaborator.photoURL}
                      alt={collaborator.displayName}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {collaborator.displayName} ({collaborator.role})
                    </div>
                  </div>
                ))}
                {invitation.acceptedUsers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      +{invitation.acceptedUsers.length - 5}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all', label: 'All', count: state.todos.length },
            { key: 'week', label: 'This Week', count: state.todos.filter(t => t.startTime ? isThisWeek(t.startTime) : isThisWeek(t.createdAt)).length },
            { key: 'month', label: 'This Month', count: state.todos.filter(t => t.startTime ? isThisMonth(t.startTime) : isThisMonth(t.createdAt)).length },
            { key: 'completed', label: 'Completed', count: state.todos.filter(t => t.completed).length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.key === filter ? filteredTodos.length : tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCalendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
            <p className="text-gray-600">
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
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
                              : 'border-gray-300 hover:border-green-400 bg-white'
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
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
                              : 'border-gray-300 hover:border-green-400 bg-white'
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
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
                              : 'border-gray-300 hover:border-green-400 bg-white'
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

      {/* Todo Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedTodo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsDetailsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedTodo.title}</h2>
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <IconX size={20} className="text-gray-400" />
                  </button>
                </div>

                {selectedTodo.description && (
                  <p className="text-gray-700 mb-4">{selectedTodo.description}</p>
                )}

                <div className="space-y-3">
                  {selectedTodo.category && (
                    <div className="flex items-center space-x-2 text-sm">
                      <IconTag size={16} className="text-gray-400" />
                      <span className="text-gray-600">{selectedTodo.category}</span>
                    </div>
                  )}

                  {selectedTodo.startTime && (
                    <div className="flex items-center space-x-2 text-sm">
                      <IconClock size={16} className="text-gray-400" />
                      <span className="text-gray-600">
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
                    <IconCheck size={16} className="text-gray-400" />
                    <span className={`font-medium ${
                      selectedTodo.completed ? 'text-green-600' : 'text-orange-600'
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
                      <span className="text-gray-600 capitalize">{selectedTodo.priority} priority</span>
                    </div>
                  )}
                </div>

                {userRole === 'editor' && (
                  <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        handleTodoToggle(selectedTodo);
                        setIsDetailsModalOpen(false);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTodo.completed
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      Mark as {selectedTodo.completed ? 'Pending' : 'Complete'}
                    </button>
                  </div>
                )}

                {userRole === 'none' && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center mb-4">
                      Join this collaboration to interact with todos
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={handleAcceptInvitation}
                        disabled={isJoining}
                        className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                          isJoining 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
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
