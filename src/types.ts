export type DesignStage = '方案设计' | '初步设计' | '施工图设计';

export type ProjectType = '核岛厂房' | '附属工业厂房' | '其他';

export type TaskGroup = 'INTERNAL' | 'INTERFACE' | 'RISK' | 'DELIVERABLE' | 'EQUIPMENT_REVIEW';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export interface SubmissionFile {
  id?: string;
  name: string;
  type: string;
  size?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  source?: string;
  downloadPath?: string;
}

export interface SubmissionVersion {
  version: string; // A, B, C...
  date: string;
  files: SubmissionFile[];
}

export interface TaskComment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  targetType: 'stage' | 'task' | 'file' | 'comment';
  targetId: string;
  detail?: string;
}

export interface TemplateItem {
  id: string;
  content: string;
  group: TaskGroup;
  categoryId: string;
  category: string;
  minimal?: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  group: TaskGroup;
  items: TemplateItem[];
}

export interface TaskItem {
  id: string;
  categoryId: string;
  category: string; // Changed from enum to string to support dynamic categories
  group: TaskGroup;
  stage: DesignStage;
  content: string;
  status: TaskStatus;
  blockedReason?: string;
  versions: SubmissionVersion[]; // Support multiple versions with multiple files
  comments: TaskComment[];
}

export interface MandatoryClause {
  id: string;
  code: string;
  clauseNumber: string;
  content: string;
}

export interface CommonError {
  id: string;
  title: string;
  description: string;
  solution: string;
  category: string;
}

export interface SubProject {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  stage: DesignStage;
  stageHistory: DesignStage[];
  enabledCategoryIds: string[];
  tasks: TaskItem[];
  operationLogs: OperationLog[];
}

export interface MainProject {
  id: string;
  name: string;
  code: string;
  subProjects: SubProject[];
}

export interface NewProjectDraft {
  mainName: string;
  mainCode: string;
  subName: string;
  subCode: string;
  type: ProjectType;
  stage: DesignStage;
  enabledCategoryIds: string[];
}

export type ViewState = 'dashboard' | 'regulations' | 'errors';

export type ThemeColor = 'blue' | 'emerald' | 'rose' | 'violet';
