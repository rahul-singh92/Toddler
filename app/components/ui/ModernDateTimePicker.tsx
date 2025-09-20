"use client";
import React, { useState, useEffect, useRef } from "react";
import { IconX, IconChevronLeft, IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomDropdown from "./CustomDropdown";

interface ModernDateTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  title: string;
  initialValue?: string;
}

const ModernDateTimePicker: React.FC<ModernDateTimePickerProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  initialValue 
}) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(today.getHours());
  const [selectedMinute, setSelectedMinute] = useState(today.getMinutes());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  // Month and Year picker states
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  const monthPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setIsYearPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize with provided value
  useEffect(() => {
    if (initialValue && isOpen) {
      const date = new Date(initialValue);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setSelectedHour(date.getHours());
        setSelectedMinute(date.getMinutes());
        setCurrentMonth(date.getMonth());
        setCurrentYear(date.getFullYear());
      }
    } else if (isOpen) {
      const now = new Date();
      setSelectedDate(now);
      setSelectedHour(now.getHours());
      setSelectedMinute(now.getMinutes());
      setCurrentMonth(now.getMonth());
      setCurrentYear(now.getFullYear());
    }
    
    // Reset picker states when modal opens
    if (isOpen) {
      setIsMonthPickerOpen(false);
      setIsYearPickerOpen(false);
    }
  }, [initialValue, isOpen]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Generate only future years (current + 5 years)
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // Generate hour options for CustomDropdown
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: i.toString().padStart(2, '0')
  }));

  // Generate minute options for CustomDropdown
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString(),
    label: i.toString().padStart(2, '0')
  }));

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day, selectedHour, selectedMinute);
    setSelectedDate(newDate);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(monthIndex);
    setIsMonthPickerOpen(false);
    const newDate = new Date(currentYear, monthIndex, Math.min(selectedDate.getDate(), getDaysInMonth(monthIndex, currentYear)));
    setSelectedDate(newDate);
  };

  const handleYearSelect = (year: number) => {
    setCurrentYear(year);
    setIsYearPickerOpen(false);
    const newDate = new Date(year, currentMonth, Math.min(selectedDate.getDate(), getDaysInMonth(currentMonth, year)));
    setSelectedDate(newDate);
  };

  const handleHourChange = (value: string) => {
    setSelectedHour(parseInt(value));
  };

  const handleMinuteChange = (value: string) => {
    setSelectedMinute(parseInt(value));
  };

  const handleConfirm = () => {
    const finalDate = new Date(currentYear, currentMonth, selectedDate.getDate(), selectedHour, selectedMinute);
    const isoString = finalDate.toISOString().slice(0, 16);
    onConfirm(isoString);
    onClose();
  };

  const isToday = (day: number) => {
    const testDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    return testDate.toDateString() === today.toDateString();
  };

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth && 
           selectedDate.getFullYear() === currentYear;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-[#1A1A1A] rounded-2xl p-5 w-full max-w-sm border border-[#2A2A2A] shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header - Compact */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6A6A6A] hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-colors"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Calendar Header - Compact */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-[#6A6A6A] hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-colors"
              >
                <IconChevronLeft size={16} />
              </button>
              
              <div className="flex items-center space-x-2">
                {/* Compact Month */}
                <div className="relative" ref={monthPickerRef}>
                  <button
                    onClick={() => {
                      setIsMonthPickerOpen(!isMonthPickerOpen);
                      setIsYearPickerOpen(false);
                    }}
                    className="px-2 py-1 text-sm text-white font-medium hover:bg-[#2A2A2A] rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <span>{months[currentMonth]}</span>
                    <IconChevronDown size={12} className={`transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isMonthPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-2xl z-50 w-32 max-h-48 overflow-y-auto"
                      >
                        <div className="p-1">
                          {months.map((month, index) => (
                            <button
                              key={index}
                              onClick={() => handleMonthSelect(index)}
                              className={`w-full px-2 py-1.5 text-left text-xs transition-colors rounded-lg hover:bg-[#3A3A3A] ${
                                index === currentMonth 
                                  ? 'bg-[#C8A2D6]/20 text-[#C8A2D6]' 
                                  : 'text-white'
                              }`}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Compact Year */}
                <div className="relative" ref={yearPickerRef}>
                  <button
                    onClick={() => {
                      setIsYearPickerOpen(!isYearPickerOpen);
                      setIsMonthPickerOpen(false);
                    }}
                    className="px-2 py-1 text-sm text-white font-medium hover:bg-[#2A2A2A] rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <span>{currentYear}</span>
                    <IconChevronDown size={12} className={`transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isYearPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-2xl z-50 w-20 max-h-48 overflow-y-auto"
                      >
                        <div className="p-1">
                          {generateYears().map((year) => (
                            <button
                              key={year}
                              onClick={() => handleYearSelect(year)}
                              className={`w-full px-2 py-1.5 text-center text-xs transition-colors rounded-lg hover:bg-[#3A3A3A] ${
                                year === currentYear 
                                  ? 'bg-[#C8A2D6]/20 text-[#C8A2D6]' 
                                  : 'text-white'
                              }`}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <button
                onClick={handleNextMonth}
                className="p-2 text-[#6A6A6A] hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-colors"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            {/* Compact Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day, index) => (
                <div key={index} className="text-center text-xs text-[#6A6A6A] font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Compact Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <div key={index} className="aspect-square">
                  {day && (
                    <button
                      onClick={() => handleDateSelect(day)}
                      className={`w-full h-full rounded-lg text-xs font-medium transition-all duration-200 ${
                        isSelected(day)
                          ? 'bg-[#C8A2D6] text-black shadow-md'
                          : isToday(day)
                          ? 'bg-[#C8A2D6]/20 text-[#C8A2D6] border border-[#C8A2D6]/50'
                          : 'text-white hover:bg-[#2A2A2A]'
                      }`}
                    >
                      {day}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Compact Time Selection */}
          <div className="mb-4">
            <h5 className="text-white text-sm font-medium mb-3">Time</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#6A6A6A] mb-2">Hour</label>
                <CustomDropdown
                  options={hourOptions}
                  value={selectedHour.toString()}
                  onChange={handleHourChange}
                  placeholder="Hour"
                />
              </div>
              
              <div>
                <label className="block text-xs text-[#6A6A6A] mb-2">Min</label>
                <CustomDropdown
                  options={minuteOptions}
                  value={selectedMinute.toString()}
                  onChange={handleMinuteChange}
                  placeholder="Min"
                />
              </div>
            </div>
          </div>

          {/* Compact Selected DateTime Display */}
          <div className="mb-4 p-3 bg-[#2A2A2A] rounded-xl border border-[#3A3A3A]">
            <div className="text-center">
              <div className="text-white font-medium text-sm">
                {new Date(currentYear, currentMonth, selectedDate.getDate()).toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-[#C8A2D6] text-base font-semibold mt-1">
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Compact Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-[#2A2A2A] text-[#BDBDBD] rounded-xl hover:bg-[#3A3A3A] transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 bg-[#C8A2D6] text-black rounded-xl hover:bg-[#B892C6] transition-colors font-medium text-sm shadow-lg"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ModernDateTimePicker;
