export type DesignStage = '方案设计' | '初步设计' | '施工图设计';

export type ProjectType = '核岛厂房' | '附属工业厂房' | '其他';

export type TaskGroup = 'INTERFACE' | 'RISK' | 'DELIVERABLE';

export interface SubmissionFile {
  name: string;
  type: string;
}

export interface SubmissionVersion {
  version: string; // A, B, C...
  date: string;
  files: SubmissionFile[];
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
  isCompleted: boolean;
  versions: SubmissionVersion[]; // Support multiple versions with multiple files
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
}

export interface MainProject {
  id: string;
  name: string;
  code: string;
  subProjects: SubProject[];
}

export type ViewState = 'dashboard' | 'regulations' | 'errors';

export type ThemeColor = 'blue' | 'emerald' | 'rose' | 'violet';
