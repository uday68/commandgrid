// src/models/project.ts
export interface Project {
    id: string;
    name: string;
    path: string;
    type: string;
    description?: string;
    features: Feature[];
    tasks: Task[];
    timeline: TimelineEvent[];
    team: TeamMember[];
    githubRepo: GitHubRepository | null;
    createdAt: Date;
    updatedAt: Date;
    config: Record<string, any>;
}

export interface Feature {
    id: string;
    name: string;
    description: string;
    status: 'planned' | 'in-progress' | 'completed' | 'blocked';
    tasks: string[]; // Task IDs
    createdAt: Date;
    updatedAt: Date;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string; // TeamMember ID
    dependencies: string[]; // Task IDs
    estimatedHours?: number;
    actualHours?: number;
    githubIssueId?: number;
    githubIssueUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    lastSyncedAt?: Date;
}

export interface TimelineEvent {
    id: string;
    type: 'milestone' | 'task-completed' | 'note' | 'commit';
    title: string;
    description?: string;
    date: Date;
    relatedItems?: string[]; // IDs of related tasks/features
    metadata?: Record<string, any>;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'developer' | 'designer' | 'product-owner';
    avatarUrl?: string;
}

export interface GitHubRepository {
    url: string;
    owner: string;
    name: string;
    lastSyncedAt?: Date;
}

// Template interface for creating new projects
export interface ProjectTemplate {
    name: string;
    description: string;
    structure: string[];
    initialFiles: { path: string; content: string }[];
    suggestedDependencies?: string[];
}