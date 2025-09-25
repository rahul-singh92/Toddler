"use client";
import { useState } from "react";
import { IconUsers } from "@tabler/icons-react";
import { CollaboratorInfo } from "../../types/collaboration";
import Image from "next/image";

interface TeamMembersListProps {
  collaborators: CollaboratorInfo[];
}

const ImageWithFallback = ({ 
  src, 
  alt, 
  className, 
  collaborator,
  ...props 
}: {
  src: string;
  alt: string;
  className: string;
  collaborator: CollaboratorInfo;
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = () => {
    if (retryCount < 2) {
      // Retry with delay for rate limit recovery
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageSrc(`${src}?retry=${retryCount + 1}`);
      }, 1000 * (retryCount + 1)); // Exponential backoff
    } else {
      // Final fallback to ui-avatars
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        collaborator.displayName || 'User'
      )}&background=C8A2D6&color=fff&size=48`;
      setImageSrc(fallbackUrl);
    }
  };

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

export default function TeamMembersList({ collaborators }: TeamMembersListProps) {
  return (
    <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 border border-gray-800">
      {/* ✅ UPDATED: Simplified header without active count */}
      <h3 className="text-lg font-semibold text-white flex items-center mb-6">
        <IconUsers size={20} className="text-[#C8A2D6] mr-2" />
        Current Team Members
      </h3>
      
      {/* Team Members Grid */}
      <div className="space-y-4">
        {collaborators.map((collaborator: CollaboratorInfo, index) => (
          <div key={collaborator.userId || index} className="flex items-center space-x-4 p-3 bg-[#0F0F0F] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            {/* Avatar with fallback handling */}
            <div className="relative flex-shrink-0">
              <ImageWithFallback
                src={collaborator.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(collaborator.displayName || 'User')}&background=C8A2D6&color=fff&size=48`}
                alt={collaborator.displayName || 'Team Member'}
                className="w-12 h-12 rounded-full border-2 border-[#C8A2D6] shadow-lg bg-gray-700"
                collaborator={collaborator}
              />
              
              {/* Role indicator dot */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1A1A1A] shadow-sm ${
                collaborator.role === 'admin' ? 'bg-red-400' :
                collaborator.role === 'editor' ? 'bg-[#C8A2D6]' : 'bg-green-400'
              }`}></div>
            </div>
            
            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm truncate">
                    {collaborator.displayName || 'Unknown User'}
                  </h4>
                  <p className="text-gray-400 text-xs truncate">
                    {collaborator.email}
                  </p>
                </div>
                
                {/* Role Badge */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  collaborator.role === 'admin' ? 'bg-red-900/30 text-red-400 border border-red-700' :
                  collaborator.role === 'editor' ? 'bg-purple-900/30 text-[#C8A2D6] border border-purple-700' :
                  'bg-green-900/30 text-green-400 border border-green-700'
                }`}>
                  {collaborator.role.toUpperCase()}
                </div>
              </div>
              
              {/* ✅ REMOVED: Join Date */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
