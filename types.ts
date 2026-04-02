
export enum WorkType {
  Meeting = '会议',
  Email = '邮件',
  Court = '开庭',
  Docs = '文档整理',
  Other = '其他'
}

export interface Case {
  id: string;
  code: string;
  name: string;
  description: string;
  isOpen: boolean;
}

export interface TimeEntry {
  id: string;
  caseId: string;
  workType: string;
  workContent: string;
  notes: string;
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface BackupSettings {
  interval: number; // 间隔分钟数，0 表示关闭
  lastBackupTime: number;
}

export interface ExpenseEntry {
  id: string;
  caseId: string;
  type: string;
  amount: number;
  date: number; // timestamp
  notes: string;
}

export interface AppData {
  cases: Case[];
  entries: TimeEntry[];
  expenses: ExpenseEntry[];
  workTypes: string[];
  expenseTypes: string[];
  backupSettings?: BackupSettings;
}

export type SortField = 'case' | 'type' | 'time' | 'duration';
export type SortOrder = 'asc' | 'desc';

export type AdminTab = 'cases' | 'worktypes' | 'records' | 'expenses' | 'reports' | 'system';
