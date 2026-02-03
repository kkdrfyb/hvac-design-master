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

export interface DesignPlan {
  id: string;
  name: string; // Milestone content
  date: string; // Date string YYYY-MM-DD
}

export interface GalleryItem {
  id: string;
  title: string;
  drawingNumber?: string; // New field
  url: string; // base64 or object url
  category: string;
  uploadDate: string;
  type: 'image' | 'pdf'; // New field
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
  plans: DesignPlan[];
  designInputContent: string; // Rich text/long text content
  gallery: GalleryItem[];
}

export interface MainProject {
  id: string;
  name: string;
  code: string;
  subProjects: SubProject[];
}

export type ViewState = 'dashboard' | 'regulations' | 'errors' | 'ai-assistant' | 'gallery';

export type ThemeColor = 'blue' | 'emerald' | 'rose' | 'violet';
