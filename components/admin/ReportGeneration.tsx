import React, { useState, useMemo } from 'react';
import { Case, TimeEntry, ExpenseEntry } from '../../types';
import { Icons } from '../../constants';
import { CASE_COLORS, WORK_TYPE_COLORS, EXPENSE_TYPE_COLORS, getCaseColor } from '../../constants/colors';
import { formatDate, formatDateForExport, formatDateForBillExport, formatDateTimeForExport, formatDateTime, formatDurationDisplay, formatFullTimestamp, minutesToRoundedHours, downloadCsv, downloadXlsx, formatLiveDuration, generateId } from '../../utils';
import Tooltip from '../Tooltip';
import PieChart from '../PieChart';

interface ReportGenerationProps {
  cases: Case[];
  entries: TimeEntry[];
  expenses: ExpenseEntry[];
  workTypes: string[];
  expenseTypes: string[];
}

const ReportGeneration: React.FC<ReportGenerationProps> = ({ cases, entries, expenses, workTypes, expenseTypes }) => {
  const [startDate, setStartDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()));
  const [endDate, setEndDate] = useState(formatDate(Date.now()));
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'time' | 'expense'>('time');

  const dateFiltered = useMemo(() => {
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const s = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0).getTime();
    const e = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999).getTime();
    return entries.filter(item => item.startTime >= s && item.startTime <= e).sort((a,b)=>b.startTime-a.startTime);
  }, [entries, startDate, endDate]);

  const expenseDateFiltered = useMemo(() => {
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const s = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0).getTime();
    const e = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999).getTime();
    return expenses.filter(item => item.date >= s && item.date <= e).sort((a,b) => b.date - a.date);
  }, [expenses, startDate, endDate]);

  const availableCases = useMemo(() => {
    const ids = new Set(dateFiltered.map(e => e.caseId));
    return cases.filter(c => ids.has(c.id));
  }, [dateFiltered, cases]);

  const expenseAvailableCases = useMemo(() => {
    const ids = new Set(expenseDateFiltered.map(e => e.caseId));
    return cases.filter(c => ids.has(c.id));
  }, [expenseDateFiltered, cases]);

  const filtered = useMemo(() => {
    if (selectedCaseIds.length === 0) return dateFiltered;
    return dateFiltered.filter(e => selectedCaseIds.includes(e.caseId));
  }, [dateFiltered, selectedCaseIds]);

  const expenseFiltered = useMemo(() => {
    if (selectedCaseIds.length === 0) return expenseDateFiltered;
    return expenseDateFiltered.filter(e => selectedCaseIds.includes(e.caseId));
  }, [expenseDateFiltered, selectedCaseIds]);

  const stats = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach(e => m.set(e.caseId, (m.get(e.caseId) || 0) + e.duration));
    const caseIndexMap = new Map<string, number>();
    let idx = 0;
    cases.forEach(c => caseIndexMap.set(c.id, idx++));
    return Array.from(m.entries()).map(([id, total], index) => ({ id, name: cases.find(c=>c.id===id)?.name || '未知', total, color: getCaseColor(caseIndexMap.get(id) ?? index) }));
  }, [filtered, cases]);

  const expenseStats = useMemo(() => {
    const m = new Map<string, number>();
    expenseFiltered.forEach(e => m.set(e.caseId, (m.get(e.caseId) || 0) + e.amount));
    const caseIndexMap = new Map<string, number>();
    let idx = 0;
    cases.forEach(c => caseIndexMap.set(c.id, idx++));
    return Array.from(m.entries()).map(([id, total], index) => ({ id, name: cases.find(c=>c.id===id)?.name || '未知', total, color: getCaseColor(caseIndexMap.get(id) ?? index) }));
  }, [expenseFiltered, cases]);

  const workTypeStats = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach(e => m.set(e.workType, (m.get(e.workType) || 0) + e.duration));
    return Array.from(m.entries()).map(([type, total], index) => ({ name: type, total, color: WORK_TYPE_COLORS[index % WORK_TYPE_COLORS.length] }));
  }, [filtered]);

  const expenseTypeStats = useMemo(() => {
    const m = new Map<string, number>();
    expenseFiltered.forEach(e => m.set(e.type, (m.get(e.type) || 0) + e.amount));
    return Array.from(m.entries()).map(([type, total], index) => ({ name: type, total, color: EXPENSE_TYPE_COLORS[index % EXPENSE_TYPE_COLORS.length] }));
  }, [expenseFiltered]);

  const prepareData = () => {
    const map = new Map<string, any>();
    filtered.forEach(e => {
      const caseName = cases.find(c => c.id === e.caseId)?.name || '未知';
      const dateKey = formatDateForExport(e.startTime);
      const mergedContent = `${e.workType} ${e.workContent}`.trim();
      const key = `${e.caseId}|${dateKey}|${mergedContent}|${e.notes}`;
      const timeRangeObj = { start: e.startTime, end: e.endTime };
      const timeRangeStr = `${formatDateTimeForExport(e.startTime)} - ${e.endTime ? formatDateTimeForExport(e.endTime) : ''}`;
      if (map.has(key)) {
        const o = map.get(key);
        if (e.endTime !== null) o.duration += e.duration;
        o.timeRanges.push(timeRangeObj);
      } else {
        map.set(key, {
          caseName,
          date: dateKey,
          workContent: mergedContent,
          notes: e.notes,
          duration: e.endTime !== null ? e.duration : 0,
          timeRanges: [timeRangeObj]
        });
      }
    });
    const separator = '\n';
    const mainRows = Array.from(map.values()).map((o:any) => {
      o.timeRanges.sort((a:any,b:any)=>a.start - b.start);
      const timeRangesText = o.timeRanges.map((tr:any) => `${formatDateTimeForExport(tr.start)} - ${tr.end ? formatDateTimeForExport(tr.end) : ''}`).join(separator);
      const roundedHours = minutesToRoundedHours(o.duration);
      const roundedHoursStr = roundedHours.toFixed(1);
      return [o.caseName, o.date, o.workContent, roundedHoursStr, timeRangesText, o.notes];
    });
    mainRows.sort((a,b) => {
      const caseCmp = String(a[0]).localeCompare(String(b[0]));
      if (caseCmp !== 0) return caseCmp;
      return String(a[1]).localeCompare(String(b[1]));
    });
    const caseSummary = new Map<string, number>();
    Array.from(map.values()).forEach((o:any) => {
      const rounded = minutesToRoundedHours(o.duration);
      caseSummary.set(o.caseName, (caseSummary.get(o.caseName) || 0) + rounded);
    });
    const summaryRows = Array.from(caseSummary.entries()).map(([caseName, hours]) => ([caseName, '', '', hours.toFixed(1), '', '总计']));
    return { mainRows, summaryRows };
  };

  const headers = ['案件名称', '日期', '工作内容', '时长(小时)', '起止时间', '注释'];

  const prepareExpenseData = () => {
    const mainRows = expenseFiltered.map(e => {
      const c = cases.find(i => i.id === e.caseId);
      return [c?.name || '未知案件', formatDate(e.date), e.type, e.amount, e.notes];
    });
    mainRows.sort((a, b) => {
      const caseCmp = String(a[0]).localeCompare(String(b[0]));
      if (caseCmp !== 0) return caseCmp;
      return String(a[1]).localeCompare(String(b[1]));
    });
    const caseSummary = new Map<string, number>();
    expenseFiltered.forEach(e => {
      const c = cases.find(i => i.id === e.caseId);
      const caseName = c?.name || '未知案件';
      caseSummary.set(caseName, (caseSummary.get(caseName) || 0) + e.amount);
    });
    const summaryRows = Array.from(caseSummary.entries()).map(([caseName, total]) => ([caseName, '总计', '', total, '']));
    return { mainRows, summaryRows };
  };

  const handleCsv = () => { const { mainRows, summaryRows } = prepareData(); downloadCsv(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.csv`); };
  const handleXlsx = async () => { const { mainRows, summaryRows } = prepareData(); await downloadXlsx(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.xlsx`, { bottomAlignColumns: [3] }); };

  const handleBillExport = async () => {
    const completedRecords = filtered.filter(item => item.endTime !== null);
    const groupedData = new Map<string, TimeEntry[]>();
    completedRecords.forEach(entry => {
      const caseName = cases.find(c => c.id === entry.caseId)?.name || '未知';
      const dateKey = formatDateForBillExport(entry.startTime);
      const groupKey = `${caseName}|${dateKey}`;
      if (!groupedData.has(groupKey)) groupedData.set(groupKey, []);
      groupedData.get(groupKey)?.push(entry);
    });
    const firstLevelMerged = new Map<string, TimeEntry[]>();
    groupedData.forEach((entries, groupKey) => {
      const processedEntries: TimeEntry[] = [];
      const groupedByKey = new Map<string, TimeEntry[]>();
      entries.forEach(entry => {
        const key = `${entry.workType}|${entry.workContent}|${entry.notes}`;
        if (!groupedByKey.has(key)) groupedByKey.set(key, []);
        groupedByKey.get(key)?.push(entry);
      });
      groupedByKey.forEach(subGroup => {
        if (subGroup.length === 1) {
          processedEntries.push(subGroup[0]);
        } else {
          const totalDuration = subGroup.reduce((sum, entry) => sum + entry.duration, 0);
          const mergedEntry: TimeEntry = { ...subGroup[0], duration: totalDuration, id: generateId('merged_') };
          processedEntries.push(mergedEntry);
        }
      });
      firstLevelMerged.set(groupKey, processedEntries);
    });
    const finalData: {caseName: string, timestamp: number, workContent: string, durationHours: number}[] = [];
    firstLevelMerged.forEach((entries, groupKey) => {
      const parts = groupKey.split('|');
      const caseName = parts[0];
      if (entries.length === 1) {
        const entry = entries[0];
        const caseName = cases.find(c => c.id === entry.caseId)?.name || '未知';
        const workContent = `${entry.workType} ${entry.workContent}`.trim();
        const durationHours = minutesToRoundedHours(entry.duration);
        finalData.push({ caseName, timestamp: entry.startTime, workContent, durationHours });
      } else {
        const firstEntry = entries[0];
        const workContentDetails = entries.map(entry => {
          const workContent = `${entry.workType} ${entry.workContent}`.trim();
          const durationHours = minutesToRoundedHours(entry.duration);
          return `${workContent}(${durationHours.toFixed(1)})`;
        }).join('; ');
        const totalHours = entries.reduce((sum, entry) => sum + minutesToRoundedHours(entry.duration), 0);
        finalData.push({ caseName, timestamp: firstEntry.startTime, workContent: workContentDetails, durationHours: totalHours });
      }
    });
    finalData.sort((a, b) => {
      const caseCmp = a.caseName.localeCompare(b.caseName);
      if (caseCmp !== 0) return caseCmp;
      return a.timestamp - b.timestamp;
    });
    const finalStringData: string[][] = finalData.map(item => [
      item.caseName,
      formatDateForBillExport(item.timestamp),
      item.workContent,
      item.durationHours.toFixed(1)
    ]);
    const caseTotals = new Map<string, number>();
    finalStringData.forEach(row => {
      const caseName = row[0];
      const duration = parseFloat(row[3]) || 0;
      caseTotals.set(caseName, (caseTotals.get(caseName) || 0) + duration);
    });
    const billHeaders = ['案件名称', '日期', '工作内容', '时长(小时)'];
    const summaryRows = Array.from(caseTotals.entries()).map(([caseName, totalHours]) => [caseName, '', '总计', totalHours.toFixed(1)]);
    await downloadXlsx(billHeaders, [...finalStringData, [], ...summaryRows], `Chronos_账单报表_${formatFullTimestamp(Date.now())}.xlsx`, { bottomAlignColumns: [3] });
  };

  const handleExpenseExport = async () => {
    const { mainRows, summaryRows } = prepareExpenseData();
    const formattedMainRows = mainRows.map(row => [String(row[0]), String(row[1]), String(row[2]), typeof row[3] === 'number' ? row[3].toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(row[3]), String(row[4])]);
    const formattedSummaryRows = summaryRows.map(row => [String(row[0]), String(row[1]), String(row[2]), typeof row[3] === 'number' ? row[3].toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(row[3]), String(row[4])]);
    const expenseHeaders = ['案件名称', '费用日期', '费用类型', '费用金额', '备注'];
    const allData = [expenseHeaders, ...formattedMainRows, [], ...formattedSummaryRows];
    await downloadXlsx([], allData, `Chronos_费用报表_${formatFullTimestamp(Date.now())}.xlsx`, { bottomAlignColumns: [3] });
  };

  return (
    <div className="space-y-2 flex flex-col h-full overflow-hidden">
      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-3 shrink-0 shadow-sm">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1"><label className="text-xs font-bold text-gray-400">起始日期</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          <div className="flex flex-col gap-1.5 flex-1"><label className="text-xs font-bold text-gray-400">截止日期</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100" /></div>
        </div>
        {(activeTab === 'time' ? availableCases : expenseAvailableCases).length > 0 && (
          <div className="pt-2 border-t border-gray-200 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400">筛选案件 (多选)</label>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setSelectedCaseIds(prev => prev.length === 0 ? ['__none__'] : [])} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCaseIds.length === 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}>全部案件</button>
              {(activeTab === 'time' ? availableCases : expenseAvailableCases).map((c) => {
                const isSelected = selectedCaseIds.length === 0 || (selectedCaseIds[0] !== '__none__' && selectedCaseIds.includes(c.id));
                const caseColor = getCaseColor(cases.findIndex(cs => cs.id === c.id));
                return <button key={c.id} onClick={() => setSelectedCaseIds(prev => {
                  const allIds = (activeTab === 'time' ? availableCases : expenseAvailableCases).map(cc => cc.id);
                  if (prev.length === 0) { const newSelected = allIds.filter(id => id !== c.id); return newSelected.length === 0 ? ['__none__'] : newSelected; }
                  else if (prev[0] === '__none__') { return allIds.length === 1 ? [c.id] : [c.id]; }
                  else if (prev.length === 1 && prev[0] === c.id) { return ['__none__']; }
                  else { return prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]; }
                })} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border" style={isSelected ? { backgroundColor: caseColor, borderColor: caseColor, color: 'white' } : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#4b5563' }}>{c.name}</button>;
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center border-b border-gray-200 pb-1">
        <div className="flex gap-0.5">
          <button onClick={() => setActiveTab('time')} className={`px-4 py-1 text-sm font-medium rounded-t-lg ${activeTab === 'time' ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>时间记录明细</button>
          <button onClick={() => setActiveTab('expense')} className={`px-4 py-1 text-sm font-medium rounded-t-lg ${activeTab === 'expense' ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>费用记录明细</button>
        </div>
        <div className="flex gap-1 shrink-0">
          {activeTab === 'time' && (<><button onClick={handleCsv} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors">导出 CSV</button><button onClick={handleXlsx} className="bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-800 shadow-sm transition-colors">导出 XLSX</button><button onClick={handleBillExport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">导出账单报表</button></>)}
          {activeTab === 'expense' && (<button onClick={handleExpenseExport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">导出费用报表</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 shrink-0">
        {activeTab === 'time' ? (
          <>
            <div className="bg-white rounded-xl shadow-sm"><PieChart data={stats.map((s, i) => ({ name: s.name, value: s.total, color: s.color || getCaseColor(i) }))} title="案件时间分布" formatter={(v) => formatDurationDisplay(v)} /></div>
            <div className="bg-white rounded-xl shadow-sm"><PieChart data={workTypeStats.map(s => ({ name: s.name, value: s.total, color: s.color }))} title="工作类型分布" formatter={(v) => formatDurationDisplay(v)} /></div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm"><PieChart data={expenseStats.map((s, i) => ({ name: s.name, value: s.total, color: s.color || getCaseColor(i) }))} title="案件费用分布" formatter={(v) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></div>
            <div className="bg-white rounded-xl shadow-sm"><PieChart data={expenseTypeStats.map(s => ({ name: s.name, value: s.total, color: s.color }))} title="费用类型分布" formatter={(v) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></div>
          </>
        )}
      </div>
      <div className="mt-1 border border-gray-100 rounded-xl bg-white flex-grow overflow-y-auto custom-scrollbar shadow-sm">
        {activeTab === 'time' && (
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-100 shadow-sm"><tr><th className="px-4 py-2 w-[30%]">案件</th><th className="px-4 py-2 w-[100px]">类型</th><th className="px-4 py-2 w-[130px]">时间范围</th><th className="px-4 py-2 w-[80px] text-right">时长</th><th className="px-4 py-2">工作内容</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => {
                const c = cases.find(i => i.id === e.caseId);
                const isActive = e.endTime === null;
                const currentLiveDuration = isActive ? formatLiveDuration(e.startTime) : '';
                const tooltipText = (c ? (c.description || c.name) : '未知') + (isActive ? ` [正在计时: ${currentLiveDuration}]` : '');
                return (
                  <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold min-w-0"><Tooltip text={tooltipText} className="w-full"><span className="cursor-help block truncate text-[12px] text-gray-700">{c?.name}</span></Tooltip></td>
                    <td className="px-4 py-3 truncate text-xs text-gray-500">{e.workType}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 font-mono leading-tight whitespace-nowrap">{formatDateTime(e.startTime)}<br/>{formatDateTime(e.endTime)}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 text-xs">{isActive ? (<Tooltip text={`正在自动计时: ${currentLiveDuration}`}><span className="flex items-center justify-end gap-1 cursor-help"><Icons.Clock className="animate-spin w-3 h-3 text-indigo-400" /><span className="tabular-nums">{currentLiveDuration}</span></span></Tooltip>) : (formatDurationDisplay(e.duration))}</td>
                    <td className="px-4 py-3 truncate text-gray-400 text-xs italic">{e.workContent || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {activeTab === 'expense' && (
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-100 shadow-sm"><tr><th className="px-4 py-2 w-[30%] text-left">案件名称</th><th className="px-4 py-2 w-[100px] text-left">费用日期</th><th className="px-4 py-2 w-[100px] text-left">费用类型</th><th className="px-4 py-2 w-[80px] text-right">费用金额</th><th className="px-4 py-2 text-left">备注</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {expenseFiltered.map(e => {
                const c = cases.find(i => i.id === e.caseId);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold min-w-0 text-left"><Tooltip text={c?.name || '未知案件'} className="w-full"><span className="cursor-help block truncate text-[12px] text-gray-700">{c?.name || '未知案件'}</span></Tooltip></td>
                    <td className="px-4 py-3 text-left text-[10px] text-gray-400 font-mono leading-tight">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 truncate text-xs text-gray-500 text-left">{e.type}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 text-xs">{e.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 truncate text-xs text-gray-500 text-left">{e.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportGeneration;