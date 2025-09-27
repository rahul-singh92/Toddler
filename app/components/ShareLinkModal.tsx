// components/ShareLinkModal.tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconCopy, IconCheck, IconCalendar, IconTag, IconUsers } from "@tabler/icons-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import { Todo } from "../types/todo";
import { TodoInvitation } from "../types/collaboration";

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
  isShared?: boolean; // To show if it's already a shared todo
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

  // Initialize shareable items when modal opens
  useEffect(() => {
    if (isOpen && todos.length > 0) {
      // Filter out todos that don't have IDs and prioritize original todos over shared ones
      const validTodos = todos.filter(todo => todo.id);
      
      const items: ShareableItem[] = validTodos.map(todo => ({
        id: todo.id!,
        title: todo.title,
        category: todo.category,
        date: todo.startTime || todo.createdAt,
        selected: shareType === 'all',
        isShared: todo.isShared || false
      }));
      
      setShareableItems(items);
      setSelectedCount(shareType === 'all' ? validTodos.length : 0);
      setStep('select');
      setShareLink("");
      setCopied(false);
      setError("");
    }
  }, [isOpen, todos, shareType]);

  // Handle item selection toggle
  const handleItemToggle = (id: string) => {
    setShareableItems(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      );
      setSelectedCount(updated.filter(item => item.selected).length);
      return updated;
    });
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    const allSelected = selectedCount === shareableItems.length;
    setShareableItems(prev => 
      prev.map(item => ({ ...item, selected: !allSelected }))
    );
    setSelectedCount(allSelected ? 0 : shareableItems.length);
  };

  // Generate share link
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

    const shareId = Math.random().toString(36).substr(2, 12);
    
    try {
      // Create invitation record
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

      // Save invitation to Firebase
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

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: date.getHours() !== 0 ? 'numeric' : undefined,
      minute: date.getHours() !== 0 ? '2-digit' : undefined
    });
  };

  // Handle modal close and reset
  const handleClose = () => {
    setStep('select');
    setError("");
    setShareLink("");
    setCopied(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {shareType === 'all' ? 'Share All Todos' : 'Create Share Link'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {step === 'select' && `Select ${shareType === 'all' ? 'which' : ''} todos to share`}
                  {step === 'generate' && 'Generating your share link...'}
                  {step === 'complete' && 'Your share link is ready!'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <IconX size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {step === 'select' && (
                <div className="space-y-4">
                  {/* Select All Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedCount} of {shareableItems.length} selected
                    </span>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedCount === shareableItems.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Todo List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {shareableItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                          item.selected 
                            ? 'border-blue-200 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleItemToggle(item.id)}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          readOnly
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.title}
                            </p>
                            {item.isShared && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <IconUsers size={8} className="mr-0.5" />
                                Shared
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mt-1">
                            {item.category && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <IconTag size={12} />
                                <span>{item.category}</span>
                              </div>
                            )}
                            {item.date && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <IconCalendar size={12} />
                                <span>{formatDate(item.date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {shareableItems.length === 0 && (
                    <div className="text-center py-8">
                      <IconCalendar size={32} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No todos available to share</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateLink}
                      disabled={selectedCount === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Generate Link ({selectedCount})
                    </button>
                  </div>
                </div>
              )}

              {step === 'generate' && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"
                  />
                  <p className="text-gray-600">Creating your share link...</p>
                  <p className="text-xs text-gray-500 mt-2">This may take a moment</p>
                </div>
              )}

              {step === 'complete' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconCheck size={24} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Link Generated!</h3>
                    <p className="text-gray-600">Share this link with your collaborators</p>
                  </div>

                  {/* Share Link */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Collaboration Link
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none select-all"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          copied 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
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
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                      <IconUsers size={14} className="mr-2" />
                      What&apos;s shared:
                    </h4>
                    <p className="text-sm text-blue-700">
                      {selectedCount} todo{selectedCount !== 1 ? 's' : ''} will be copied to collaborators&apos; accounts when they accept the invitation
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-900 mb-2">Next steps:</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Share the link with people you want to collaborate with</li>
                      <li>• They&apos;ll see an invitation page to accept</li>
                      <li>• Accepted todos will appear in their account with &quot;Collaborate&quot; badges</li>
                      <li>• Link expires in 30 days</li>
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
