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
  const d = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${d}`;
};

// New: export-specific formatters so we don't break date inputs which expect yyyy-MM-dd
export const formatDateForExport = (timestamp: number): string => {
  const date = isNaN(Number(timestamp)) ? new Date() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${d}`;
};

export const formatDateTimeForExport = (timestamp: number | null): string => {
  if (!timestamp || isNaN(Number(timestamp))) return '';
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * 生成格式为 YYYYMMDD_HHmmss 的完整时间戳字符串，常用于文件名
 */
export const formatFullTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${d}_${hh}${mm}${ss}`;
};

export const calculateDuration = (start: number, end: number | null): number => {
  const endTime = Number(end);
  const startTime = Number(start);
  if (!end || isNaN(endTime) || isNaN(startTime)) return 0;
  return Math.max(1, Math.round((endTime - startTime) / 60000));
};

// 新增：将分钟数转换为小时并向上取整到 0.1 小时，最小值为 0.1
export const minutesToRoundedHours = (minutes: number): number => {
  if (!minutes || minutes <= 0) return 0.1;
  const hours = minutes / 60;
  return Math.max(0.1, Math.ceil(hours * 10) / 10);
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
  // Ensure headers are escaped the same way as cells
  const escapeCell = (cell: string) => `"${(cell === undefined || cell === null) ? '' : String(cell).replace(/"/g, '""')}"`;
  const csvLines: string[] = [];
  csvLines.push(headers.map(h => escapeCell(h)).join(','));
  rows.forEach(row => {
    csvLines.push(row.map(cell => escapeCell(cell)).join(','));
  });

  const csvContent = csvLines.join('\r\n'); // Windows/Excel compatibility

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

  // 遍历 Worksheet 中所有的单元格，若包含换行符（\n），为其激活自动换行样式。
  Object.keys(worksheet).forEach(cellAddress => {
    if (cellAddress.startsWith('!')) return;
    const cell = worksheet[cellAddress];
    if (cell && cell.t === 's' && typeof cell.v === 'string' && cell.v.includes('\n')) {
      if (!cell.s) cell.s = {} as any;
      if (!cell.s.alignment) cell.s.alignment = {} as any;
      cell.s.alignment.wrapText = true;
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "时间报表");

  // 调整列宽以适应导出表头: [案件名称, 日期, 工作内容, 时长(小时), 起止时间, 注释]
  worksheet['!cols'] = [
    { wch: 25 }, // 案件名称
    { wch: 14 }, // 日期
    { wch: 40 }, // 工作内容
    { wch: 12 }, // 时长(小时)
    { wch: 45 }, // 起止时间
    { wch: 30 }, // 注释
  ];

  XLSX.writeFile(workbook, fileName);
};
