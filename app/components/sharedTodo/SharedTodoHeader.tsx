"use client";
import Image from "next/image";
import { TodoInvitation } from "../../types/collaboration";

interface SharedTodoHeaderProps {
  invitation: TodoInvitation | null;
  userRole: 'viewer' | 'editor' | 'none';
  onAcceptInvitation: () => void;
  onSignIn: () => void;
  isJoining: boolean;
  isSigningIn: boolean;
  user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } | null | undefined;
  loginError?: string | null;
}

export default function SharedTodoHeader({ 
  invitation,
  userRole,
  onAcceptInvitation,
  onSignIn,
  isJoining,
  isSigningIn,
  user,
  loginError
}: SharedTodoHeaderProps) {
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
            style={{ width: "auto", height: "auto", maxWidth: "200px", maxHeight: "200px" }}
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
          <div className="flex flex-col items-end space-y-2">
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
            
            {/* Login Error Message */}
            {loginError && (
              <div className="text-xs text-red-400 bg-red-900/20 px-3 py-1 rounded border border-red-700">
                {loginError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
