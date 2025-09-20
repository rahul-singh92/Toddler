"use client";
import { useState } from "react";
import { Todo } from "../../types/todo";
import TodoCard from "./TodoCard";

interface StackedTodoCardsProps {
  todos: Todo[];
  onTodoClick: (todo: Todo) => void;
}

export default function StackedTodoCards({ todos, onTodoClick }: StackedTodoCardsProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (todos.length === 1) {
    return (
      <TodoCard 
        todo={todos[0]} 
        onClick={() => onTodoClick(todos[0])}
        instanceDate={todos[0].startTime}
      />
    );
  }

  // Sort todos by priority and creation time for consistent stacking order
  const sortedTodos = [...todos].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {sortedTodos.map((todo, index) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onClick={() => onTodoClick(todo)}
          instanceDate={todo.startTime}
          stackIndex={index}
          isStacked={true}
          isExpanded={isHovered}
          totalInStack={sortedTodos.length}
        />
      ))}
    </div>
  );
}
