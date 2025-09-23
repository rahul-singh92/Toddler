import { Todo } from "../types/todo";

// Helper function to check if two todos overlap in time
export function todosOverlap(todo1: Todo, todo2: Todo): boolean {
  if (!todo1.startTime || !todo2.startTime) return false;

  const start1 = todo1.startTime.getTime();
  const end1 = todo1.endTime ? todo1.endTime.getTime() : start1 + (60 * 60 * 1000);
  const start2 = todo2.startTime.getTime();
  const end2 = todo2.endTime ? todo2.endTime.getTime() : start2 + (60 * 60 * 1000);

  return start1 < end2 && start2 < end1;
}

// Helper function to group overlapping todos (for timed todos)
export function groupOverlappingTodos(todos: Todo[]): Todo[][] {
  const groups: Todo[][] = [];
  const processed = new Set<string>();

  todos.forEach(todo => {
    if (!todo.id || processed.has(todo.id)) return;

    const overlappingGroup = [todo];
    processed.add(todo.id);

    todos.forEach(otherTodo => {
      if (otherTodo.id && otherTodo.id !== todo.id && !processed.has(otherTodo.id)) {
        const overlapsWithGroup = overlappingGroup.some(groupTodo => todosOverlap(groupTodo, otherTodo));
        if (overlapsWithGroup) {
          overlappingGroup.push(otherTodo);
          processed.add(otherTodo.id);
        }
      }
    });

    groups.push(overlappingGroup);
  });

  return groups;
}

// ✅ NEW: Helper function to group all-day todos for stacking
export function groupAllDayTodos(todos: Todo[]): Todo[][] {
  if (todos.length === 0) return [];
  if (todos.length === 1) return [todos];

  // Stack all all-day todos together in one group
  return [todos];
}

// ✅ NEW: Helper function to determine if a todo is all-day
export function isAllDayTodo(todo: Todo): boolean {
  // A todo is considered all-day if it has no startTime
  return !todo.startTime;
}

// Helper function to generate recurring dates for a todo
export function generateRecurringDates(todo: Todo, viewStartDate: Date, viewEndDate: Date): Date[] {
  if (!todo.recurrence || todo.recurrence.type === 'none' || !todo.startTime) {
    return [];
  }

  const dates: Date[] = [];
  const startDate = new Date(todo.startTime);
  const interval = todo.recurrence.interval || 1;

  let endDate = viewEndDate;
  if (todo.recurrence.endDate) {
    const recurrenceEndDate = typeof todo.recurrence.endDate === 'string'
      ? new Date(todo.recurrence.endDate)
      : todo.recurrence.endDate instanceof Date
        ? todo.recurrence.endDate
        : new Date(todo.recurrence.endDate);
    endDate = new Date(Math.min(endDate.getTime(), recurrenceEndDate.getTime()));
  }

  let currentDate = new Date(startDate);

  while (currentDate <= endDate && dates.length < 100) {
    if (currentDate >= viewStartDate && currentDate <= viewEndDate) {
      dates.push(new Date(currentDate));
    }

    switch (todo.recurrence.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
      default:
        break;
    }

    if (currentDate.getTime() === startDate.getTime()) {
      break;
    }
  }

  return dates;
}
