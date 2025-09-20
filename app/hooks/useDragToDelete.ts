"use client";
import { useState } from "react";

interface UseDragToDeleteProps<T> {
  onDelete: (item: T) => void;
}

export function useDragToDelete<T>({ onDelete }: UseDragToDeleteProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLElement>, item: T, itemId: string) => {
    if (!itemId) {
      console.error("Cannot drag item without ID");
      return;
    }

    setIsDragging(true);
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image with item title/name
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-image';
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      padding: 10px 16px;
      background: linear-gradient(135deg, rgba(200, 162, 214, 0.95), rgba(139, 92, 246, 0.95));
      color: white;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      z-index: 9999;
    `;
    
    // Try to get item name/title from various possible properties
    const itemName = (item as any)?.title || (item as any)?.name || 'Item';
    dragImage.textContent = itemName;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Remove drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setIsOverTrash(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOverTrash(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOverTrash(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Reset drag states immediately for clean UI
    setIsOverTrash(false);
    setIsDragging(false);
    
    if (draggedItem) {
      onDelete(draggedItem);
    }
    
    // Clean up dragged item state
    setDraggedItem(null);
  };

  return {
    isDragging,
    draggedItem,
    isOverTrash,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}
