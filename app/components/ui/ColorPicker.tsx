"use client";
import React, { useState, useRef, useEffect } from "react";
import { IconPalette, IconColorPicker, IconHash, IconCheck } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  value, 
  onChange, 
  presetColors = [
    "#C8A2D6", "#FF6B6B", "#4ECDC4", "#45B7D1", 
    "#F9CA24", "#6C5CE7", "#A0E7E5", "#FEA47F"
  ]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'presets' | 'wheel' | 'hex'>('presets');
  const [hexValue, setHexValue] = useState(value);
  const [wheelPosition, setWheelPosition] = useState({ x: 50, y: 50 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update hex value when color changes
  useEffect(() => {
    setHexValue(value);
  }, [value]);

  // Draw color wheel
  useEffect(() => {
    if (mode === 'wheel' && wheelRef.current) {
      const canvas = wheelRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 10;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw color wheel
      for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = angle * Math.PI / 180;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineWidth = radius;
        ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
        ctx.stroke();
      }

      // Draw inner circle for saturation/lightness
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.8);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, [mode]);

  const handleWheelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!wheelRef.current) return;

    const canvas = wheelRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(centerX, centerY) - 10;

    if (distance <= radius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const hue = (angle + 360) % 360;
      const saturation = Math.min(distance / (radius * 0.8), 1) * 100;
      const lightness = 50;
      
      const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const hexColor = hslToHex(hue, saturation, lightness);
      
      setWheelPosition({ x: (x / canvas.width) * 100, y: (y / canvas.height) * 100 });
      onChange(hexColor);
    }
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const isValidHex = (hex: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexValue(newHex);
    
    if (isValidHex(newHex)) {
      onChange(newHex);
    }
  };

  const handleHexSubmit = () => {
    if (isValidHex(hexValue)) {
      onChange(hexValue);
    } else {
      setHexValue(value); // Reset to current value if invalid
    }
  };

  return (
    <div className="min-w-0 relative" ref={containerRef}>
      <label className="block text-white text-sm font-medium mb-2">
        Color
      </label>
      
      {/* Color Preview Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent transition-all duration-200 hover:bg-[#333333] flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-6 h-6 rounded-lg border-2 border-[#4A4A4A]" 
            style={{ backgroundColor: value }}
          />
          <span className="text-white text-sm">{value.toUpperCase()}</span>
        </div>
        <IconPalette size={16} className="text-[#6A6A6A]" />
      </button>

      {/* Color Picker Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-[60] mt-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl shadow-2xl overflow-hidden left-0 right-0"
            style={{ minWidth: '320px' }}
          >
            {/* Mode Selector */}
            <div className="p-4 border-b border-[#3A3A3A]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('presets')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    mode === 'presets' 
                      ? 'bg-[#C8A2D6] text-black' 
                      : 'bg-[#3A3A3A] text-[#BDBDBD] hover:bg-[#4A4A4A]'
                  }`}
                >
                  <IconPalette size={14} />
                  Presets
                </button>
                <button
                  type="button"
                  onClick={() => setMode('wheel')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    mode === 'wheel' 
                      ? 'bg-[#C8A2D6] text-black' 
                      : 'bg-[#3A3A3A] text-[#BDBDBD] hover:bg-[#4A4A4A]'
                  }`}
                >
                  <IconColorPicker size={14} />
                  Wheel
                </button>
                <button
                  type="button"
                  onClick={() => setMode('hex')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    mode === 'hex' 
                      ? 'bg-[#C8A2D6] text-black' 
                      : 'bg-[#3A3A3A] text-[#BDBDBD] hover:bg-[#4A4A4A]'
                  }`}
                >
                  <IconHash size={14} />
                  Hex
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {mode === 'presets' && (
                <div className="space-y-3">
                  <p className="text-[#BDBDBD] text-xs">Choose from preset colors:</p>
                  <div className="grid grid-cols-4 gap-3">
                    {presetColors.map((color) => (
                      <motion.button
                        key={color}
                        type="button"
                        onClick={() => {
                          onChange(color);
                          setIsOpen(false);
                        }}
                        className={`w-12 h-12 rounded-xl border-2 transition-all duration-200 relative ${
                          value === color 
                            ? 'border-white scale-110 shadow-lg' 
                            : 'border-[#4A4A4A] hover:border-[#6A6A6A] hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        whileHover={{ scale: value === color ? 1.1 : 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {value === color && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <IconCheck size={16} className="text-white drop-shadow-lg" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'wheel' && (
                <div className="space-y-3">
                  <p className="text-[#BDBDBD] text-xs">Pick a color from the wheel:</p>
                  <div className="flex justify-center">
                    <div className="relative">
                      <canvas
                        ref={wheelRef}
                        width={200}
                        height={200}
                        className="cursor-crosshair rounded-full"
                        onClick={handleWheelClick}
                      />
                      <div
                        className="absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${wheelPosition.x}%`,
                          top: `${wheelPosition.y}%`,
                          backgroundColor: value
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[#BDBDBD] text-xs">Selected: </span>
                    <span className="text-white font-mono text-sm">{value.toUpperCase()}</span>
                  </div>
                </div>
              )}

              {mode === 'hex' && (
                <div className="space-y-3">
                  <p className="text-[#BDBDBD] text-xs">Enter hex color code:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hexValue}
                      onChange={handleHexChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleHexSubmit()}
                      placeholder="#C8A2D6"
                      className="flex-1 px-3 py-2 bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white placeholder-[#6A6A6A] focus:outline-none focus:ring-2 focus:ring-[#C8A2D6] focus:border-transparent text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleHexSubmit}
                      disabled={!isValidHex(hexValue)}
                      className="px-3 py-2 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <IconCheck size={16} />
                    </button>
                  </div>
                  {hexValue && !isValidHex(hexValue) && (
                    <p className="text-red-400 text-xs">Invalid hex format. Use #RRGGBB or #RGB</p>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-[#3A3A3A] rounded-lg">
                    <div 
                      className="w-8 h-8 rounded-lg border border-[#4A4A4A]"
                      style={{ backgroundColor: isValidHex(hexValue) ? hexValue : value }}
                    />
                    <div>
                      <p className="text-white text-sm font-medium">Preview</p>
                      <p className="text-[#BDBDBD] text-xs font-mono">
                        {isValidHex(hexValue) ? hexValue.toUpperCase() : value.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#3A3A3A] bg-[#252525]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-lg border-2 border-[#4A4A4A]"
                    style={{ backgroundColor: value }}
                  />
                  <span className="text-white text-sm font-mono">{value.toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 bg-[#C8A2D6] text-black rounded-lg hover:bg-[#B892C6] transition-all duration-200 text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ColorPicker;
