"use client";
import { Todo } from "../../types/todo";
import { isThisWeek, isThisMonth } from "../../utils/dateHelpers";

interface FilterTabsProps {
  todos: Todo[];
  filter: 'all' | 'week' | 'month' | 'completed';
  filteredTodos: Todo[];
  onFilterChange: (filter: 'all' | 'week' | 'month' | 'completed') => void;
}

export default function FilterTabs({ 
  todos, 
  filter, 
  filteredTodos, 
  onFilterChange 
}: FilterTabsProps) {
  const filterOptions = [
    { key: 'all', label: 'All', count: todos.length },
    { key: 'week', label: 'This Week', count: todos.filter(t => t.startTime ? isThisWeek(t.startTime) : isThisWeek(t.createdAt)).length },
    { key: 'month', label: 'This Month', count: todos.filter(t => t.startTime ? isThisMonth(t.startTime) : isThisMonth(t.createdAt)).length },
    { key: 'completed', label: 'Completed', count: todos.filter(t => t.completed).length }
  ];

  return (
    <div className="bg-[#1A1A1A] p-1 rounded-lg w-fit mb-6 border border-gray-800">
      {filterOptions.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key as 'all' | 'week' | 'month' | 'completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            filter === tab.key
              ? 'bg-[#C8A2D6] text-white shadow-lg border-2 border-[#C8A2D6]'
              : 'text-gray-400 hover:text-white border-2 border-transparent hover:border-[#C8A2D6]/30 hover:bg-[#C8A2D6]/10'
          }`}
        >
          {tab.label} ({tab.key === filter ? filteredTodos.length : tab.count})
        </button>
      ))}
    </div>
  );
}
