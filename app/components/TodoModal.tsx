"use client";
import React, { useState, useEffect } from "react";
import { IconX, IconCalendar, IconLink, IconPlus, IconTrash, IconEdit } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Todo, TodoFormData, Recurrence } from "../types/todo";
import CustomDropdown from "./ui/CustomDropdown";
import ModernDateTimePicker from "./ui/ModernDateTimePicker";

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setLinksList([]);
      setCurrentLink("");
      setErrors({});
      setIsCustomCategory(false);
      setCustomCategoryName("");
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

  const formatDateTimeForDisplay = (dateTimeString: string) => {
    if (!dateTimeString) return "Select date & time";
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const now = new Date();
      const recurrence: Recurrence = {
        type: 'none'
      };

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
        recurrence,
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

  const colorOptions = [
    "#C8A2D6", // Current purple
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#F9CA24", // Yellow
    "#6C5CE7", // Purple
    "#A0E7E5", // Light teal
    "#FEA47F", // Orange
  ];

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
            className="relative w-full max-w-2xl mx-4 bg-[#1A1A1A] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                  placeholder="Enter todo title..."
                />
                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
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
                />
              </div>

              {/* Category & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
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
                          className="flex-1 px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={switchBackToDropdown}
                          className="px-3 py-3 bg-[#3A3A3A] text-[#BDBDBD] rounded-lg hover:bg-[#4A4A4A] transition-all duration-200"
                          title="Switch back to predefined categories"
                        >
                          <IconEdit size={16} />
                        </button>
                      </div>
                      {customCategoryName && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[#C8A2D6] text-xs"
                        >
                          Preview: {customCategoryName.charAt(0).toUpperCase() + customCategoryName.slice(1)}
                        </motion.p>
                      )}
                    </div>
                  )}
                  
                  {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                    <IconCalendar size={16} />
                    Start Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStartTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between"
                  >
                    <span className={formData.startTime ? "text-white" : "text-[#6A6A6A]"}>
                      {formatDateTimeForDisplay(formData.startTime)}
                    </span>
                    <IconCalendar size={16} className="text-[#6A6A6A]" />
                  </button>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                    <IconCalendar size={16} />
                    End Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEndTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between"
                  >
                    <span className={formData.endTime ? "text-white" : "text-[#6A6A6A]"}>
                      {formatDateTimeForDisplay(formData.endTime)}
                    </span>
                    <IconCalendar size={16} className="text-[#6A6A6A]" />
                  </button>
                  {errors.endTime && <p className="text-red-400 text-sm mt-1">{errors.endTime}</p>}
                </div>
              </div>

              {/* Links */}
              <div>
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
                    className="flex-1 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-4 py-2 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-all duration-200 flex items-center gap-1"
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
                        className="flex items-center justify-between bg-[#2A2A2A] px-3 py-2 rounded-lg border border-[#3A3A3A]"
                      >
                        <span className="text-[#C8A2D6] text-sm truncate">{link}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(index)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                        >
                          <IconTrash size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Color
                </label>
                <div className="flex gap-3 flex-wrap">
                  {colorOptions.map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 ${
                        formData.color === color 
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-[#3A3A3A] hover:border-[#6A6A6A] hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      whileHover={{ scale: formData.color === color ? 1.1 : 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    />
                  ))}
                </div>
              </div>

              {errors.submit && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                >
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </motion.div>
              )}

              {/* Preview of todo being created */}
              {formData.title && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]"
                >
                  <p className="text-[#6A6A6A] text-xs mb-3">Preview:</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-md border border-[#424242]"></div>
                    <span className="text-white text-sm font-medium">{formData.title}</span>
                    <div className="flex items-center space-x-2 ml-auto">
                      {formData.priority === 'high' && <div className="w-2 h-2 rounded-full bg-red-500" title="High Priority" />}
                      {formData.priority === 'medium' && <div className="w-2 h-2 rounded-full bg-yellow-500" title="Medium Priority" />}
                      {formData.priority === 'low' && <div className="w-2 h-2 rounded-full bg-green-500" title="Low Priority" />}
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: formData.color }}
                      />
                    </div>
                  </div>
                  {(isCustomCategory ? customCategoryName : formData.category) && (
                    <p className="text-[#6A6A6A] text-xs mt-2">
                      Category: {isCustomCategory ? 
                        customCategoryName.charAt(0).toUpperCase() + customCategoryName.slice(1) : 
                        predefinedCategories.find(cat => cat.value === formData.category)?.label || formData.category
                      }
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
    </>
  );
}
