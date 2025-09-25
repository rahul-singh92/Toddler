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

    const formatRecurrenceEndDate = (endDate: string | Date | { toDate(): Date }): string => {
        try {
            let date: Date;
            
            if (typeof endDate === 'string') {
                date = new Date(endDate);
            } else if (endDate instanceof Date) {
                date = endDate;
            } else if (endDate && typeof endDate === 'object' && 'toDate' in endDate) {
                // Handle Firestore Timestamp
                date = endDate.toDate();
            } else {
                date = new Date(endDate);
            }
            
            // Validate the date
            if (!isNaN(date.getTime())) {
                return formatDateTime(date);
            }
        } catch (error) {
            console.warn('Error formatting recurrence end date:', error);
        }
        
        return 'Invalid date';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
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

    const getRecurrencePreview = () => {
        if (!todo.recurrence || todo.recurrence.type === 'none') return 'No recurrence';
        
        const interval = todo.recurrence.interval || 1;
        const typeText = {
            daily: interval === 1 ? 'day' : 'days',
            weekly: interval === 1 ? 'week' : 'weeks', 
            monthly: interval === 1 ? 'month' : 'months',
            yearly: interval === 1 ? 'year' : 'years'
        };
        
        let preview = `Repeats every ${interval > 1 ? interval + ' ' : ''}${typeText[todo.recurrence.type]}`;
        
        if (todo.recurrence.endDate) {
            try {
                // Handle both string and Date types
                let endDate: Date;
                
                if (typeof todo.recurrence.endDate === 'string') {
                    endDate = new Date(todo.recurrence.endDate);
                } else if (todo.recurrence.endDate instanceof Date) {
                    endDate = todo.recurrence.endDate;
                } else if (todo.recurrence.endDate && typeof todo.recurrence.endDate === 'object' && 'toDate' in todo.recurrence.endDate) {
                    // Handle Firestore Timestamp
                    endDate = (todo.recurrence.endDate as { toDate(): Date }).toDate();
                } else {
                    endDate = new Date(todo.recurrence.endDate as string | number | Date);
                }
                
                // Validate the date
                if (!isNaN(endDate.getTime())) {
                    preview += ` until ${endDate.toLocaleDateString()}`;
                }
            } catch (error) {
                console.warn('Error parsing recurrence end date:', error);
            }
        }
        
        return preview;
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
                        className="relative w-full max-w-2xl bg-[#1A1A1A] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-6 h-6 rounded-lg border-2 border-[#3A3A3A]"
                                    style={{ backgroundColor: todo.color }}
                                />
                                <div>
                                    <h2 className="text-xl font-semibold text-white truncate max-w-md" title={todo.title}>
                                        {todo.title}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-[#BDBDBD] capitalize">{todo.category}</span>
                                        <div className={`w-2 h-2 rounded-full ${getPriorityDot(todo.priority)}`} />
                                        <span className="text-sm text-[#BDBDBD] capitalize">{todo.priority} Priority</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-[#6A6A6A] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
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
                                        <label className="text-sm font-medium text-white">Status</label>
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${todo.completed
                                                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                                : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                            }`}>
                                            {todo.completed ? '✓ Completed' : '○ In Progress'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white">Priority</label>
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getPriorityColor(todo.priority)}`}>
                                            <div className={`w-2 h-2 rounded-full ${getPriorityDot(todo.priority)}`} />
                                            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {todo.description && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white">Description</label>
                                        <div className="p-4 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <p className="text-[#BDBDBD] whitespace-pre-wrap">{todo.description}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Date & Time */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <IconCalendar size={16} />
                                            Start Date & Time
                                        </label>
                                        <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <p className="text-[#BDBDBD] text-sm">{formatDateTime(todo.startTime)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <IconCalendar size={16} />
                                            End Date & Time
                                        </label>
                                        <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <p className="text-[#BDBDBD] text-sm">{formatDateTime(todo.endTime)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Links */}
                                {todo.links && todo.links.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <IconLink size={16} />
                                            Links ({todo.links.length})
                                        </label>
                                        <div className="space-y-2">
                                            {todo.links.map((link, index) => (
                                                <div key={index} className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#C8A2D6] hover:text-[#B892C6] text-sm break-all hover:underline transition-colors"
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
                                    <label className="text-sm font-medium text-white flex items-center gap-2">
                                        <IconUser size={16} />
                                        Shared With
                                    </label>
                                    <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                        {todo.sharedWith && todo.sharedWith.length > 0 ? (
                                            <div className="space-y-2">
                                                {todo.sharedWith.map((sharedUser, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-2 bg-[#1A1A1A] rounded-lg border border-[#3A3A3A]">
                                                        <div className="w-8 h-8 bg-[#C8A2D6]/20 rounded-full flex items-center justify-center">
                                                            <span className="text-[#C8A2D6] text-sm font-medium">
                                                                {sharedUser.email.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{sharedUser.email}</p>
                                                            <p className="text-[#6A6A6A] text-xs capitalize">{sharedUser.role || 'shared'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <IconUser size={24} className="text-[#6A6A6A] mx-auto mb-2" />
                                                <p className="text-[#6A6A6A] text-sm">Not shared with anyone</p>
                                                <p className="text-[#6A6A6A] text-xs mt-1 opacity-60">This todo is private to you</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Recurrence - FIXED */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white flex items-center gap-2">
                                        <IconRepeat size={16} />
                                        Recurrence
                                    </label>
                                    <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                        <div className="flex items-center gap-2">
                                            {todo.recurrence?.type === 'none' || !todo.recurrence?.type ? (
                                                <>
                                                    <IconRepeat size={16} className="text-[#6A6A6A]" />
                                                    <p className="text-[#6A6A6A] text-sm">No recurrence</p>
                                                </>
                                            ) : (
                                                <>
                                                    <IconRepeat size={16} className="text-[#C8A2D6]" />
                                                    <p className="text-[#BDBDBD] text-sm">
                                                        {getRecurrencePreview()}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        {todo.recurrence?.type && todo.recurrence.type !== 'none' && todo.recurrence.interval && (
                                            <div className="mt-2 text-xs text-[#6A6A6A] space-y-1">
                                                <p>• Every {todo.recurrence.interval} {todo.recurrence.type.slice(0, -2)}{todo.recurrence.interval > 1 ? 's' : ''}</p>
                                                {todo.recurrence.endDate && (
                                                    <p>• Ends: {formatRecurrenceEndDate(todo.recurrence.endDate)}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#2A2A2A]">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <IconClock size={16} />
                                            Created
                                        </label>
                                        <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <p className="text-[#BDBDBD] text-sm">{formatDateTime(todo.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <IconClock size={16} />
                                            Last Updated
                                        </label>
                                        <div className="p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <p className="text-[#BDBDBD] text-sm">{formatDateTime(todo.updatedAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Technical Details - Collapsible */}
                                <div className="space-y-2">
                                    <details className="group">
                                        <summary className="cursor-pointer text-sm font-medium text-white hover:text-[#C8A2D6] transition-colors flex items-center gap-2">
                                            <span className="transform transition-transform group-open:rotate-90">▶</span>
                                            Technical Details
                                        </summary>
                                        <div className="mt-2 p-3 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs font-medium text-[#BDBDBD]">Todo ID:</p>
                                                    <p className="text-[#6A6A6A] text-xs font-mono break-all">{todo.id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-[#BDBDBD]">Owner ID:</p>
                                                    <p className="text-[#6A6A6A] text-xs font-mono break-all">{todo.ownerId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-[#BDBDBD]">Color Code:</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div 
                                                            className="w-4 h-4 rounded border border-[#3A3A3A]"
                                                            style={{ backgroundColor: todo.color }}
                                                        />
                                                        <p className="text-[#6A6A6A] text-xs font-mono">{todo.color.toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#2A2A2A] bg-[#1A1A1A]">
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-[#2A2A2A] text-[#BDBDBD] rounded-lg hover:bg-[#3A3A3A] transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Custom Scrollbar Styles - Dark Theme */}
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
                </div>
            )}
        </AnimatePresence>
    );
}
