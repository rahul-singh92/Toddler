"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, writeBatch, arrayUnion, setDoc, deleteDoc } from "firebase/firestore";
import { TodoInvitation, CollaboratorInfo } from "../../types/collaboration";
import { Todo } from "../../types/todo";
import { IconUsers, IconCalendar, IconClock, IconTag, IconArrowLeft, IconCheck, IconX, IconEye, IconEdit, IconExternalLink, IconLogin } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import TodoCard from "../../components/todo/TodoCard";
import { isSameDay, isThisWeek, isThisMonth } from "../../utils/dateHelpers";
import Image from "next/image";

interface SharedTodoPageState {
  invitation: TodoInvitation | null;
  todos: Todo[];
  loading: boolean;
  error: string;
  userRole: 'viewer' | 'editor' | 'none';
}

function HeaderBar({ 
  invitation,
  userRole,
  onAcceptInvitation,
  onSignIn,
  isJoining,
  isSigningIn,
  user
}: { 
  invitation: TodoInvitation | null;
  userRole: 'viewer' | 'editor' | 'none';
  onAcceptInvitation: () => void;
  onSignIn: () => void;
  isJoining: boolean;
  isSigningIn: boolean;
  user: any;
}) {
  return (
    <div className="sticky top-0 z-30 bg-[#1A1A1A] px-8 py-6 border-b border-gray-800">
      <div className="flex flex-col space-y-4">
        {/* Logo Row - Full width, centered */}
        <div className="flex justify-center">
          <Image 
            src="/images/Logo.svg" 
            alt="Logo" 
            width={200} 
            height={200}
            priority
            style={{height: "auto"}}
            className="drop-shadow-lg" 
          />
        </div>
        
        {/* Content Row - Title and Actions */}
        <div className="flex items-center justify-between">
          {/* Left section with Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">{invitation?.title || 'Shared Todos'}</h1>
            {invitation?.description && (
              <>
                <span className="text-4xl leading-none text-gray-600">/</span>
                <span className="font-semibold text-lg text-[#C8A2D6]">{invitation.description}</span>
              </>
            )}
          </div>

          {/* Right section with actions */}
          <div className="flex space-x-3">
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-md text-xs font-medium ${
              userRole === 'editor' 
                ? 'bg-green-900/30 text-green-400 border border-green-700' 
                : userRole === 'viewer' 
                ? 'bg-blue-900/30 text-blue-400 border border-blue-700' 
                : 'bg-gray-800 text-gray-300 border border-gray-700'
            }`}>
              {userRole === 'editor' ? 'Editor' : userRole === 'viewer' ? 'Viewer' : 'Guest'}
            </div>

            {/* Join Collaboration Button */}
            {userRole === 'none' && user && (
              <button
                onClick={onAcceptInvitation}
                disabled={isJoining}
                className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                  isJoining 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-[#C8A2D6] hover:bg-[#B591C8] shadow-lg'
                }`}
              >
                {isJoining ? 'Joining...' : 'Join Collaboration'}
              </button>
            )}

            {/* Success state for joined users */}
            {userRole === 'editor' && isJoining && (
              <div className="px-4 py-2 bg-green-900/30 text-green-400 text-sm font-medium rounded-md border border-green-700">
                Joined! Redirecting...
              </div>
            )}

            {/* Sign In Button */}
            {!user && (
              <button
                onClick={onSignIn}
                disabled={isSigningIn}
                className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                  isSigningIn 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-[#C8A2D6] hover:bg-[#B591C8] shadow-lg'
                }`}
              >
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

  // ✅ Handle Google Sign In
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      // Set flag to auto-accept invitation after successful sign in
      setShouldAutoAcceptAfterAuth(true);
    } catch (error) {
      console.error("Sign in error:", error);
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

  // ✅ UPDATED: Handle accepting invitation directly
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

      // Create collaborator info
      const collaboratorInfo: CollaboratorInfo = {
        email: user.email!,
        displayName: user.displayName || user.email!.split('@')[0],
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        userId: user.uid,
        acceptedAt: new Date(),
        role: 'editor'
      };

      // Get owner info for sharedBy field
      const ownerRef = doc(db, 'users', state.invitation.createdBy);
      const ownerSnap = await getDoc(ownerRef);
      const ownerData = ownerSnap.exists() ? ownerSnap.data() : null;

      const sharedByInfo = {
        userId: state.invitation.createdBy,
        displayName: ownerData?.displayName || 'Unknown User',
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

    } catch (error: any) {
      console.error("❌ Error accepting invitation:", error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to join collaboration: ${error.message || 'Unknown error'}` 
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

  // ✅ Show loading while auth is loading (Dark Theme)
  if (authLoading || (state.loading && !state.invitation)) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-[#C8A2D6] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading shared todos...</p>
        </div>
      </div>
    );
  }

  // ✅ Show error state (Dark Theme)
  if (state.error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-700">
            <IconX size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Error Loading Shared Todos</h1>
          <p className="text-gray-400 mb-6">{state.error}</p>
          <div className="space-x-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors border border-gray-700"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#C8A2D6] text-white rounded-md hover:bg-[#B591C8] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show login required state for unauthenticated users (Dark Theme)
  if (!user && state.invitation) {
    return (
      <div className="min-h-screen bg-[#0F0F0F]">
        {/* Header matching dark style with bigger logo */}
        <div className="sticky top-0 z-30 bg-[#1A1A1A] px-8 py-6 border-b border-gray-800">
          <div className="flex flex-col items-center space-y-4">
            {/* Big Logo */}
            <Image 
              src="/images/Logo.svg" 
              alt="Logo" 
              width={200} 
              height={200}
              priority
              style={{height: "auto"}}
              className="drop-shadow-lg" 
            />
            {/* Title */}
            <h1 className="text-2xl font-bold text-white">Join Collaboration</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Invitation Preview Card */}
            <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 mb-6 border border-gray-800">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#C8A2D6] rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <IconUsers size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">You've been invited to collaborate!</h2>
                <p className="text-gray-400">
                  {state.invitation.title && (
                    <>Join "<strong className="text-[#C8A2D6]">{state.invitation.title}</strong>" to start collaborating on todos</>
                  )}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 mb-6">
                <div className="flex items-center space-x-2">
                  <IconCalendar size={16} className="text-[#C8A2D6]" />
                  <span>{state.invitation.todoIds.length} todos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconUsers size={16} className="text-[#C8A2D6]" />
                  <span>{state.invitation.acceptedUsers.length} members</span>
                </div>
                {state.invitation.expiresAt && (
                  <div className="flex items-center space-x-2">
                    <IconClock size={16} className="text-[#C8A2D6]" />
                    <span>Expires {state.invitation.expiresAt.toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Sign In Button */}
              <div className="text-center">
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className={`px-6 py-3 text-white text-sm font-medium rounded-md transition-colors shadow-lg ${
                    isSigningIn
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-[#C8A2D6] hover:bg-[#B591C8]'
                  }`}
                >
                  {isSigningIn ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <IconLogin size={16} />
                      <span>Sign in with Google</span>
                    </div>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-4">
                  After signing in, you'll automatically join this collaboration.
                </p>
              </div>
            </div>

            {/* Collaborators if any */}
            {state.invitation.acceptedUsers && state.invitation.acceptedUsers.length > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Current Team Members</h3>
                <div className="flex -space-x-2">
                  {state.invitation.acceptedUsers.slice(0, 5).map((collaborator) => (
                    <div key={collaborator.userId} className="relative group">
                      <img
                        src={collaborator.photoURL}
                        alt={collaborator.displayName}
                        className="w-10 h-10 rounded-full border-2 border-[#C8A2D6] shadow-sm"
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {collaborator.displayName} ({collaborator.role})
                      </div>
                    </div>
                  ))}
                  {state.invitation.acceptedUsers.length > 5 && (
                    <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-[#C8A2D6] shadow-sm flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-300">
                        +{state.invitation.acceptedUsers.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { invitation, todos, userRole } = state;

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header with dark theme */}
      <HeaderBar 
        invitation={invitation}
        userRole={userRole}
        onAcceptInvitation={handleAcceptInvitation}
        onSignIn={handleSignIn}
        isJoining={isJoining}
        isSigningIn={isSigningIn}
        user={user}
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
                    <img
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

        {/* ✅ UPDATED Filter Tabs with Dark Theme and #C8A2D6 styling */}
        <div className="bg-[#1A1A1A] p-1 rounded-lg w-fit mb-6 border border-gray-800">
          {[
            { key: 'all', label: 'All', count: state.todos.length },
            { key: 'week', label: 'This Week', count: state.todos.filter(t => t.startTime ? isThisWeek(t.startTime) : isThisWeek(t.createdAt)).length },
            { key: 'month', label: 'This Month', count: state.todos.filter(t => t.startTime ? isThisMonth(t.startTime) : isThisMonth(t.createdAt)).length },
            { key: 'completed', label: 'Completed', count: state.todos.filter(t => t.completed).length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                filter === tab.key
                  ? 'bg-[#C8A2D6] text-white shadow-lg border-2 border-[#C8A2D6]'
                  : 'text-gray-400 hover:text-white border-2 border-transparent hover:border-[#C8A2D6]/30 hover:bg-[#C8A2D6]/10'
              }`}
            >
              {tab.label} ({tab.key === filter ? filteredTodos.length : tab.count})
            </button>
          ))}
        </div>

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
