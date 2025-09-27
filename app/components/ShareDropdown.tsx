// components/ShareDropdown.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { IconSearch, IconUsers, IconPlus, IconLink, IconMail } from "@tabler/icons-react";
import { useClickOutside } from "../hooks/useClickOutside";
import Image from "next/image";
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

interface ShareDropdownProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateShare: () => void;
  triggerRef?: React.RefObject<HTMLElement | HTMLButtonElement>;
}

export default function ShareDropdown({ 
  isVisible, 
  onClose, 
  onCreateShare,
  triggerRef
}: ShareDropdownProps) {
  const dropdownRef = useClickOutside<HTMLDivElement>(onClose);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Mount portal only on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position relative to trigger element
  useEffect(() => {
    if (isVisible && triggerRef?.current && mounted) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: triggerRect.bottom + window.scrollY + 8, // 8px gap
        right: window.innerWidth - triggerRect.right + window.scrollX
      });
    }
  }, [isVisible, triggerRef, mounted]);

  // Generate DiceBear avatars with different seeds for demo purposes
  const avatarSeeds = ["alex", "jordan", "sam", "casey", "taylor"];

  const handleNewClick = () => {
    onCreateShare();
    onClose();
  };

  // Handle search functionality (placeholder for future implementation)
  const handleSearchClick = () => {
    console.log("Search functionality - to be implemented");
    // Future: Open search modal for finding users
  };

  // Handle direct email sharing (placeholder for future implementation)
  const handleEmailShare = () => {
    console.log("Email share functionality - to be implemented");
    onClose();
    // Future: Open email composition
  };

  const dropdownContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ 
            duration: 0.2, 
            ease: [0.16, 1, 0.3, 1],
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className="fixed z-[9999]" // Use fixed positioning with very high z-index
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`
          }}
        >
          {/* Dropdown Arrow */}
          <div className="absolute -top-1 right-6 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45 z-10"></div>
          
          {/* Dropdown Content */}
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 min-w-[340px]">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Todos</h3>
              <p className="text-xs text-gray-500 mt-1">Collaborate with your team</p>
            </div>

            {/* Recent Collaborators Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Recent collaborators</span>
                <button
                  onClick={handleSearchClick}
                  className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Search for people"
                >
                  <IconSearch size={14} className="text-gray-600" />
                </button>
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <div className="flex -space-x-2">
                  {avatarSeeds.map((seed, index) => (
                    <button
                      key={seed}
                      className="relative group"
                      onClick={() => console.log(`Quick share with ${seed}`)}
                      title={`Share with ${seed}`}
                    >
                      <Image
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                        alt={`${seed}'s avatar`}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer group-hover:border-blue-200"
                        unoptimized
                      />
                      {/* Online indicator for demo */}
                      {index < 2 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border border-white rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Add more people button */}
                <button
                  onClick={handleSearchClick}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  title="Find more people"
                >
                  <IconPlus size={12} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mb-4"></div>

            {/* Share Options */}
            <div className="space-y-3 mb-4">
              {/* Create Share Link Option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <IconLink size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Create share link</h4>
                    <p className="text-xs text-gray-500">Share todos with anyone via link</p>
                  </div>
                </div>
                <button
                  onClick={handleNewClick}
                  className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
                >
                  New
                </button>
              </div>

              {/* Email Share Option */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <IconMail size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Send via email</h4>
                    <p className="text-xs text-gray-500">Invite people directly by email</p>
                  </div>
                </div>
                <button
                  onClick={handleEmailShare}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors flex-shrink-0"
                  disabled
                >
                  Soon
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <IconUsers size={12} className="mr-1.5" />
                  <span>Secure collaboration</span>
                </div>
                <div className="text-xs text-gray-400">
                  Links expire in 30 days
                </div>
              </div>
            </div>

            {/* Quick Actions (Hidden by default, shown on hover) */}
            <div className="mt-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render portal only on client side
  if (!mounted) {
    return null;
  }

  return createPortal(dropdownContent, document.body);
}
