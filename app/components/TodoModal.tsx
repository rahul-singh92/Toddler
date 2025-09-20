"use client";
import React, { useState, useEffect } from "react";
import { IconX, IconCalendar, IconLink, IconPlus, IconTrash } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Todo, TodoFormData, Recurrence } from "../types/todo";

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setLinksList([]);
      setCurrentLink("");
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleAddLink = () => {
    if (currentLink.trim() && !linksList.includes(currentLink.trim())) {
      setLinksList(prev => [...prev, currentLink.trim()]);
      setCurrentLink("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinksList(prev => prev.filter((_, i) => i !== index));
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

      const todoData: Omit<Todo, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
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
                className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
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
                className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent resize-none"
                placeholder="Add a description..."
              />
            </div>

            {/* Category & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
                >
                  <option value="personal">Personal</option>
                  <option value="work">Work</option>
                  <option value="study">Study</option>
                  <option value="health">Health</option>
                  <option value="hobby">Hobby</option>
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <IconCalendar size={16} />
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <IconCalendar size={16} />
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
                />
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
                  className="flex-1 px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="px-4 py-2 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-colors flex items-center gap-1"
                >
                  <IconPlus size={16} />
                  Add
                </button>
              </div>
              
              {linksList.length > 0 && (
                <div className="space-y-2">
                  {linksList.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-[#2A2A2A] px-3 py-2 rounded-lg">
                      <span className="text-[#C8A2D6] text-sm truncate">{link}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.color === color 
                        ? 'border-white scale-110' 
                        : 'border-[#3A3A3A] hover:border-[#6A6A6A]'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#2A2A2A] text-[#BDBDBD] rounded-lg hover:bg-[#3A3A3A] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Todo"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
