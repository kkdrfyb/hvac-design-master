export enum TaskCategory {
  // Outgoing Submissions (Dynamic now, but keeping enum for defaults)
  STRUCTURE_SUBMISSION = '提资结构',
  ELECTRICAL_SUBMISSION = '提资电气',
  IC_SUBMISSION = '提资自控',
  COMM_SUBMISSION = '提资通信',
  RAD_SUBMISSION = '提资防护',
  PLAN_SUBMISSION = '提资总图',

  // Calculations
  LOAD_CALC = '负荷计算',
  SMOKE_CALC = '防排烟计算',
  RESISTANCE_CALC = '系统水/风阻力',
  EQUIP_REVIEW = '设备校核',
  
  // Specific Process
  HEATING_PIPELINE = '采暖管道',
  VENTILATION_SYSTEM = '通风系统',
  GENERAL_DESIGN = '通用设计流程',
  
  // Received Data
  RX_ARCH = '接收建筑',
  RX_STRUCT = '接收结构',
  RX_PROCESS = '接收工艺',
  RX_ELEC = '接收电气'
}

export type TaskGroup = 'CALCULATION' | 'OUTGOING' | 'RECEIVED' | 'DESIGN_PROCESS';

export interface SubmissionFile {
  name: string;
  type: string;
}

export interface SubmissionVersion {
  version: string; // A, B, C...
  date: string;
  files: SubmissionFile[];
}

export interface TaskItem {
  id: string;
  category: string; // Changed from enum to string to support dynamic categories
  group: TaskGroup;
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
  tasks: TaskItem[];
  plans: DesignPlan[];
  designInputContent: string; // Rich text/long text content
  gallery: GalleryItem[];
  submissionCategories: string[]; // Dynamic categories for Outgoing
  receivedCategories: string[]; // Dynamic categories for Received
}

export interface MainProject {
  id: string;
  name: string;
  code: string;
  subProjects: SubProject[];
}

export type ViewState = 'dashboard' | 'regulations' | 'errors' | 'ai-assistant' | 'gallery';

export type ThemeColor = 'blue' | 'emerald' | 'rose' | 'violet';