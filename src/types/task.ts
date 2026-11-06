export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | string;

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'pending'
  | 'review'
  | 'completed'
  | 'done'
  | string;

export interface Task {
  id: string | number;
  projectId?: string | number;
  title: string;
  desc?: string;
  description?: string;
  priority: TaskPriority;
  status?: TaskStatus;
  assigner?: string;
  assignee?: string;
  dates?: string;
  dueDate?: string;
  createdAt?: string;
  [key: string]: any;
}

