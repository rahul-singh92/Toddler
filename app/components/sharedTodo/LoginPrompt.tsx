"use client";
import Image from "next/image";
import { IconUsers, IconCalendar, IconClock, IconLogin } from "@tabler/icons-react";
import { TodoInvitation} from "../../types/collaboration";
import TeamMembersList from "./TeamMembersList";

interface LoginPromptProps {
  invitation: TodoInvitation;
  onSignIn: () => void;
  isSigningIn: boolean;
  loginError?: string | null;
}

export default function LoginPrompt({ 
  invitation, 
  onSignIn, 
  isSigningIn,
  loginError 
}: LoginPromptProps) {
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
            style={{ width: "auto", height: "auto", maxWidth: "200px", maxHeight: "200px" }}
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
              <h2 className="text-xl font-bold text-white mb-2">You&apos;ve been invited to collaborate!</h2>
              <p className="text-gray-400">
                {invitation.title && (
                  <>Join &quot;<strong className="text-[#C8A2D6]">{invitation.title}</strong>&quot; to start collaborating on todos</>
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 mb-6">
              <div className="flex items-center space-x-2">
                <IconCalendar size={16} className="text-[#C8A2D6]" />
                <span>{invitation.todoIds.length} todos</span>
              </div>
              <div className="flex items-center space-x-2">
                <IconUsers size={16} className="text-[#C8A2D6]" />
                <span>{invitation.acceptedUsers.length} members</span>
              </div>
              {invitation.expiresAt && (
                <div className="flex items-center space-x-2">
                  <IconClock size={16} className="text-[#C8A2D6]" />
                  <span>Expires {invitation.expiresAt.toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <div className="text-center">
              <button
                onClick={onSignIn}
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
                After signing in, you&apos;ll automatically join this collaboration.
              </p>

              {/* Login Error Message */}
              {loginError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-400">
                    {loginError}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Team Members */}
          {invitation.acceptedUsers && invitation.acceptedUsers.length > 0 && (
            <TeamMembersList collaborators={invitation.acceptedUsers} />
          )}
        </div>
      </div>
    </div>
  );
}
