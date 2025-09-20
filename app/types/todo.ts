export interface SharedUser {
  userId: string;
  name: string;
  email: string;        // ADD THIS - needed for display
  photoUrl?: string;
  role?: 'viewer' | 'editor' | 'admin';  // ADD THIS - for permissions
}

export interface Recurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  daysOfWeek?: number[]; // 0-6, Sunday to Saturday
  interval?: number; // e.g., every 2 weeks
  endDate?: Date | string; // ADD string support for form handling
}

export interface Todo {
  id?: string;
  title: string;
  description: string;
  category: string;
  links: string[];
  startTime?: Date;
  endTime?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  color: string;
  style?: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: SharedUser[]; // Keep this for future sharing feature
  recurrence: Recurrence;
  ownerId: string;
}

export interface TodoFormData {
  title: string;
  description: string;
  category: string;
  links: string;
  startTime: string;
  endTime: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
  // ADD recurrence support to form
  recurrence?: {
    type: string;
    interval?: number;
    endDate?: string;
  };
}

// ADD: Interface for current simplified sharing (if you want to support both)
export interface SimpleTodoSharing {
  sharedWith: string[]; // Just email addresses
}

// ADD: Union type to support both current and future implementations
export type TodoWithFlexibleSharing = Omit<Todo, 'sharedWith'> & {
  sharedWith: SharedUser[] | string[]; // Support both formats
};
