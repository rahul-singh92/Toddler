"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconCopy, IconCheck, IconCalendar, IconTag, IconUsers } from "@tabler/icons-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { Todo } from "../types/todo";
import { TodoInvitation } from "../types/collaboration";
import CustomDropdown from "./ui/CustomDropdown";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  shareType: 'selected' | 'all';
}

interface ShareableItem {
  id: string;
  title: string;
  category?: string;
  date?: Date;
  selected: boolean;
  isShared?: boolean;
}

export default function ShareLinkModal({ 
  isOpen, 
  onClose, 
  todos, 
  shareType 
}: ShareLinkModalProps) {
  const [user] = useAuthState(auth);
  const [shareableItems, setShareableItems] = useState<ShareableItem[]>([]);
  const [shareLink, setShareLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'select' | 'generate' | 'complete'>('select');
  const [selectedCount, setSelectedCount] = useState(0);
  const [error, setError] = useState<string>("");
  
  // Category filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShareableItem[]>([]);

  // Initialize shareable items when modal opens
  useEffect(() => {
    if (isOpen && todos.length > 0) {
      const validTodos = todos.filter(todo => todo.id);
      
      const items: ShareableItem[] = validTodos.map(todo => ({
        id: todo.id!,
        title: todo.title,
        category: todo.category,
        date: todo.startTime || todo.createdAt,
        selected: shareType === 'all',
        isShared: todo.isShared || false
      }));
      
      // Extract unique categories and sort them
      const categories = [...new Set(validTodos
        .map(todo => todo.category)
        .filter(Boolean))] as string[];
      categories.sort((a, b) => a.localeCompare(b));
      
      setShareableItems(items);
      setAvailableCategories(categories);
      setSelectedCategory('all');
      setSelectedCount(shareType === 'all' ? validTodos.length : 0);
      setStep('select');
      setShareLink("");
      setCopied(false);
      setError("");
    }
  }, [isOpen, todos, shareType]);

  // Filter items based on selected category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredItems(shareableItems);
    } else {
      setFilteredItems(shareableItems.filter(item => item.category === selectedCategory));
    }
  }, [shareableItems, selectedCategory]);

  // Update selected count based on filtered items
  useEffect(() => {
    const count = filteredItems.filter(item => item.selected).length;
    setSelectedCount(count);
  }, [filteredItems]);

  // Handle item selection toggle
  const handleItemToggle = (id: string) => {
    setShareableItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Handle select all toggle (only for filtered items)
  const handleSelectAll = () => {
    const filteredIds = filteredItems.map(item => item.id);
    const allFilteredSelected = filteredItems.every(item => item.selected);
    
    setShareableItems(prev => 
      prev.map(item => 
        filteredIds.includes(item.id) 
          ? { ...item, selected: !allFilteredSelected }
          : item
      )
    );
  };

  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Create dropdown options from categories
  const dropdownOptions = [
    { value: 'all', label: `All Categories (${shareableItems.length})` },
    ...availableCategories.map(category => ({ 
      value: category, 
      label: `${category} (${shareableItems.filter(item => item.category === category).length})`
    }))
  ];

  // Generate share link with improved error handling
  const handleGenerateLink = async () => {
    if (!user) {
      setError("You must be signed in to share todos");
      return;
    }
    
    setStep('generate');
    setError("");
    
    const selectedItems = shareableItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      setError("Please select at least one todo to share");
      setStep('select');
      return;
    }

    // Generate more secure share ID
    const shareId = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').substring(0, 16) : Math.random().toString(36).substr(2, 16);
    
    try {
      const invitationData: TodoInvitation = {
        id: shareId,
        shareId: shareId,
        createdBy: user.uid,
        createdAt: new Date(),
        todoIds: selectedItems.map(item => item.id),
        title: `${user.displayName || user.email?.split('@')[0] || 'Someone'}'s Todo Collaboration`,
        description: `${selectedItems.length} todo${selectedItems.length !== 1 ? 's' : ''} shared for collaboration`,
        invitedUsers: [],
        acceptedUsers: [],
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await setDoc(doc(db, 'todoInvitations', shareId), invitationData);
      
      const baseUrl = window.location.origin;
      const generatedLink = `${baseUrl}/invite/${shareId}`;
      setShareLink(generatedLink);
      setStep('complete');
      
      console.log("Todo invitation created:", invitationData);
    } catch (error) {
      console.error("Error creating invitation:", error);
      setError("Failed to create share link. Please try again.");
      setStep('select');
    }
  };

  // Enhanced copy to clipboard with better fallback
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      
      // Enhanced fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
        // Show a different message for manual copy
        setError("Unable to copy automatically. Please copy the link manually.");
        setTimeout(() => setError(""), 3000);
      }
      
      document.body.removeChild(textArea);
    }
  };

  // Enhanced date formatting
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffInHours > 8760 ? 'numeric' : undefined // Show year if > 1 year old
      });
    }
  };

  // Handle modal close and reset with animation
  const handleClose = () => {
    setStep('select');
    setError("");
    setShareLink("");
    setCopied(false);
    setSelectedCategory('all');
    onClose();
  };

  // Get total selected count for button
  const totalSelectedCount = shareableItems.filter(item => item.selected).length;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              mass: 0.8
            }}
            className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {shareType === 'all' ? 'Share All Todos' : 'Create Share Link'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {step === 'select' && `Select ${shareType === 'all' ? 'which' : ''} todos to share`}
                  {step === 'generate' && 'Generating your share link...'}
                  {step === 'complete' && 'Your share link is ready!'}
                </p>
              </div>
              <motion.button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IconX size={20} className="text-gray-400" />
              </motion.button>
            </div>

            {/* Modal Content with Custom Scrollbar */}
            <div className="custom-scrollbar overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {step === 'select' && (
                <div className="space-y-4">
                  {/* Filter and Select Section */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Category Filter Dropdown */}
                      <div className="min-w-56">
                        <CustomDropdown
                          options={dropdownOptions}
                          value={selectedCategory}
                          onChange={handleCategoryChange}
                          placeholder="Filter by category..."
                          className="w-full"
                          maxHeight="200px"
                          disabled={availableCategories.length === 0}
                        />
                      </div>
                      
                      {/* Selection Count */}
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedCount} of {filteredItems.length} selected
                          {selectedCategory !== 'all' && (
                            <span className="text-gray-500 dark:text-gray-400"> in {selectedCategory}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Select All Button */}
                    <motion.button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-[#C8A2D6] dark:hover:text-[#B591C8] font-medium bg-blue-50 hover:bg-blue-100 dark:bg-[#C8A2D6]/10 dark:hover:bg-[#C8A2D6]/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      disabled={filteredItems.length === 0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {filteredItems.every(item => item.selected) ? 'Deselect All' : 'Select All'}
                    </motion.button>
                  </div>

                  {/* Todo List */}
                  <div className="max-h-64 space-y-2">
                    <div className="custom-scrollbar overflow-y-auto max-h-64 space-y-2 py-1">
                      <AnimatePresence mode="popLayout">
                        {filteredItems.map((item, index) => (
                          <motion.div
                            key={`${selectedCategory}-${item.id}`}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ 
                              layout: { duration: 0.2 },
                              opacity: { delay: index * 0.03 },
                              x: { delay: index * 0.03 }
                            }}
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                              item.selected 
                                ? 'border-blue-200 bg-blue-50 dark:border-[#C8A2D6] dark:bg-[#C8A2D6]/10' 
                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleItemToggle(item.id)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <motion.input
                              type="checkbox"
                              checked={item.selected}
                              readOnly
                              className="w-4 h-4 text-blue-600 dark:text-[#C8A2D6] rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-[#C8A2D6] dark:bg-gray-800 pointer-events-none"
                              animate={{ scale: item.selected ? 1.1 : 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {item.title}
                                </p>
                                {item.isShared && (
                                  <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-[#C8A2D6]/20 dark:text-[#C8A2D6]"
                                  >
                                    <IconUsers size={8} className="mr-0.5" />
                                    Shared
                                  </motion.span>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 mt-1">
                                {item.category && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                    <IconTag size={12} />
                                    <span>{item.category}</span>
                                  </div>
                                )}
                                {item.date && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                    <IconCalendar size={12} />
                                    <span>{formatDate(item.date)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Empty State */}
                  {filteredItems.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        <IconCalendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      </motion.div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {selectedCategory === 'all' 
                          ? 'No todos available to share'
                          : `No todos in "${selectedCategory}" category`
                        }
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <motion.button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors order-2 sm:order-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleGenerateLink}
                      disabled={totalSelectedCount === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 dark:bg-[#C8A2D6] dark:hover:bg-[#B591C8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                      whileHover={{ scale: totalSelectedCount > 0 ? 1.02 : 1 }}
                      whileTap={{ scale: totalSelectedCount > 0 ? 0.98 : 1 }}
                    >
                      Generate Link ({totalSelectedCount})
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Generate Step */}
              {step === 'generate' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 custom-scrollbar overflow-y-auto max-h-[calc(90vh-80px)]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-[#C8A2D6] rounded-full mx-auto mb-4"
                  />
                  <p className="text-gray-600 dark:text-gray-300">Creating your share link...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
                </motion.div>
              )}

              {/* Complete Step */}
              {step === 'complete' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <motion.div 
                      className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <IconCheck size={24} className="text-green-600 dark:text-green-400" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Link Generated!</h3>
                    <p className="text-gray-600 dark:text-gray-300">Share this link with your collaborators</p>
                  </div>

                  {/* Share Link */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Collaboration Link
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none select-all font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <motion.button
                        onClick={handleCopyLink}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          copied 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-[#C8A2D6] dark:text-white dark:hover:bg-[#B591C8]'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {copied ? (
                          <>
                            <IconCheck size={12} className="mr-1 inline" />
                            Copied
                          </>
                        ) : (
                          <>
                            <IconCopy size={12} className="mr-1 inline" />
                            Copy
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Summary */}
                  <motion.div 
                    className="bg-blue-50 dark:bg-[#C8A2D6]/10 rounded-lg p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h4 className="text-sm font-medium text-blue-900 dark:text-[#C8A2D6] mb-2 flex items-center">
                      <IconUsers size={14} className="mr-2" />
                      What&apos;s shared:
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-[#C8A2D6]/80">
                      {totalSelectedCount} todo{totalSelectedCount !== 1 ? 's' : ''} will be copied to collaborators&apos; accounts when they accept the invitation
                    </p>
                  </motion.div>

                  {/* Instructions */}
                  <motion.div 
                    className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="text-sm font-medium text-amber-900 dark:text-amber-400 mb-2">Next steps:</h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Share the link with people you want to collaborate with</li>
                      <li>• They&apos;ll see an invitation page to accept</li>
                      <li>• Accepted todos will appear in their account with &quot;Collaborate&quot; badges</li>
                      <li>• Link expires in 30 days</li>
                    </ul>
                  </motion.div>

                  {/* Action Button */}
                  <div className="flex justify-end">
                    <motion.button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 dark:bg-[#C8A2D6] dark:hover:bg-[#B591C8] transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2A2A2A;
          border-radius: 4px;
          margin: 8px 0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4A4A4A;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #C8A2D6;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: #B892C6;
        }
        
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4A4A4A #2A2A2A;
        }
      `}</style>
    </>
  );
}
