// Import CollaboratorInfo from collaboration types
import { CollaboratorInfo } from './collaboration';

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
  sharedWith: CollaboratorInfo[]; // Updated to use CollaboratorInfo for consistency
  recurrence: Recurrence;
  ownerId?: string; // Made optional since it might not always be set
  
  // NEW: Collaboration fields
  isShared?: boolean;           // Indicates this is a shared todo
  originalId?: string;          // Reference to the original todo ID
  originalOwnerId?: string;     // ID of the original todo creator
  collaborationType?: 'owner' | 'collaborator'; // User's role in this todo
  sharedBy?: {                  // Info about who shared it
    userId: string;
    displayName: string;
    email: string;
    photoURL: string;
  };
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

// Keep SharedUser for backward compatibility if needed
export interface SharedUser {
  userId: string;
  name: string;
  email: string;
  photoUrl?: string;
  role?: 'viewer' | 'editor' | 'admin';
}

// ADD: Union type to support both current and future implementations during migration
export type TodoWithFlexibleSharing = Omit<Todo, 'sharedWith'> & {
  sharedWith: CollaboratorInfo[] | SharedUser[] | string[]; // Support multiple formats
};

// ADD: Helper type for todos that haven't been saved yet (no ID)
export type NewTodo = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;

// ADD: Helper type for todo updates (partial fields)
export type TodoUpdate = Partial<Omit<Todo, 'id' | 'createdAt'>> & {
  id: string;
  updatedAt: Date;
};

// ADD: Helper type for creating shared todos
export type SharedTodoData = Omit<Todo, 'id'> & {
  isShared: true;
  originalId: string;
  originalOwnerId: string;
  collaborationType: 'collaborator';
  sharedBy: {
    userId: string;
    displayName: string;
    email: string;
    photoURL: string;
  };
};

// ADD: Helper type for original todo (when creating shares)
export type OriginalTodoData = Todo & {
  collaborationType?: 'owner';
  isShared?: false;
};
