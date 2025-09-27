"use client";
import React, { useState, useEffect, useRef } from "react";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...",
  className = "",
  maxHeight = "240px",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [actualMaxHeight, setActualMaxHeight] = useState(maxHeight);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate optimal dropdown position and height
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom - 20; // 20px buffer
      const spaceAbove = buttonRect.top - 20; // 20px buffer
      
      // Calculate item height (48px per item + padding)
      const itemHeight = 48;
      const padding = 16; // Top and bottom padding
      const idealDropdownHeight = Math.min(options.length * itemHeight + padding, parseInt(maxHeight));
      
      let finalPosition: 'bottom' | 'top' = 'bottom';
      let finalMaxHeight = maxHeight;
      
      // If dropdown doesn't fit below, check if it fits better above
      if (spaceBelow < idealDropdownHeight) {
        if (spaceAbove > spaceBelow && spaceAbove >= 150) { // Minimum 150px for usability
          finalPosition = 'top';
          finalMaxHeight = `${Math.min(spaceAbove - 10, parseInt(maxHeight))}px`; // 10px extra buffer
        } else {
          // Use bottom but constrain height to available space with buffer
          finalMaxHeight = `${Math.max(150, spaceBelow - 10)}px`; // 10px buffer
        }
      }
      
      setDropdownPosition(finalPosition);
      setActualMaxHeight(finalMaxHeight);
    }
  }, [isOpen, options.length, maxHeight]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
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

      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent flex items-center justify-between transition-all duration-200 ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-[#333333] cursor-pointer'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={selectedOption ? "text-white truncate" : "text-[#6A6A6A] truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-shrink-0 ml-2"
        >
          <IconChevronDown size={16} className="text-[#6A6A6A]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              y: dropdownPosition === 'bottom' ? -10 : 10, 
              scale: 0.95 
            }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1 
            }}
            exit={{ 
              opacity: 0, 
              y: dropdownPosition === 'bottom' ? -10 : 10, 
              scale: 0.95 
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-0 right-0 ${
              dropdownPosition === 'bottom' 
                ? 'top-full mt-2' 
                : 'bottom-full mb-2'
            } bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg shadow-2xl z-[60] overflow-hidden backdrop-blur-sm`}
            style={{ maxHeight: actualMaxHeight }}
          >
            {/* Custom scrollable container with proper padding */}
            <div 
              className="custom-scrollbar overflow-y-auto overflow-x-hidden py-2"
              style={{ 
                maxHeight: `calc(${actualMaxHeight} - 4px)` // Account for padding
              }}
              role="listbox"
            >
              {options.map((option, index) => (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-4 py-3 text-left text-white hover:bg-[#3A3A3A] transition-all duration-150 flex items-center justify-between group focus:bg-[#3A3A3A] focus:outline-none"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                  whileHover={{ backgroundColor: "#3A3A3A" }}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <span 
                    className={`truncate pr-2 ${option.value === "custom" ? "text-[#C8A2D6]" : ""}`}
                    title={option.label} // Show full text on hover
                  >
                    {option.label}
                  </span>
                  {value === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <IconCheck size={16} className="text-[#C8A2D6]" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdown;
