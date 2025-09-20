"use client";
import React from "react";
import { IconX, IconCalendar, IconLink, IconUser, IconRepeat, IconClock } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { Todo } from "../../types/todo";

interface TodoDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    todo: Todo | null;
}

export default function TodoDetailsModal({ isOpen, onClose, todo }: TodoDetailsModalProps) {
    if (!todo) return null;

    const formatDateTime = (date?: Date) => {
        if (!date) return "Not set";
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-50 border-red-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getPriorityDot = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-6 h-6 rounded-lg border-2 border-gray-300"
                                    style={{ backgroundColor: todo.color }}
                                />
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 truncate max-w-md" title={todo.title}>
                                        {todo.title}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-600 capitalize">{todo.category}</span>
                                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(todo.priority)}`} />
                                        <span className="text-sm text-gray-600 capitalize">{todo.priority} Priority</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {/* Status and Priority */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${todo.completed
                                                ? 'text-green-700 bg-green-50 border border-green-200'
                                                : 'text-blue-700 bg-blue-50 border border-blue-200'
                                            }`}>
                                            {todo.completed ? '✓ Completed' : '○ In Progress'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Priority</label>
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getPriorityColor(todo.priority)}`}>
                                            <div className={`w-2 h-2 rounded-full ${getPriorityDot(todo.priority)}`} />
                                            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {todo.description && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Description</label>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-gray-900 whitespace-pre-wrap">{todo.description}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Date & Time */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <IconCalendar size={16} />
                                            Start Date & Time
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-gray-900 text-sm">{formatDateTime(todo.startTime)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <IconCalendar size={16} />
                                            End Date & Time
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-gray-900 text-sm">{formatDateTime(todo.endTime)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Links */}
                                {todo.links && todo.links.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <IconLink size={16} />
                                            Links ({todo.links.length})
                                        </label>
                                        <div className="space-y-2">
                                            {todo.links.map((link, index) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 text-sm break-all hover:underline"
                                                    >
                                                        {link}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shared With */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <IconUser size={16} />
                                        Shared With
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        {todo.sharedWith && todo.sharedWith.length > 0 ? (
                                            <div className="space-y-2">
                                                {todo.sharedWith.map((sharedUser, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <span className="text-blue-600 text-sm font-medium">
                                                                {sharedUser.email.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-900 text-sm font-medium">{sharedUser.email}</p>
                                                            <p className="text-gray-500 text-xs capitalize">{sharedUser.role || 'shared'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <IconUser size={24} className="text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-500 text-sm">Not shared with anyone</p>
                                                <p className="text-gray-400 text-xs mt-1">This todo is private to you</p>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* Recurrence */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <IconRepeat size={16} />
                                        Recurrence
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-900 text-sm capitalize">
                                            {todo.recurrence?.type === 'none' ? 'No recurrence' : todo.recurrence?.type || 'No recurrence'}
                                        </p>
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <IconClock size={16} />
                                            Created
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-gray-900 text-sm">{formatDateTime(todo.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <IconClock size={16} />
                                            Last Updated
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-gray-900 text-sm">{formatDateTime(todo.updatedAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner ID (for debugging/admin) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Owner ID</label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-600 text-xs font-mono break-all">{todo.ownerId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Custom Scrollbar Styles */}
                    <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 4px;
              margin: 8px 0;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
              transition: background 0.2s ease;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb:active {
              background: #64748b;
            }
            
            /* For Firefox */
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #cbd5e1 #f1f5f9;
            }
          `}</style>
                </div>
            )}
        </AnimatePresence>
    );
}
