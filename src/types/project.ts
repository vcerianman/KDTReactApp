export type ProjectStatus =
  | 'active'
  | 'on_hold'
  | 'on hold'
  | 'in_progress'
  | 'completed'
  | 'archived'
  | 'planning'
  | string;

export interface Project {
  id: string | number;
  title: string;
  desc?: string;
  description?: string;
  status: ProjectStatus;
  dates?: string;
  startDate?: string;
  endDate?: string;
  ownerId?: string | number;
  owner?: string;
  members?: string[];
  [key: string]: any;
}

