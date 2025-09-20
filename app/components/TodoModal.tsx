"use client";
import React, { useState, useEffect } from "react";
import { IconX, IconCalendar, IconLink, IconPlus, IconTrash, IconEdit, IconRepeat } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Todo, TodoFormData, Recurrence } from "../types/todo";
import CustomDropdown from "./ui/CustomDropdown";
import ModernDateTimePicker from "./ui/ModernDateTimePicker";
import ColorPicker from "./ui/ColorPicker";

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTodoAdded: (todo: Todo) => void;
}

const initialFormData: TodoFormData = {
  title: "",
  description: "",
  category: "personal",
  links: "",
  startTime: "",
  endTime: "",
  priority: "medium",
  color: "#C8A2D6",
};

// Helper function for date formatting
const formatDateForPicker = (date?: string | Date): string | undefined => {
  if (!date) return undefined;
  
  if (typeof date === 'string') {
    return date;
  }
  
  // Convert Date to ISO string for the picker
  return date.toISOString();
};

export default function TodoModal({ isOpen, onClose, onTodoAdded }: TodoModalProps) {
  const [user] = useAuthState(auth);
  const [formData, setFormData] = useState<TodoFormData>(initialFormData);
  const [linksList, setLinksList] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Custom category states
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  
  // DateTime picker states
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [isRecurrenceEndDatePickerOpen, setIsRecurrenceEndDatePickerOpen] = useState(false);

  // Recurrence states
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: 'none' });

  // Predefined categories
  const predefinedCategories = [
    { value: "personal", label: "Personal" },
    { value: "work", label: "Work" },
    { value: "study", label: "Study" },
    { value: "health", label: "Health" },
    { value: "hobby", label: "Hobby" },
    { value: "finance", label: "Finance" },
    { value: "shopping", label: "Shopping" },
    { value: "travel", label: "Travel" },
  ];

  const categoryOptions = [
    ...predefinedCategories,
    { value: "custom", label: "+ Create Custom Category" }
  ];

  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  // Recurrence options
  const recurrenceOptions = [
    { value: "none", label: "No Recurrence" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setLinksList([]);
      setCurrentLink("");
      setErrors({});
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setRecurrence({ type: 'none' });
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (isCustomCategory && !customCategoryName.trim()) {
      newErrors.category = "Custom category name is required";
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (start >= end) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    // Validate recurrence
    if (recurrence.type !== 'none') {
      if (recurrence.interval && recurrence.interval < 1) {
        newErrors.recurrenceInterval = "Interval must be at least 1";
      }
      if (recurrence.endDate && formData.startTime) {
        const startDate = new Date(formData.startTime);
        const endDate = new Date(recurrence.endDate);
        if (endDate <= startDate) {
          newErrors.recurrenceEndDate = "Recurrence end date must be after start date";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === "custom") {
      setIsCustomCategory(true);
      setFormData(prev => ({ ...prev, category: "" }));
    } else {
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setFormData(prev => ({ ...prev, category: value }));
    }

    // Clear category error
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: "" }));
    }
  };

  const handlePriorityChange = (value: string) => {
    setFormData(prev => ({ ...prev, priority: value as "low" | "medium" | "high" }));
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategoryName(value);
    setFormData(prev => ({ ...prev, category: value.toLowerCase().trim() }));
    
    // Clear category error
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: "" }));
    }
  };

  const switchBackToDropdown = () => {
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setFormData(prev => ({ ...prev, category: "personal" }));
  };

  const handleAddLink = () => {
    if (currentLink.trim() && !linksList.includes(currentLink.trim())) {
      setLinksList(prev => [...prev, currentLink.trim()]);
      setCurrentLink("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinksList(prev => prev.filter((_, i) => i !== index));
  };

  // Recurrence handlers
  const handleRecurrenceTypeChange = (value: string) => {
    if (value === 'none') {
      setRecurrence({ type: 'none' });
    } else {
      setRecurrence(prev => ({ 
        ...prev, 
        type: value as 'daily' | 'weekly' | 'monthly' | 'yearly',
        interval: prev.interval || 1
      }));
    }
    
    // Clear recurrence errors
    if (errors.recurrenceInterval) {
      setErrors(prev => ({ ...prev, recurrenceInterval: "" }));
    }
  };

  const handleRecurrenceIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setRecurrence(prev => ({ ...prev, interval: Math.max(1, value) }));
    
    // Clear error
    if (errors.recurrenceInterval) {
      setErrors(prev => ({ ...prev, recurrenceInterval: "" }));
    }
  };

  const formatDateTimeForDisplay = (dateTimeString: string) => {
  if (!dateTimeString) return "Select date & time";
  
  // If it's already in the format "Sep 21, 2025, 9:00 AM", just return it
  if (dateTimeString.includes('AM') || dateTimeString.includes('PM')) {
    return dateTimeString;
  }
  
  // Otherwise, try to parse as Date and format to 12-hour
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return dateTimeString;
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};



  const formatRecurrenceEndDateForDisplay = (dateTimeString?: string | Date) => {
    if (!dateTimeString) return "Select end date (optional)";
    
    // Handle both string and Date types
    const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRecurrencePreview = () => {
    if (recurrence.type === 'none') return '';
    
    const interval = recurrence.interval || 1;
    const typeText = {
      daily: interval === 1 ? 'day' : 'days',
      weekly: interval === 1 ? 'week' : 'weeks', 
      monthly: interval === 1 ? 'month' : 'months',
      yearly: interval === 1 ? 'year' : 'years'
    };
    
    let preview = `Repeats every ${interval > 1 ? interval + ' ' : ''}${typeText[recurrence.type]}`;
    
    if (recurrence.endDate) {
      // Handle both string and Date types
      const endDate = typeof recurrence.endDate === 'string' 
        ? new Date(recurrence.endDate) 
        : recurrence.endDate;
      
      preview += ` until ${endDate.toLocaleDateString()}`;
    }
    
    return preview;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const now = new Date();

      // Use custom category name if it's a custom category
      const categoryToSave = isCustomCategory ? customCategoryName.toLowerCase().trim() : formData.category;

      const todoData: Omit<Todo, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: categoryToSave,
        links: linksList,
        startTime: formData.startTime ? new Date(formData.startTime) : undefined,
        endTime: formData.endTime ? new Date(formData.endTime) : undefined,
        completed: false,
        priority: formData.priority,
        color: formData.color,
        createdAt: now,
        updatedAt: now,
        sharedWith: [],
        recurrence: recurrence,
        ownerId: user.uid,
      };

      // Add to Firestore subcollection
      const todosRef = collection(db, 'users', user.uid, 'todos');
      const docRef = await addDoc(todosRef, {
        ...todoData,
        startTime: todoData.startTime ? Timestamp.fromDate(todoData.startTime) : null,
        endTime: todoData.endTime ? Timestamp.fromDate(todoData.endTime) : null,
        createdAt: Timestamp.fromDate(todoData.createdAt),
        updatedAt: Timestamp.fromDate(todoData.updatedAt),
        recurrence: {
          ...recurrence,
          endDate: recurrence.endDate ? Timestamp.fromDate(new Date(recurrence.endDate)) : null
        }
      });

      const newTodo: Todo = { ...todoData, id: docRef.id };
      onTodoAdded(newTodo);
      onClose();
    } catch (error) {
      console.error("Error adding todo:", error);
      setErrors({ submit: "Failed to create todo. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <h2 className="text-2xl font-semibold text-white">Create New Todo</h2>
              <button
                onClick={onClose}
                className="p-2 text-[#6A6A6A] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Form with Custom Scrollbar and No Horizontal Overflow */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {/* Title */}
              <div className="min-w-0">
                <label className="block text-white text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 break-words"
                  placeholder="Enter todo title..."
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="min-w-0">
                <label className="block text-white text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent resize-none transition-all duration-200"
                  placeholder="Add a description..."
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
              </div>

              {/* Category & Priority Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Category
                  </label>
                  
                  {!isCustomCategory ? (
                    <CustomDropdown
                      options={categoryOptions}
                      value={formData.category}
                      onChange={handleCategoryChange}
                      placeholder="Select category..."
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customCategoryName}
                          onChange={handleCustomCategoryChange}
                          placeholder="Enter custom category name..."
                          className="flex-1 min-w-0 px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        />
                        <button
                          type="button"
                          onClick={switchBackToDropdown}
                          className="flex-shrink-0 px-3 py-3 bg-[#3A3A3A] text-[#BDBDBD] rounded-lg hover:bg-[#4A4A4A] transition-all duration-200"
                          title="Switch back to predefined categories"
                        >
                          <IconEdit size={16} />
                        </button>
                      </div>
                      {customCategoryName && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[#C8A2D6] text-xs break-words"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          Preview: {customCategoryName.charAt(0).toUpperCase() + customCategoryName.slice(1)}
                        </motion.p>
                      )}
                    </div>
                  )}
                  
                  {errors.category && <p className="text-red-400 text-sm mt-1 break-words">{errors.category}</p>}
                </div>

                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2">
                    Priority
                  </label>
                  <CustomDropdown
                    options={priorityOptions}
                    value={formData.priority}
                    onChange={handlePriorityChange}
                    placeholder="Select priority..."
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                    <IconCalendar size={16} />
                    Start Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStartTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between min-w-0"
                  >
                    <span className={`truncate ${formData.startTime ? "text-white" : "text-[#6A6A6A]"}`}>
                      {formatDateTimeForDisplay(formData.startTime)}
                    </span>
                    <IconCalendar size={16} className="text-[#6A6A6A] flex-shrink-0 ml-2" />
                  </button>
                </div>

                <div className="min-w-0">
                  <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                    <IconCalendar size={16} />
                    End Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEndTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between min-w-0"
                  >
                    <span className={`truncate ${formData.endTime ? "text-white" : "text-[#6A6A6A]"}`}>
                      {formatDateTimeForDisplay(formData.endTime)}
                    </span>
                    <IconCalendar size={16} className="text-[#6A6A6A] flex-shrink-0 ml-2" />
                  </button>
                  {errors.endTime && <p className="text-red-400 text-sm mt-1 break-words">{errors.endTime}</p>}
                </div>
              </div>

              {/* Recurrence Section */}
              <div className="min-w-0">
                <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <IconRepeat size={16} />
                  Recurrence
                </label>
                
                <div className="space-y-4">
                  {/* Recurrence Type */}
                  <CustomDropdown
                    options={recurrenceOptions}
                    value={recurrence.type}
                    onChange={handleRecurrenceTypeChange}
                    placeholder="Select recurrence..."
                  />

                  {/* Recurrence Details - Show only if not 'none' */}
                  <AnimatePresence>
                    {recurrence.type !== 'none' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-4 bg-[#252525] rounded-lg p-4 border border-[#3A3A3A]"
                      >
                        {/* Interval Input */}
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">
                            Repeat Every
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={recurrence.interval || 1}
                              onChange={handleRecurrenceIntervalChange}
                              className="w-20 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                            />
                            <span className="text-[#BDBDBD] text-sm">
                              {recurrence.type === 'daily' && ((recurrence.interval || 1) === 1 ? 'day' : 'days')}
                              {recurrence.type === 'weekly' && ((recurrence.interval || 1) === 1 ? 'week' : 'weeks')}
                              {recurrence.type === 'monthly' && ((recurrence.interval || 1) === 1 ? 'month' : 'months')}
                              {recurrence.type === 'yearly' && ((recurrence.interval || 1) === 1 ? 'year' : 'years')}
                            </span>
                          </div>
                          {errors.recurrenceInterval && (
                            <p className="text-red-400 text-sm mt-1">{errors.recurrenceInterval}</p>
                          )}
                        </div>

                        {/* End Date (Optional) - FIXED: Separate buttons to avoid nesting */}
                        <div>
                          <label className="block text-white text-sm font-medium mb-2">
                            End Date (Optional)
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsRecurrenceEndDatePickerOpen(true)}
                              className="flex-1 px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between min-w-0"
                            >
                              <span className={`truncate ${recurrence.endDate ? "text-white" : "text-[#6A6A6A]"}`}>
                                {formatRecurrenceEndDateForDisplay(recurrence.endDate)}
                              </span>
                              <IconCalendar size={16} className="text-[#6A6A6A] flex-shrink-0 ml-2" />
                            </button>
                            
                            {/* Separate clear button */}
                            {recurrence.endDate && (
                              <button
                                type="button"
                                onClick={() => setRecurrence(prev => ({ ...prev, endDate: undefined }))}
                                className="px-3 py-3 bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 flex items-center justify-center"
                                title="Clear end date"
                              >
                                <IconX size={16} />
                              </button>
                            )}
                          </div>
                          {errors.recurrenceEndDate && (
                            <p className="text-red-400 text-sm mt-1">{errors.recurrenceEndDate}</p>
                          )}
                        </div>

                        {/* Recurrence Preview */}
                        <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                          <p className="text-[#6A6A6A] text-xs mb-1">Preview:</p>
                          <p className="text-[#C8A2D6] text-sm">{getRecurrencePreview()}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Links */}
              <div className="min-w-0">
                <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <IconLink size={16} />
                  Links
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={currentLink}
                    onChange={(e) => setCurrentLink(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 min-w-0 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                    style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="flex-shrink-0 px-4 py-2 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-all duration-200 flex items-center gap-1"
                  >
                    <IconPlus size={16} />
                    Add
                  </button>
                </div>
                
                {linksList.length > 0 && (
                  <div className="space-y-2">
                    {linksList.map((link, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="flex items-center justify-between bg-[#2A2A2A] px-3 py-2 rounded-lg border border-[#3A3A3A] min-w-0"
                      >
                        <span 
                          className="text-[#C8A2D6] text-sm truncate min-w-0 flex-1"
                          style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                          title={link}
                        >
                          {link}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(index)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors flex-shrink-0 ml-2"
                        >
                          <IconTrash size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                presetColors={[
                  "#C8A2D6", // Current purple
                  "#FF6B6B", // Red
                  "#4ECDC4", // Teal
                  "#45B7D1", // Blue
                  "#F9CA24", // Yellow
                  "#6C5CE7", // Purple
                  "#A0E7E5", // Light teal
                  "#FEA47F", // Orange
                ]}
              />

              {errors.submit && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 min-w-0"
                >
                  <p className="text-red-400 text-sm break-words">{errors.submit}</p>
                </motion.div>
              )}

              {/* Preview of todo being created */}
              {formData.title && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A] min-w-0"
                >
                  <p className="text-[#6A6A6A] text-xs mb-3">Preview:</p>
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-5 h-5 rounded-md border border-[#424242] flex-shrink-0"></div>
                    <span 
                      className="text-white text-sm font-medium truncate min-w-0 flex-1"
                      title={formData.title}
                    >
                      {formData.title}
                    </span>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {formData.priority === 'high' && <div className="w-2 h-2 rounded-full bg-red-500" title="High Priority" />}
                      {formData.priority === 'medium' && <div className="w-2 h-2 rounded-full bg-yellow-500" title="Medium Priority" />}
                      {formData.priority === 'low' && <div className="w-2 h-2 rounded-full bg-green-500" title="Low Priority" />}
                      {recurrence.type !== 'none' && <IconRepeat size={12} className="text-[#C8A2D6]" title="Recurring" />}
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: formData.color }}
                      />
                    </div>
                  </div>
                  {(isCustomCategory ? customCategoryName : formData.category) && (
                    <p 
                      className="text-[#6A6A6A] text-xs mt-2 break-words"
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      Category: {isCustomCategory ? 
                        customCategoryName.charAt(0).toUpperCase() + customCategoryName.slice(1) : 
                        predefinedCategories.find(cat => cat.value === formData.category)?.label || formData.category
                      }
                    </p>
                  )}
                  {recurrence.type !== 'none' && (
                    <p className="text-[#6A6A6A] text-xs mt-1">
                      {getRecurrencePreview()}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-[#2A2A2A] text-[#BDBDBD] rounded-lg hover:bg-[#3A3A3A] transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Todo"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* DateTime Pickers */}
      <ModernDateTimePicker
        isOpen={isStartTimePickerOpen}
        onClose={() => setIsStartTimePickerOpen(false)}
        onConfirm={(dateTime) => setFormData(prev => ({ ...prev, startTime: dateTime }))}
        title="Select Start Date & Time"
        initialValue={formData.startTime}
      />

      <ModernDateTimePicker
        isOpen={isEndTimePickerOpen}
        onClose={() => setIsEndTimePickerOpen(false)}
        onConfirm={(dateTime) => setFormData(prev => ({ ...prev, endTime: dateTime }))}
        title="Select End Date & Time"
        initialValue={formData.endTime}
      />

      <ModernDateTimePicker
        isOpen={isRecurrenceEndDatePickerOpen}
        onClose={() => setIsRecurrenceEndDatePickerOpen(false)}
        onConfirm={(dateTime) => {
          // Keep just the date part for recurrence end date
          const date = new Date(dateTime);
          date.setHours(23, 59, 59, 999); // Set to end of day for end date
          setRecurrence(prev => ({ ...prev, endDate: date.toISOString() }));
        }}
        title="Select Recurrence End Date"
        initialValue={formatDateForPicker(recurrence.endDate)}
      />

      {/* Custom Scrollbar Styles */}
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
