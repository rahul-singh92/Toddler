"use client";
import { useState } from "react";

interface UseDragToDeleteProps<T> {
  onDelete: (item: T) => void;
  createCustomDragImage?: (item: T, itemId: string) => HTMLElement | null;
}

export function useDragToDelete<T>({ onDelete, createCustomDragImage }: UseDragToDeleteProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLElement>, item: T, itemId: string) => {
    if (!itemId) {
      console.error("Cannot drag item without ID");
      return;
    }

    // Set drag state FIRST before anything else
    setIsDragging(true);
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';

    console.log('🎯 Drag started, isDragging set to true'); // Debug log

    // Create drag image in next tick to ensure state is set
    setTimeout(() => {
      // Use custom drag image if provided, otherwise use default
      if (createCustomDragImage) {
        try {
          const customDragImage = createCustomDragImage(item, itemId);
          if (customDragImage) {
            document.body.appendChild(customDragImage);
            
            // Note: We can't change the drag image after drag has started,
            // so we need to create it immediately in the drag start handler
            console.log('✅ Custom drag image created');
            
            // Clean up after a delay
            setTimeout(() => {
              if (document.body.contains(customDragImage)) {
                document.body.removeChild(customDragImage);
              }
            }, 100);
            return;
          }
        } catch (error) {
          console.error('❌ Error creating custom drag image:', error);
        }
      }

      // Fallback to default drag image
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
      
      const itemName = (item as any)?.title || (item as any)?.name || 'Item';
      dragImage.textContent = itemName;
      document.body.appendChild(dragImage);

      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    }, 0);
  };

  const handleDragEnd = () => {
    console.log('🏁 Drag ended'); // Debug log
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
    console.log('💧 Drop detected'); // Debug log
    
    setIsOverTrash(false);
    setIsDragging(false);
    
    if (draggedItem) {
      onDelete(draggedItem);
    }
    
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
