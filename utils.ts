// @ts-ignore
import ExcelJS from 'exceljs';

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

export const parseDateRange = (startDateStr: string, endDateStr: string): { start: number; end: number } => {
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endDateStr.split('-').map(Number);
  return {
    start: new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0).getTime(),
    end: new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999).getTime()
  };
};

// New: Special date formatter for bill export - format similar to "yyyy/MM/dd"
export const formatDateForBillExport = (timestamp: number): string => {
  const date = isNaN(Number(timestamp)) ? new Date() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Gets month with leading zero
  const day = String(date.getDate()).padStart(2, '0'); // Gets day with leading zero
  return `${year}/${month}/${day}`;
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

export const formatLiveDuration = (startTime: number): string => {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
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

export const downloadXlsx = async (headers: string[], rows: string[][], fileName: string, options?: { bottomAlignColumns?: number[] }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('时间报表');

  // 添加表头
  worksheet.getRow(1).values = headers;

  // 添加数据行
  rows.forEach((row, index) => {
    worksheet.getRow(index + 2).values = row;
  });

  // 设置列宽
  worksheet.getColumn(1).width = 25; // 案件名称
  worksheet.getColumn(2).width = 14; // 日期
  worksheet.getColumn(3).width = 20; // 工作内容
  worksheet.getColumn(4).width = 12; // 时长(小时)
  worksheet.getColumn(5).width = 45; // 起止时间
  worksheet.getColumn(6).width = 30; // 注释

  // 设置工作内容列（第三列，C列）的自动换行
  const colC = worksheet.getColumn(3);
  colC.eachCell({ includeEmpty: true }, (cell) => {
    cell.alignment = { wrapText: true, vertical: 'top' };
  });

  // 设置底部对齐的列
  if (options?.bottomAlignColumns) {
    options.bottomAlignColumns.forEach(colNum => {
      const col = worksheet.getColumn(colNum);
      col.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { ...cell.alignment, vertical: 'bottom' };
      });
    });
  }

  // 设置数据行的行高
  for (let i = 2; i <= rows.length + 1; i++) {
    worksheet.getRow(i).height = 35;
  }

  // 处理时长列 - 转换为数字格式并保留一位小数
  for (let i = 2; i <= rows.length + 1; i++) {
    const cell = worksheet.getCell(`D${i}`);
    const num = parseFloat(String(cell.value || '0').replace(/,/g, ''));
    if (!isNaN(num)) {
      cell.value = num;
      cell.numFmt = '0.0';
    }
  }

  // 在浏览器中使用 writeBuffer 然后创建 blob 下载
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
