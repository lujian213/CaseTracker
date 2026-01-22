
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
  workContent: string; // 已修改：从 attorney 改为 workContent
  notes: string;
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface AppData {
  cases: Case[];
  entries: TimeEntry[];
  workTypes: string[];
}
