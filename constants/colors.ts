// 颜色调色板 - 案件颜色（用于图表）- 避免与"全部案件"按钮的indigo色冲突
export const CASE_COLORS = [
  '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#0ea5e9', '#3b82f6', '#64748b', '#a855f7',
  '#06b6d4', '#84cc16', '#ef4444', '#10b981', '#f59e0b'
];

// 工作类型颜色 - 使用更多不同的颜色确保不重复
export const WORK_TYPE_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#06b6d4',
  '#6366f1', '#f43f5e', '#22c55e', '#0ea5e9', '#d946ef',
  '#eab308', '#64748b', '#f472b6', '#0d9488', '#dc2626'
];

// 费用类型颜色 - 与工作类型使用相同的高对比度配色
export const EXPENSE_TYPE_COLORS = WORK_TYPE_COLORS;

// 获取案件颜色 - 使用稳定索引
export const getCaseColor = (index: number): string => {
  if (index < 0) return CASE_COLORS[0];
  return CASE_COLORS[index % CASE_COLORS.length];
};