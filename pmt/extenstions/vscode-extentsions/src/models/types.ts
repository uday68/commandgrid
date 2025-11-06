// Basic type definitions for the project management extension

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignee?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  tasks: Task[];
  members: string[];
  repositoryUrl?: string;
}

export interface ComplexityEstimate {
  score: number;
  level: 'simple' | 'moderate' | 'complex' | 'very-complex';
  estimatedHours: number;
}

// Other required interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  assignees?: User[];
  labels?: string[];
}

export interface AIResponse {
  content: string;
  type: 'text' | 'code' | 'error';
}