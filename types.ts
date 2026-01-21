
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
  workType: WorkType;
  notes: string;
  startTime: number;
  endTime: number | null; // null if currently active
  duration: number; // in minutes
}

export interface AppData {
  cases: Case[];
  entries: TimeEntry[];
}
