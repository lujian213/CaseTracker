
// @ts-ignore
import * as XLSX from 'xlsx';

export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const formatDateTime = (timestamp: number | null): string => {
  if (!timestamp || isNaN(Number(timestamp))) return '进行中';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (timestamp: number): string => {
  const date = isNaN(Number(timestamp)) ? new Date() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateDuration = (start: number, end: number | null): number => {
  const endTime = Number(end);
  const startTime = Number(start);
  if (!end || isNaN(endTime) || isNaN(startTime)) return 0;
  return Math.max(1, Math.round((endTime - startTime) / 60000));
};

export const formatDurationDisplay = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
};

export const downloadJson = (data: any, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadCsv = (headers: string[], rows: string[][], fileName: string) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const safeValue = (cell === undefined || cell === null) ? '' : String(cell);
      return `"${safeValue.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadXlsx = (headers: string[], rows: string[][], fileName: string) => {
  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "时间报表");

  // Set column widths. 40-50 width is good for viewing time ranges.
  worksheet['!cols'] = [
    { wch: 25 }, // 案件
    { wch: 12 }, // 类型
    { wch: 30 }, // 内容
    { wch: 30 }, // 注释
    { wch: 45 }, // 起止时间
    { wch: 12 }, // 时长
  ];

  XLSX.writeFile(workbook, fileName);
};
