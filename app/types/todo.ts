export interface SharedUser {
  userId: string;
  name: string;
  photoUrl?: string;
}

export interface Recurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  daysOfWeek?: number[]; // 0-6, Sunday to Saturday
  interval?: number; // e.g., every 2 weeks
  endDate?: Date;
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
  sharedWith: SharedUser[];
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
}
