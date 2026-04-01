import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Case, TimeEntry, WorkType, AppData, BackupSettings, ExpenseEntry } from './types';
import { generateId, calculateDuration, downloadJson, formatDateTime, formatDate, formatFullTimestamp, downloadCsv, downloadXlsx, formatDurationDisplay, formatDateForExport, formatDateTimeForExport, minutesToRoundedHours, formatDateForBillExport } from './utils';
import { Icons } from './constants';

const LOCAL_STORAGE_KEY = 'chronos_case_tracker_data';
const DEFAULT_WORK_TYPES = Object.values(WorkType);

type AdminTab = 'cases' | 'worktypes' | 'records' | 'expenses' | 'reports' | 'system';

type SortField = 'case' | 'type' | 'time' | 'duration';
type SortOrder = 'asc' | 'desc';

const formatLiveDuration = (startTime: number): string => {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

/**
 * 优化版 Tooltip：
 * 1. 使用 fixed 定位彻底解决容器遮挡（overflow-hidden）问题。
 * 2. 限制最大高度并支持滚动，解决纵向占用过大问题。
 */
const Tooltip: React.FC<{ text: string; children: React.ReactNode; className?: string }> = ({ text, children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      // 如果上方空间不足 100px 且下方空间更大，则显示在下方
      setPosition(spaceAbove < 100 && spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center min-w-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="relative inline-block w-full min-w-0">
        {children}
        {isVisible && (
          <div
            className="fixed z-[2000] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: containerRef.current?.getBoundingClientRect().left! + (containerRef.current?.getBoundingClientRect().width! / 2),
              top: position === 'top'
                ? containerRef.current?.getBoundingClientRect().top! - 8
                : containerRef.current?.getBoundingClientRect().bottom! + 8,
              transform: position === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)'
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-sm shadow-2xl p-2 rounded-lg border border-gray-700 max-w-[220px] sm:max-w-xs">
              <div className="text-white text-[10px] leading-relaxed max-h-24 overflow-y-auto custom-scrollbar break-words text-center">
                {text}
              </div>
              <div
                className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent
                  ${position === 'top' ? 'top-full border-t-gray-900/95' : 'bottom-full border-b-gray-900/95'}
                `}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EditableSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setIsOpen(true)} placeholder={placeholder} className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none pr-8 transition-shadow" />
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const ConfirmDialog: React.FC<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmText?: string; isDestructive?: boolean; }> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "确认", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden border border-gray-100">
        <div className="p-5"><h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3><p className="text-gray-600 text-sm leading-relaxed">{message}</p></div>
        <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_EXPENSE_TYPES = ['交通费', '餐饮费', '住宿费', '通讯费', '办公费', '其他'];

const App: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>(DEFAULT_WORK_TYPES);
  const [expenseTypes, setExpenseTypes] = useState<string[]>(DEFAULT_EXPENSE_TYPES);
  const [activeExpenseForm, setActiveExpenseForm] = useState<{caseId: string} | null>(null);
  const [newExpense, setNewExpense] = useState<Omit<ExpenseEntry, 'id'>>({
    caseId: '',
    type: expenseTypes[0] || '其他',
    amount: 0,
    date: Date.now(),
    notes: ''
  });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({ interval: 0, lastBackupTime: Date.now() });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('cases');
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; isDestructive?: boolean; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [, setTick] = useState(0);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (isLoadedRef.current) return; // 防止 HMR 重复加载
    isLoadedRef.current = true;

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AppData = JSON.parse(stored);
        if (parsed.cases) setCases(parsed.cases);
        if (parsed.entries) setEntries(parsed.entries);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.workTypes) setWorkTypes(parsed.workTypes);
        if (parsed.expenseTypes) setExpenseTypes(parsed.expenseTypes);
        else setExpenseTypes(DEFAULT_EXPENSE_TYPES); // Set default if not in stored data
        if (parsed.backupSettings) setBackupSettings(parsed.backupSettings);
      } catch (e) { console.error("数据加载失败", e); }
    } else {
      // If no stored data, ensure defaults are set
      setExpenseTypes(DEFAULT_EXPENSE_TYPES);
    }
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return; // Don't save until data is loaded
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ cases, entries, expenses, workTypes, expenseTypes, backupSettings }));
  }, [cases, entries, expenses, workTypes, expenseTypes, backupSettings]);

  useEffect(() => {
    const activeEntry = entries.find(e => e.endTime === null);
    if (!activeEntry && backupSettings.interval === 0) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      if (backupSettings.interval > 0) {
        const now = Date.now();
        const nextBackup = backupSettings.lastBackupTime + (backupSettings.interval * 60 * 1000);
        if (now >= nextBackup) triggerAutoBackup();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [entries, backupSettings]);

  const triggerAutoBackup = useCallback(() => {
    const now = Date.now();
    setNotification("正在执行定时自动备份...");
    downloadJson({ cases, entries, expenses, workTypes, expenseTypes, timestamp: now }, `Chronos_自动备份_${formatFullTimestamp(now)}.json`);
    setBackupSettings(prev => ({ ...prev, lastBackupTime: now }));
    setTimeout(() => setNotification(null), 5000);
  }, [cases, entries, workTypes]);

  const stopAllTimers = useCallback((ts?: number) => {
    const timestamp = ts || Date.now();
    setEntries(prev => prev.map(entry => entry.endTime === null ? { ...entry, endTime: timestamp, duration: calculateDuration(entry.startTime, timestamp) } : entry));
  }, []);

  const startTimer = useCallback((caseId: string, workType: string, workContent: string, notes: string) => {
    const now = Date.now(); stopAllTimers(now);
    setEntries(prev => [...prev, { id: generateId('REC-'), caseId, workType, workContent, notes, startTime: now, endTime: null, duration: 0 }]);
  }, [stopAllTimers]);

  const addExpense = useCallback((caseId: string) => {
    const caseInfo = cases.find(c => c.id === caseId);
    if (!caseInfo) {
      alert("未找到指定案件");
      return;
    }

    const defaultExpense = {
      caseId,
      type: expenseTypes[0] || '其他',
      amount: 0,
      date: Date.now(),
      notes: ''
    };

    setNewExpense(defaultExpense);
    setActiveExpenseForm({ caseId });
  }, [cases, expenseTypes]);

  const saveExpense = useCallback(() => {
    if (newExpense.amount <= 0) {
      alert("费用金额必须大于0");
      return;
    }

    const expenseToAdd: ExpenseEntry = {
      id: generateId('EXP-'),
      ...newExpense
    };

    setExpenses(prev => [...prev, expenseToAdd]);
    setActiveExpenseForm(null);
  }, [newExpense]);

  const closeExpenseForm = useCallback(() => {
    setActiveExpenseForm(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-slate-800 font-sans relative">
      <ConfirmDialog {...confirmConfig} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} />
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-full duration-500 font-bold text-sm">
          <Icons.Clock className="animate-spin w-5 h-5" />
          {notification}
        </div>
      )}
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-3">
          <Icons.Logo className="w-10 h-10 shadow-lg rounded-xl" />
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span>Chronos</span>
            <span className="text-gray-400 text-sm font-light hidden sm:inline">时间记录器</span>
          </div>
        </h1>
        <button onClick={() => setIsAdminOpen(true)} className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium">
          <Icons.Settings className="w-5 h-5" /> 管理
        </button>
      </header>
      <main className="max-w-4xl mx-auto">
        <Dashboard cases={cases.filter(c => c.isOpen)} entries={entries} workTypes={workTypes} expenseTypes={expenseTypes} onStart={startTimer} onAddExpense={addExpense} onStop={() => stopAllTimers()} />
      </main>
      {isAdminOpen && <AdminOverlay tab={adminTab} setTab={setAdminTab} onClose={() => setIsAdminOpen(false)} cases={cases} setCases={setCases} entries={entries} setEntries={setEntries} expenses={expenses} setExpenses={setExpenses} workTypes={workTypes} setWorkTypes={setWorkTypes} expenseTypes={expenseTypes} setExpenseTypes={setExpenseTypes} backupSettings={backupSettings} setBackupSettings={setBackupSettings} showConfirm={(c:any) => setConfirmConfig({...c, isOpen:true})} />}

      {/* Expense Form Modal */}
      {activeExpenseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 p-6 relative">
            <h3 className="text-xl font-bold text-gray-800 mb-5">添加</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用日期</label>
                <input
                  type="date"
                  value={new Date(newExpense.date).toISOString().split('T')[0]}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: new Date(e.target.value).getTime() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用类型</label>
                <select
                  value={newExpense.type}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {expenseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用金额</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newExpense.amount || ''}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="输入金额"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">备注</label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="可选备注信息"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={closeExpenseForm}
                className="px-4 py-2 text-sm text-gray-500 font-bold"
              >
                取消
              </button>
              <button
                onClick={saveExpense}
                disabled={newExpense.amount <= 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<{ cases: Case[]; entries: TimeEntry[]; workTypes: string[]; expenseTypes: string[]; onStart: (id: string, type: string, content: string, notes: string) => void; onAddExpense: (caseId: string) => void; onStop: () => void; }> = ({ cases, entries, workTypes, expenseTypes, onStart, onAddExpense, onStop }) => {
  const activeEntry = entries.find(e => e.endTime === null);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 min-h-[320px]">
        <div className="p-1">
          {cases.length === 0 ? <div className="py-20 text-center text-gray-400"><p>目前没有打开的案件</p><p className="text-sm">点击右上角"管理"按钮创建新案件</p></div> :
            <div className="divide-y divide-gray-100">{cases.map(c => <CaseRow key={c.id} caseItem={c} workTypes={workTypes} expenseTypes={expenseTypes} onStart={onStart} onAddExpense={onAddExpense} activeEntry={activeEntry?.caseId === c.id ? activeEntry : null} />)}</div>}
        </div>
      </div>
      <div className="flex justify-center mt-8">
        <button onClick={onStop} className="bg-gray-800 hover:bg-black text-white px-10 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all font-bold active:scale-95 text-base">
          <Icons.Stop className="w-5 h-5" /> 休息 (停止计时)
        </button>
      </div>
    </div>
  );
};

const CaseRow: React.FC<{
  caseItem: Case;
  workTypes: string[];
  expenseTypes: string[];
  onStart: (id: string, type: string, content: string, notes: string) => void;
  onAddExpense: (caseId: string) => void;
  activeEntry: TimeEntry | null;
}> = ({ caseItem, workTypes, expenseTypes, onStart, onAddExpense, activeEntry }) => {
  const [workType, setWorkType] = useState<string>(workTypes[0] || '');
  const [workContent, setWorkContent] = useState('');
  const [notes, setNotes] = useState('');
  const prevDefaultRef = useRef(workTypes[0]);

  const isActive = activeEntry !== null;
  const liveDuration = isActive ? formatLiveDuration(activeEntry.startTime) : '';

  useEffect(() => {
    if (workTypes.length > 0 && !workTypes.includes(workType)) setWorkType(workTypes[0]);
    else if (workTypes.length > 0 && workType === prevDefaultRef.current && workTypes[0] !== prevDefaultRef.current) setWorkType(workTypes[0]);
    else if (workTypes.length > 0 && workType === '') setWorkType(workTypes[0]);
    prevDefaultRef.current = workTypes[0];
  }, [workTypes, workType]);

  const baseTitle = caseItem.description || caseItem.name;
  const tooltipText = isActive ? `${baseTitle} [计时中: ${liveDuration}]` : baseTitle;

  return (
    <div className={`p-4 transition-colors flex flex-col md:flex-row md:items-center gap-4 first:rounded-t-xl last:rounded-b-xl ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}>
      <div className="flex-grow group relative min-w-0 flex-1">
        <Tooltip text={tooltipText} className="w-full">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 cursor-help overflow-hidden">
            <span className="truncate flex-1 text-base">{caseItem.name}</span>
            <Icons.ChevronRight className="shrink-0 opacity-0 group-hover:opacity-30 w-4 h-4" />
          </h3>
        </Tooltip>
        <p className="text-xs text-gray-400 font-mono truncate tracking-tight">{caseItem.code}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <EditableSelect value={workType} onChange={setWorkType} options={workTypes} className="w-full md:w-36" placeholder="类型" />
        <input type="text" placeholder="工作内容" value={workContent} onChange={(e) => setWorkContent(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm md:w-32 focus:ring-2 focus:ring-indigo-100 outline-none" />
        <input type="text" placeholder="注释" value={notes} onChange={(e) => setNotes(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-grow md:w-40" />
        <Tooltip text={isActive ? `计时中: ${liveDuration}` : "开始计时"}>
          <button
            onClick={() => onStart(caseItem.id, workType, workContent, notes)}
            disabled={isActive}
            className={`flex items-center justify-center gap-2 px-2 py-2 rounded text-sm font-bold shadow transition-all min-w-[40px] ${isActive ? 'bg-white text-indigo-600 border border-indigo-200 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}`}
          >
            {isActive ? (
              <div className="flex items-center gap-2">
                <div className="flex h-2 w-2 relative">
                  <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></div>
                  <div className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></div>
                </div>
                <Icons.Clock className="animate-spin text-indigo-500 w-4 h-4" />
                <span className="font-mono tabular-nums tracking-tighter">{liveDuration}</span>
              </div>
            ) : (
              <Icons.Play className="w-4 h-4" />
            )}
          </button>
        </Tooltip>
        <Tooltip text="添加费用记录">
          <button
            onClick={() => onAddExpense(caseItem.id)}
            className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm font-bold shadow transition-all min-w-[60px] bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95"
          >
            <Icons.Plus className="w-4 h-4" /> 费用
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

const AdminOverlay: React.FC<{ tab: AdminTab; setTab: (t: AdminTab) => void; onClose: () => void; cases: Case[]; setCases: any; entries: TimeEntry[]; setEntries: any; expenses: ExpenseEntry[]; setExpenses: any; workTypes: string[]; setWorkTypes: any; expenseTypes: string[]; setExpenseTypes: any; backupSettings: BackupSettings; setBackupSettings: any; showConfirm: any; }> = ({ tab, setTab, onClose, cases, setCases, entries, setEntries, expenses, setExpenses, workTypes, setWorkTypes, expenseTypes, setExpenseTypes, backupSettings, setBackupSettings, showConfirm }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="border-b border-gray-100 flex justify-between items-center px-6 py-4 bg-gray-50 shrink-0"><h2 className="text-xl font-bold text-gray-800">管理后台</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-gray-100 bg-gray-50 flex flex-col p-4 gap-2 shrink-0">
          {[
            { id: 'cases', label: '案件管理' },
            { id: 'worktypes', label: '类型管理' },
            { id: 'records', label: '记录管理' },
            { id: 'expenses', label: '费用管理' },
            { id: 'reports', label: '统计报表' },
            { id: 'system', label: '备份与恢复' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as AdminTab)}
              className={`text-left px-4 py-2.5 rounded-lg transition-colors font-bold text-sm ${
                tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 p-6 bg-white overflow-hidden relative">
          {tab === 'cases' && <CaseManagement cases={cases} setCases={setCases} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'worktypes' && <WorkTypeManagement workTypes={workTypes} setWorkTypes={setWorkTypes} expenseTypes={expenseTypes} setExpenseTypes={setExpenseTypes} showConfirm={showConfirm} />}
          {tab === 'records' && <RecordManagement cases={cases} entries={entries} workTypes={workTypes} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'expenses' && <ExpenseManagement cases={cases} expenses={expenses} setExpenses={setExpenses} expenseTypes={expenseTypes} setExpenseTypes={setExpenseTypes} showConfirm={showConfirm} />}
          {tab === 'reports' && <ReportGeneration cases={cases} entries={entries} expenses={expenses} />}
          {tab === 'system' && <SystemManagement cases={cases} entries={entries} expenses={expenses} workTypes={workTypes} expenseTypes={expenseTypes} setCases={setCases} setEntries={setEntries} setExpenses={setExpenses} setWorkTypes={setWorkTypes} setExpenseTypes={setExpenseTypes} backupSettings={backupSettings} setBackupSettings={setBackupSettings} showConfirm={showConfirm} />}
        </div>
      </div>
    </div>
  </div>
);

const CaseManagement: React.FC<{ cases: Case[]; setCases: any; setEntries: any; showConfirm: any; }> = ({ cases, setCases, setEntries, showConfirm }) => {
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const saveCase = (c: Case) => { setCases((prev: Case[]) => prev.find(item => item.id === c.id) ? prev.map(item => item.id === c.id ? c : item) : [...prev, c]); setEditingCase(null); setIsAdding(false); };
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0"><h3 className="text-lg font-bold text-gray-800">案件列表</h3><button onClick={() => { setIsAdding(true); setEditingCase({ id: generateId('C-'), code: `CASE-${Math.floor(1000 + Math.random() * 9000)}`, name: '', description: '', isOpen: true }); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow text-sm font-bold"><Icons.Plus className="w-4 h-4" /> 创建新案件</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        {cases.map(c => (
          <div key={c.id} className="border border-gray-200 rounded-xl p-4 flex justify-between bg-gray-50/30 hover:border-indigo-200 transition-colors min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-500 shrink-0 uppercase">{c.code}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold ${c.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-300 text-gray-600'}`}>{c.isOpen ? '启用中' : '已关闭'}</span>
              </div>
              <Tooltip text={c.description || c.name} className="w-full">
                <h4 className="font-bold text-gray-700 cursor-help truncate text-sm">{c.name}</h4>
              </Tooltip>
            </div>
            <div className="flex gap-1 shrink-0 ml-2"><button onClick={() => setEditingCase(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Icons.Edit className="w-4 h-4" /></button><button onClick={() => showConfirm({ title: "删除案件", message: "确定要删除吗？该案件的所有计时记录也将被永久删除。", isDestructive: true, confirmText: "立即删除", onConfirm: () => { setCases((prev:Case[]) => prev.filter(item => item.id !== c.id)); setEntries((prev:any[]) => prev.filter(e => e.caseId !== c.id)); } })} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"><Icons.Trash className="w-4 h-4" /></button></div>
          </div>
        ))}
      </div>
      {(editingCase || isAdding) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130] p-4"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100"><h4 className="text-lg font-bold mb-5">{isAdding ? '创建案件' : '编辑案件'}</h4><div className="space-y-4"><div><label className="text-sm font-bold text-gray-400 mb-1 block">案件名称</label><input placeholder="输入名称" autoFocus value={editingCase?.name} onChange={(e) => setEditingCase(prev => prev ? {...prev, name: e.target.value} : null)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100" /></div><div><label className="text-sm font-bold text-gray-400 mb-1 block">详细描述</label><textarea placeholder="可选备注信息" value={editingCase?.description} onChange={(e) => setEditingCase(prev => prev ? {...prev, description: e.target.value} : null)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 outline-none focus:ring-2 focus:ring-indigo-100" /></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingCase?.isOpen} onChange={(e) => setEditingCase(prev => prev ? {...prev, isOpen: e.target.checked} : null)} className="rounded text-indigo-600" /><span className="text-sm text-gray-600">激活此案件（在首页显示）</span></label></div><div className="flex justify-end gap-3 mt-8 pt-4 border-t"><button onClick={() => { setEditingCase(null); setIsAdding(false); }} className="px-4 py-2 text-sm text-gray-500 font-bold">取消</button><button onClick={() => editingCase && saveCase(editingCase)} disabled={!editingCase?.name} className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50">保存</button></div></div></div>
      )}
    </div>
  );
};

const WorkTypeManagement: React.FC<{ workTypes: string[]; setWorkTypes: any; expenseTypes: string[]; setExpenseTypes: any; showConfirm: any; }> = ({ workTypes, setWorkTypes, expenseTypes, setExpenseTypes, showConfirm }) => {
  const [activeTab, setActiveTab] = useState<'worktypes' | 'expensetypes'>('worktypes');
  const [newWorkType, setNewWorkType] = useState('');
  const [newExpenseType, setNewExpenseType] = useState('');

  const moveWorkType = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workTypes.length) return;
    const updated = [...workTypes];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setWorkTypes(updated);
  };

  const moveExpenseType = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= expenseTypes.length) return;
    const updated = [...expenseTypes];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setExpenseTypes(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-6">类型管理</h3>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('worktypes')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'worktypes' ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          工作类型
        </button>
        <button
          onClick={() => setActiveTab('expensetypes')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'expensetypes' ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          费用类型
        </button>
      </div>

      {/* Work Types Tab */}
      {activeTab === 'worktypes' && (
        <div className="flex flex-col h-full">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="输入新工作类型名称..."
              value={newWorkType}
              onChange={(e) => setNewWorkType(e.target.value)}
              className="flex-grow border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => {
                if(newWorkType) setWorkTypes((prev: any) => [...prev, newWorkType]);
                setNewWorkType('');
              }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow hover:bg-indigo-700"
            >
              添加
            </button>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {workTypes.map((type, index) => (
              <div key={type + index} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-lg mb-2 group">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-mono w-4">{index + 1}.</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-sm">{type}</span>
                    {index === 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black border border-indigo-200">默认</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveWorkType(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Icons.ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveWorkType(index, 'down')}
                    disabled={index === workTypes.length - 1}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Icons.ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => showConfirm({
                      title: "删除类型",
                      message: `确定要删除工作类型 "${type}" 吗？`,
                      isDestructive: true,
                      onConfirm: () => setWorkTypes((prev: any) => prev.filter((_: any, i: any) => i !== index))
                    })}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors ml-1"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Types Tab */}
      {activeTab === 'expensetypes' && (
        <div className="flex flex-col h-full">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="输入新费用类型名称..."
              value={newExpenseType}
              onChange={(e) => setNewExpenseType(e.target.value)}
              className="flex-grow border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => {
                if(newExpenseType) setExpenseTypes((prev: any) => [...prev, newExpenseType]);
                setNewExpenseType('');
              }}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow hover:bg-indigo-700"
            >
              添加
            </button>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {expenseTypes.map((type, index) => (
              <div key={type + index} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-lg mb-2 group">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-mono w-4">{index + 1}.</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-sm">{type}</span>
                    {index === 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black border border-indigo-200">默认</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveExpenseType(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Icons.ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveExpenseType(index, 'down')}
                    disabled={index === expenseTypes.length - 1}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Icons.ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => showConfirm({
                      title: "删除类型",
                      message: `确定要删除费用类型 "${type}" 吗？`,
                      isDestructive: true,
                      onConfirm: () => setExpenseTypes((prev: any) => prev.filter((_: any, i: any) => i !== index))
                    })}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors ml-1"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ExpenseManagement: React.FC<{ cases: Case[]; expenses: ExpenseEntry[]; setExpenses: any; expenseTypes: string[]; setExpenseTypes: any; showConfirm: any; }> = ({ cases, expenses, setExpenses, expenseTypes, setExpenseTypes, showConfirm }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [batchSelection, setBatchSelection] = useState<string[]>([]);

  const [sortField, setSortField] = useState<'case' | 'date' | 'type' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const openCases = useMemo(() => cases.filter(c => c.isOpen), [cases]);

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(expense => !selectedCaseId || expense.caseId === selectedCaseId);

    // Sort the expenses
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'case') {
        const caseA = cases.find(c => c.id === a.caseId)?.name || '';
        const caseB = cases.find(c => c.id === b.caseId)?.name || '';
        comparison = caseA.localeCompare(caseB);
      } else if (sortField === 'date') {
        comparison = a.date - b.date;
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [expenses, selectedCaseId, sortField, sortOrder, cases]);

  const handleAddManual = () => {
    if (openCases.length === 0) {
      window.alert("请先创建并打开至少一个案件。");
      return;
    }

    const newExpense: ExpenseEntry = {
      id: generateId('EXP-'),
      caseId: selectedCaseId || openCases[0].id,
      type: expenseTypes[0] || '其他',
      amount: 0,
      date: Date.now(),
      notes: ''
    };

    setExpenses((prev: any) => [newExpense, ...prev]);
    setIsAddingExpense(true);
    setEditingExpense(newExpense);
  };

  const handleSaveExpense = (expense: ExpenseEntry) => {
    if (expense.amount <= 0) {
      alert("费用金额必须大于0");
      return;
    }
    if (isAddingExpense) {
      setExpenses((prev: ExpenseEntry[]) => prev.map(e => e.id === expense.id ? expense : e));
    } else {
      setExpenses((prev: ExpenseEntry[]) => prev.map(e => e.id === expense.id ? expense : e));
    }
    setEditingExpense(null);
    setIsAddingExpense(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex gap-2">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="border rounded px-3 py-1.5 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
          >
            <option value="">所有案件</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddManual}
            className="flex items-center gap-1 text-indigo-600 border-2 border-indigo-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-50"
          >
            <Icons.Plus className="w-4 h-4" /> 手动添加
          </button>
        </div>
        {batchSelection.length > 0 && (
          <button
            onClick={() => showConfirm({
              title:"批量删除确认",
              message:`确定要删除选中的 ${batchSelection.length} 条费用记录吗？此操作无法撤销。`,
              isDestructive:true,
              onConfirm:() => {
                setExpenses((prev: any) => prev.filter((e: any) => !batchSelection.includes(e.id)));
                setBatchSelection([]);
              }
            })}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-red-100 shadow-sm transition-colors"
          >
            删除选中
          </button>
        )}
      </div>

      <div className="flex-grow border border-gray-100 rounded-xl bg-white overflow-y-auto custom-scrollbar shadow-inner">
        <table className="w-full text-left table-fixed border-collapse">
          <thead className="bg-gray-50/90 backdrop-blur-sm text-gray-500 uppercase text-[11px] font-black sticky top-0 shadow-sm z-20">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  className="rounded"
                  onChange={e => setBatchSelection(
                    e.target.checked
                      ? filteredExpenses.map(i => i.id)
                      : []
                  )}
                  checked={
                    batchSelection.length > 0 &&
                    batchSelection.length === filteredExpenses.length &&
                    filteredExpenses.length > 0
                  }
                />
              </th>
              <th
                className="px-4 py-3 w-[25%] text-left cursor-pointer hover:text-indigo-600"
                onClick={() => { setSortField('case'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                归属案件 {sortField === 'case' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 w-[100px] text-left cursor-pointer hover:text-indigo-600"
                onClick={() => { setSortField('date'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                费用日期 {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 w-[100px] text-left cursor-pointer hover:text-indigo-600"
                onClick={() => { setSortField('type'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                费用类型 {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 w-[80px] text-right cursor-pointer hover:text-indigo-600"
                onClick={() => { setSortField('amount'); setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); }}
              >
                费用金额 {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 w-[100px] text-left">备注</th>
              <th className="px-4 py-3 w-[60px] text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredExpenses.map((expense) => {
              const caseInfo = cases.find(c => c.id === expense.caseId);
              return (
                <tr key={expense.id} className="group hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={batchSelection.includes(expense.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setBatchSelection([...batchSelection, expense.id]);
                        } else {
                          setBatchSelection(batchSelection.filter(id => id !== expense.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-left font-medium min-w-0">
                    <Tooltip text={caseInfo?.name || '未知案件'} className="w-full">
                      <span className="cursor-help block truncate text-xs text-gray-700">{caseInfo?.name || '未知案件'}</span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 text-left text-[10px] text-gray-400 font-mono leading-tight">{formatDate(expense.date)}</td>
                  <td className="px-4 py-3 text-left truncate text-[11px] text-gray-500">{expense.type}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600 text-xs">{expense.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-left min-w-0">
                    <Tooltip text={expense.notes || '无备注信息'} className="w-full">
                      <span className="cursor-help block truncate text-[11px] text-gray-500">
                        {expense.notes || ''}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="text-indigo-600 text-[11px] font-bold hover:underline"
                      >
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Editing Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 p-6">
            <h4 className="text-lg font-bold mb-4 text-gray-800">
              {isAddingExpense ? '添加费用记录' : '编辑费用记录'}
            </h4>
            <div className="space-y-4">
              {!isAddingExpense && (
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">归属案件</label>
                  <input
                    type="text"
                    value={cases.find(c => c.id === editingExpense.caseId)?.name || ''}
                    readOnly
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                  />
                </div>
              )}
              {isAddingExpense && selectedCaseId === '' && (
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">归属案件</label>
                  <select
                    value={editingExpense.caseId}
                    onChange={(e) => setEditingExpense({...editingExpense, caseId: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {openCases.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {isAddingExpense && selectedCaseId !== '' && (
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">归属案件</label>
                  <input
                    type="text"
                    value={cases.find(c => c.id === selectedCaseId)?.name || ''}
                    readOnly
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用日期</label>
                <input
                  type="date"
                  value={new Date(editingExpense.date).toISOString().split('T')[0]}
                  onChange={(e) => setEditingExpense({...editingExpense, date: new Date(e.target.value).getTime()})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用类型</label>
                <select
                  value={editingExpense.type}
                  onChange={(e) => setEditingExpense({...editingExpense, type: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {expenseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">费用金额</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingExpense.amount > 0 ? editingExpense.amount : ''}
                  onChange={(e) => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">备注</label>
                <textarea
                  value={editingExpense.notes}
                  onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="可选备注信息"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setEditingExpense(null); setIsAddingExpense(false); }}
                className="px-4 py-2 text-sm text-gray-500 font-bold"
              >
                取消
              </button>
              <button
                onClick={() => editingExpense && handleSaveExpense(editingExpense)}
                disabled={editingExpense.amount <= 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RecordManagement: React.FC<{ cases: Case[]; entries: TimeEntry[]; workTypes: string[]; setEntries: any; showConfirm: any; }> = ({ cases, entries, workTypes, setEntries, showConfirm }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [batchSelection, setBatchSelection] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const openCases = useMemo(() => cases.filter(c => c.isOpen), [cases]);
  const sortedEntries = useMemo(() => {
    let result = entries.filter(e => !selectedCaseId || e.caseId === selectedCaseId);
    result.sort((a, b) => {
      let c = 0;
      if(sortField === 'case') c = (cases.find(i=>i.id===a.caseId)?.name||'').localeCompare(cases.find(i=>i.id===b.caseId)?.name||'');
      else if(sortField === 'type') c = a.workType.localeCompare(b.workType);
      else if(sortField === 'time') c = a.startTime - b.startTime;
      else if(sortField === 'duration') c = a.duration - b.duration;
      return sortOrder === 'asc' ? c : -c;
    });
    return result;
  }, [entries, selectedCaseId, sortField, sortOrder, cases]);

  const handleAddManual = () => {
    if (openCases.length === 0) { window.alert("请先创建并打开至少一个案件。"); return; }

    // 优先使用用户已选择的案件，如果没有选择则使用第一个打开的案件
    const targetCaseId = selectedCaseId || openCases[0].id;

    const now = Date.now();
    const defaultDuration = 10;
    const startTime = now - (defaultDuration * 60 * 1000);
    const newEntry: TimeEntry = {
      id: generateId('REC-'),
      caseId: targetCaseId, // 使用已选择的案件ID
      workType: workTypes[0] || '会议',
      workContent: '',
      notes: '',
      startTime,
      endTime: now,
      duration: defaultDuration
    };
    setEntries((prev:any) => [newEntry, ...prev]);
    setIsNewRecord(true);
    setEditingEntry(newEntry);
  };

  const safeToISO = (ts: number | null) => { if (!ts) return ''; const d = new Date(ts); const pad = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex gap-2">
          <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="border rounded px-3 py-1.5 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-100 font-medium"><option value="">所有案件</option>{cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button onClick={handleAddManual} className="flex items-center gap-1 text-indigo-600 border-2 border-indigo-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-50"><Icons.Plus className="w-4 h-4" /> 手动添加</button>
        </div>
        {batchSelection.length > 0 && <button onClick={() => showConfirm({ title:"批量删除确认", message:`确定要删除选中的 ${batchSelection.length} 条记录吗？此操作无法撤销。`, isDestructive:true, onConfirm:()=> { setEntries((p:any)=>p.filter((e:any)=>!batchSelection.includes(e.id))); setBatchSelection([]); } })} className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-red-100 shadow-sm transition-colors">删除选中</button>}
      </div>
      <div className="flex-grow border border-gray-100 rounded-xl bg-white overflow-y-auto custom-scrollbar shadow-inner">
        <table className="w-full text-left table-fixed border-collapse">
          <thead className="bg-gray-50/90 backdrop-blur-sm text-gray-500 uppercase text-[11px] font-black sticky top-0 shadow-sm z-20">
            <tr>
              <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded" onChange={e => setBatchSelection(e.target.checked ? sortedEntries.filter(i=>i.endTime!==null).map(i=>i.id) : [])} checked={batchSelection.length > 0 && batchSelection.length === sortedEntries.filter(i=>i.endTime!==null).length} /></th>
              <th className="px-4 py-3 w-[35%] cursor-pointer hover:text-indigo-600" onClick={() => { setSortField('case'); setSortOrder(p=>p==='asc'?'desc':'asc'); }}>案件 {sortField === 'case' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 w-[90px]">工作类型</th>
              <th className="px-4 py-3 w-[130px] cursor-pointer hover:text-indigo-600" onClick={() => { setSortField('time'); setSortOrder(p=>p==='asc'?'desc':'asc'); }}>时间记录 {sortField === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 w-[70px] text-right">时长</th>
              <th className="px-4 py-3 w-[60px] text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedEntries.map(e => {
              const c = cases.find(i => i.id === e.caseId);
              const isActive = e.endTime === null;
              const currentLiveDuration = isActive ? formatLiveDuration(e.startTime) : '';
              const tooltipText = (c ? (c.description || c.name) : '未知') + (isActive ? ` [计时中: ${currentLiveDuration}]` : '');
              return (
                <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${isActive ? 'bg-indigo-50/20' : ''}`}>
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-gray-300" disabled={isActive} checked={batchSelection.includes(e.id)} onChange={()=>setBatchSelection(p=>p.includes(e.id)?p.filter(i=>i!==e.id):[...p,e.id])} /></td>
                  <td className="px-4 py-3 font-medium min-w-0">
                    <Tooltip text={tooltipText} className="w-full">
                      <span className="cursor-help block truncate text-xs text-gray-700">{c?.name}</span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3 truncate text-[11px] text-gray-500">{e.workType}</td>
                  <td className="px-4 py-3 text-[10px] text-gray-400 font-mono leading-tight whitespace-nowrap">{formatDateTime(e.startTime)}<br/>{formatDateTime(e.endTime)}</td>
                  <td className="px-4 py-3 font-bold text-indigo-600 text-right text-xs">
                    {isActive ? (
                      <Tooltip text={`正在自动计时: ${currentLiveDuration}`}>
                        <span className="flex items-center justify-end gap-1 cursor-help">
                          <Icons.Clock className="animate-spin w-3 h-3 text-indigo-400" />
                          <span className="tabular-nums">{currentLiveDuration}</span>
                        </span>
                      </Tooltip>
                    ) : (
                      formatDurationDisplay(e.duration)
                    )}
                  </td>
                  <td className="px-4 py-3 text-center"><button onClick={()=>{setIsNewRecord(false);setEditingEntry(e)}} className="text-indigo-600 text-[11px] font-bold hover:underline">编辑</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
            <h4 className="text-base font-bold text-gray-800 mb-6">
              {isNewRecord ? '手动添加记录' : '修改计时记录'}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">归属案件</label>
                <select
                  value={editingEntry.caseId}
                  disabled={
                    !isNewRecord || // 在编辑现有记录时禁用
                    (isNewRecord && !!selectedCaseId) // 在新建记录时，如果已选择了特定案件也禁用
                  }
                  onChange={e => setEditingEntry({...editingEntry, caseId: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded bg-gray-50 text-sm outline-none"
                >
                  {
                    // 如果是新记录且已选择了特定案件，则只显示该案件；否则显示所有可选项
                    (isNewRecord && selectedCaseId)
                      ? cases.filter(c => c.id === selectedCaseId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      : (isNewRecord ? openCases : cases).map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">工作类型</label>
                  <EditableSelect
                    value={editingEntry.workType}
                    onChange={v => setEditingEntry({...editingEntry, workType: v})}
                    options={workTypes}
                    placeholder="选择类型"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">统计时长 (分)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingEntry.duration}
                    onChange={e => {
                      const dur = parseInt(e.target.value) || 0;
                      if (editingEntry.endTime) {
                        const newStart = editingEntry.endTime - (dur * 60000);
                        setEditingEntry({...editingEntry, duration: dur, startTime: newStart});
                      } else {
                        setEditingEntry({...editingEntry, duration: dur});
                      }
                    }}
                    className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">工作内容</label>
                <input
                  placeholder="输入详情..."
                  value={editingEntry.workContent}
                  onChange={e => setEditingEntry({...editingEntry, workContent: e.target.value})}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">注释</label>
                <input
                  placeholder="输入备注信息..."
                  value={editingEntry.notes}
                  onChange={e => setEditingEntry({...editingEntry, notes: e.target.value})}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">起始时间</label>
                  <input
                    type="datetime-local"
                    readOnly={true}
                    value={safeToISO(editingEntry.startTime)}
                    className="w-full border border-gray-300 p-1.5 rounded text-[11px] bg-gray-50 text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-1 block">结束时间</label>
                  <input
                    type="datetime-local"
                    value={safeToISO(editingEntry.endTime)}
                    onChange={e => {
                      const ts = new Date(e.target.value).getTime();
                      if(ts) {
                        const newStart = ts - (editingEntry.duration * 60000);
                        setEditingEntry({...editingEntry, endTime: ts, startTime: newStart});
                      }
                    }}
                    className="w-full border border-gray-300 p-1.5 rounded text-[11px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 text-sm text-gray-400 font-bold font-medium transition-colors hover:text-gray-600"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setEntries((prev: any) => prev.map((i: any) => i.id === editingEntry.id ? editingEntry : i));
                  setEditingEntry(null);
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition-all"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportGeneration: React.FC<{ cases: Case[]; entries: TimeEntry[]; expenses: ExpenseEntry[]; }> = ({ cases, entries, expenses }) => {
  const [startDate, setStartDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()));
  const [endDate, setEndDate] = useState(formatDate(Date.now()));
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'time' | 'expense'>('time');

  const dateFiltered = useMemo(() => {
    const s = new Date(startDate).getTime(); const e = new Date(endDate).getTime() + 86400000;
    return entries.filter(item => item.startTime >= s && item.startTime <= e).sort((a,b)=>b.startTime-a.startTime);
  }, [entries, startDate, endDate]);

  const expenseDateFiltered = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime() + 86400000;
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

  useEffect(() => {
    // 更新useEffect逻辑以同时处理两个tab的筛选
    if (activeTab === 'time') {
      const availableIds = new Set(availableCases.map(c => c.id));
      setSelectedCaseIds(prev => prev.filter(id => availableIds.has(id)));
    } else {
      const availableIds = new Set(expenseAvailableCases.map(c => c.id));
      setSelectedCaseIds(prev => prev.filter(id => availableIds.has(id)));
    }
  }, [availableCases, expenseAvailableCases, activeTab]);

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
    return Array.from(m.entries()).map(([id, total]) => ({ id, name: cases.find(c=>c.id===id)?.name || '未知', total }));
  }, [filtered, cases]);

  const expenseStats = useMemo(() => {
    const m = new Map<string, number>();
    expenseFiltered.forEach(e => m.set(e.caseId, (m.get(e.caseId) || 0) + e.amount));
    return Array.from(m.entries()).map(([id, total]) => ({ id, name: cases.find(c=>c.id===id)?.name || '未知', total }));
  }, [expenseFiltered, cases]);

    const prepareData = () => {
    const map = new Map<string, any>();

    // 合并具有相同案件ID、日期、内容和注释的记录（按 startTime 的日期分组）
    filtered.forEach(e => {
      const caseName = cases.find(c => c.id === e.caseId)?.name || '未知';
      const dateKey = formatDateForExport(e.startTime);
      const mergedContent = `${e.workType} ${e.workContent}`.trim();
      const key = `${e.caseId}|${dateKey}|${mergedContent}|${e.notes}`;

      const timeRangeObj = { start: e.startTime, end: e.endTime };
      const timeRangeStr = `${formatDateTimeForExport(e.startTime)} - ${e.endTime ? formatDateTimeForExport(e.endTime) : ''}`;

      if (map.has(key)) {
        const o = map.get(key);
        // accumulate duration only for completed intervals
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

    // For each group, sort time ranges by start time, build time range strings joined by \n, and convert minutes to rounded hours
    const separator = '\n';
    const mainRows = Array.from(map.values()).map((o:any) => {
      o.timeRanges.sort((a:any,b:any)=>a.start - b.start);
      const timeRangesText = o.timeRanges.map((tr:any) => `${formatDateTimeForExport(tr.start)} - ${tr.end ? formatDateTimeForExport(tr.end) : ''}`).join(separator);
      const roundedHours = minutesToRoundedHours(o.duration);
      // Ensure one decimal place
      const roundedHoursStr = roundedHours.toFixed(1);

      return [
        o.caseName,
        o.date,
        o.workContent,
        roundedHoursStr,
        timeRangesText,
        o.notes
      ];
    });

    // sort by caseName asc then date asc
    mainRows.sort((a,b) => {
      const caseCmp = String(a[0]).localeCompare(String(b[0]));
      if (caseCmp !== 0) return caseCmp;
      return String(a[1]).localeCompare(String(b[1]));
    });

    // Build per-case summary by summing each group's rounded hours
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
      // 准备费用报表的明细数据
      const mainRows = expenseFiltered.map(e => {
        const c = cases.find(i => i.id === e.caseId);
        return [
          c?.name || '未知案件',
          formatDate(e.date),
          e.type,
          e.amount, // 保留数值格式用于后续处理
          e.notes
        ];
      });

      // 按案件名称和日期排序
      mainRows.sort((a, b) => {
        const caseCmp = String(a[0]).localeCompare(String(b[0]));
        if (caseCmp !== 0) return caseCmp;
        return String(a[1]).localeCompare(String(b[1]));
      });

      // 创建每案件汇总
      const caseSummary = new Map<string, number>();
      expenseFiltered.forEach(e => {
        const c = cases.find(i => i.id === e.caseId);
        const caseName = c?.name || '未知案件';
        caseSummary.set(caseName, (caseSummary.get(caseName) || 0) + e.amount);
      });

      const summaryRows = Array.from(caseSummary.entries()).map(([caseName, total]) => ([
        caseName,
        '总计',
        '',
        total,
        ''
      ]));

      return { mainRows, summaryRows };
    };

    const handleCsv = () => { const { mainRows, summaryRows } = prepareData(); downloadCsv(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.csv`); };
    const handleXlsx = async () => { const { mainRows, summaryRows } = prepareData(); await downloadXlsx(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.xlsx`); };

    // 新增：导出账单报表功能
    const handleBillExport = async () => {
      // 过滤掉没有截止时间的记录
      const completedRecords = filtered.filter(item => item.endTime !== null);

      // 按案件名称和日期分组（使用格式化后的日期进行分组，而不是原始时间戳）
      const groupedData = new Map<string, TimeEntry[]>();

      completedRecords.forEach(entry => {
        const caseName = cases.find(c => c.id === entry.caseId)?.name || '未知';
        const dateKey = formatDateForBillExport(entry.startTime); // 使用日期格式进行分组
        const groupKey = `${caseName}|${dateKey}`;

        if (!groupedData.has(groupKey)) {
          groupedData.set(groupKey, []);
        }
        groupedData.get(groupKey)?.push(entry);
      });

      // 第一步合并：对于每个分组里工作内容和注释完全相同的记录进行合并
      const firstLevelMerged = new Map<string, TimeEntry[]>();

      groupedData.forEach((entries, groupKey) => {
        const processedEntries: TimeEntry[] = [];
        const groupedByKey = new Map<string, TimeEntry[]>();

        // 按照工作内容和注释进行分组
        entries.forEach(entry => {
          const key = `${entry.workType}|${entry.workContent}|${entry.notes}`;
          if (!groupedByKey.has(key)) {
            groupedByKey.set(key, []);
          }
          groupedByKey.get(key)?.push(entry);
        });

        // 对于相同工作内容和注释的记录进行合并
        groupedByKey.forEach(subGroup => {
          if (subGroup.length === 1) {
            processedEntries.push(subGroup[0]);
          } else {
            // 合并时长相加（使用分钟级的时长）
            const totalDuration = subGroup.reduce((sum, entry) => sum + entry.duration, 0);

            // 创建合并后的记录（使用第一条记录的信息，更新时长）
            const mergedEntry: TimeEntry = {
              ...subGroup[0],
              duration: totalDuration,
              id: generateId('merged_')
            };
            processedEntries.push(mergedEntry);
          }
        });

        firstLevelMerged.set(groupKey, processedEntries);
      });

      // 第二步合并：将每个分组里的记录合并成一条记录
      const finalData: {caseName: string, timestamp: number, workContent: string, durationHours: number}[] = [];

      firstLevelMerged.forEach((entries, groupKey) => {
        // 从groupKey中提取案件名称和日期
        const parts = groupKey.split('|');
        const caseName = parts[0]; // 案件名称
        const dateStr = parts[1]; // 日期字符串

        if (entries.length === 1) {
          // 如果只有一个记录，直接使用
          const entry = entries[0];
          const caseName = cases.find(c => c.id === entry.caseId)?.name || '未知';
          const workContent = `${entry.workType} ${entry.workContent}`.trim();
          const durationHours = minutesToRoundedHours(entry.duration); // 最终显示时才转换为小时

          finalData.push({
            caseName,
            timestamp: entry.startTime, // 使用原始时间戳进行排序
            workContent,
            durationHours
          });
        } else {
          // 多个记录合并成一条
          const firstEntry = entries[0];
          const caseName = cases.find(c => c.id === firstEntry.caseId)?.name || '未知';

          // 合并工作内容："{工作内容}({时长})"，这里应该用转换后的小时值
          const workContentDetails = entries.map(entry => {
            const workContent = `${entry.workType} ${entry.workContent}`.trim();
            const durationHours = minutesToRoundedHours(entry.duration); // 先转换为小时
            return `${workContent}(${durationHours.toFixed(1)})`;
          }).join('; ');

          // 第二次合并时长：应该使用第一次合并后转换成小时的时长来合并（向上取整后的小时相加）
          const totalHours = entries.reduce((sum, entry) => {
            const roundedHours = minutesToRoundedHours(entry.duration);
            return sum + roundedHours;
          }, 0);

          finalData.push({
            caseName,
            timestamp: firstEntry.startTime, // 使用原始时间戳进行排序
            workContent: workContentDetails,
            durationHours: totalHours
          });
        }
      });

      // 排序：案件名称+日期升序，使用原始时间戳进行日期排序
      finalData.sort((a, b) => {
        const caseCmp = a.caseName.localeCompare(b.caseName);
        if (caseCmp !== 0) return caseCmp;
        return a.timestamp - b.timestamp; // 使用原始时间戳排序，确保是日期类型的排序
      });

      // 转换为字符串数组用于导出，并应用日期格式化
      const finalStringData: string[][] = finalData.map(item => [
        item.caseName,
        formatDateForBillExport(item.timestamp), // 在最后一步格式化日期
        item.workContent,
        item.durationHours.toFixed(1)
      ]);

      // 统计每案的总时长
      const caseTotals = new Map<string, number>();
      finalStringData.forEach(row => {
        const caseName = row[0];
        const duration = parseFloat(row[3]) || 0;
        caseTotals.set(caseName, (caseTotals.get(caseName) || 0) + duration);
      });

      // 准备表头和数据
      const billHeaders = ['案件名称', '日期', '工作内容', '时长(小时)'];
      const summaryRows = Array.from(caseTotals.entries()).map(([caseName, totalHours]) => [
        caseName,
        '',
        '总计',
        totalHours.toFixed(1)
      ]);

      // 导出Excel文件
      await downloadXlsx(
        billHeaders,
        [...finalStringData, [], ...summaryRows],
        `Chronos_账单报表_${formatFullTimestamp(Date.now())}.xlsx`
      );
    };

    const handleExpenseExport = async () => {
      const { mainRows, summaryRows } = prepareExpenseData();

      // 格式化金额数据为千分位字符串，并将所有数据转为字符串
      const formattedMainRows = mainRows.map(row => [
        String(row[0]), // 案件名称
        String(row[1]), // 费用日期
        String(row[2]), // 费用类型
        typeof row[3] === 'number' ? row[3].toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(row[3]), // 费用金额（无单位）
        String(row[4])  // 备注
      ]);

      const formattedSummaryRows = summaryRows.map(row => [
        String(row[0]), // 案件名称
        String(row[1]), // 总计
        String(row[2]), // 空
        typeof row[3] === 'number' ? row[3].toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(row[3]), // 费用总计（无单位）
        String(row[4])  // 空
      ]);

      const expenseHeaders = ['案件名称', '费用日期', '费用类型', '费用金额', '备注'];

      // 将数据组合成单一数组，中间插入空行
      const allData = [
        expenseHeaders,
        ...formattedMainRows,
        [], // 空行分隔明细和汇总
        ...formattedSummaryRows
      ];

      await downloadXlsx(
        [],
        allData,
        `Chronos_费用报表_${formatFullTimestamp(Date.now())}.xlsx`
      );
    };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-4 shrink-0 shadow-sm">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1"><label className="text-sm font-bold text-gray-400">起始日期</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100" /></div>
          <div className="flex flex-col gap-1.5 flex-1"><label className="text-sm font-bold text-gray-400">截止日期</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100" /></div>
        </div>

        {(activeTab === 'time' ? availableCases : expenseAvailableCases).length > 0 && (
          <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-400">筛选案件 (多选)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCaseIds([])}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCaseIds.length === 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              >
                全部案件
              </button>
              {(activeTab === 'time' ? availableCases : expenseAvailableCases).map(c => {
                const isSelected = selectedCaseIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCaseIds(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('time')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'time'
                ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            时间记录明细
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'expense'
                ? 'bg-white text-indigo-700 border-t border-l border-r border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            费用记录明细
          </button>
        </div>
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-gray-800">
            {activeTab === 'time' ? '时间记录明细' : '费用记录明细'}
          </h3>
          <div className="flex gap-2">
            {activeTab === 'time' && (
              <>
                <button onClick={handleCsv} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors">导出 CSV</button>
                <button onClick={handleXlsx} className="bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-800 shadow-sm transition-colors">导出 XLSX</button>
                <button onClick={handleBillExport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">导出账单报表</button>
              </>
            )}
            {activeTab === 'expense' && (
              <button onClick={handleExpenseExport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">导出费用报表</button>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 overflow-x-auto pb-1 custom-scrollbar">
        {(activeTab === 'time' ? stats : expenseStats).map(s => {
          const c = cases.find(item => item.id === s.id);
          const activeEntryForCase = activeTab === 'time' ? entries.find(e => e.caseId === s.id && e.endTime === null) : null;
          const liveDurationText = activeEntryForCase ? formatLiveDuration(activeEntryForCase.startTime) : '';
          const tooltipText = (c?.description || c?.name || '未知') + (activeEntryForCase ? ` [计时中: ${liveDurationText}]` : '');
          return (
            <Tooltip key={s.id} text={tooltipText}>
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 h-full cursor-help min-w-0 transition-all hover:bg-indigo-100 shadow-sm min-w-[120px]">
                <p className="text-[10px] text-indigo-400 font-bold truncate tracking-tight mb-1">{s.name}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-lg font-black text-indigo-700 tabular-nums">
                    {activeTab === 'time'
                      ? formatDurationDisplay(s.total)
                      : s.total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {activeEntryForCase && <span className="text-[9px] text-red-500 animate-pulse font-black px-1.5 py-0.5 bg-white rounded-full border border-red-100">+计</span>}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>
      <div className="border border-gray-100 rounded-xl bg-white flex-grow overflow-y-auto custom-scrollbar shadow-sm">
        {activeTab === 'time' && (
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-100 shadow-sm">
              <tr>
                <th className="px-4 py-3 w-[30%]">案件</th>
                <th className="px-4 py-3 w-[100px]">类型</th>
                <th className="px-4 py-3 w-[130px]">时间范围</th>
                <th className="px-4 py-3 w-[80px] text-right">时长</th>
                <th className="px-4 py-3">工作内容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => {
                const c = cases.find(i => i.id === e.caseId);
                const isActive = e.endTime === null;
                const currentLiveDuration = isActive ? formatLiveDuration(e.startTime) : '';
                const tooltipText = (c ? (c.description || c.name) : '未知') + (isActive ? ` [正在计时: ${currentLiveDuration}]` : '');
                return (
                  <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold min-w-0">
                      <Tooltip text={tooltipText} className="w-full">
                        <span className="cursor-help block truncate text-[12px] text-gray-700">{c?.name}</span>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 truncate text-xs text-gray-500">{e.workType}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-400 font-mono leading-tight whitespace-nowrap">{formatDateTime(e.startTime)}<br/>{formatDateTime(e.endTime)}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 text-xs">
                      {isActive ? (
                        <Tooltip text={`正在自动计时: ${currentLiveDuration}`}>
                          <span className="flex items-center justify-end gap-1 cursor-help">
                            <Icons.Clock className="animate-spin w-3 h-3 text-indigo-400" />
                            <span className="tabular-nums">{currentLiveDuration}</span>
                          </span>
                        </Tooltip>
                      ) : (
                        formatDurationDisplay(e.duration)
                      )}
                    </td>
                    <td className="px-4 py-3 truncate text-gray-400 text-xs italic">{e.workContent || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === 'expense' && (
          <table className="w-full text-left table-fixed border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-100 shadow-sm">
              <tr>
                <th className="px-4 py-3 w-[30%] text-left">案件名称</th>
                <th className="px-4 py-3 w-[100px] text-left">费用日期</th>
                <th className="px-4 py-3 w-[100px] text-left">费用类型</th>
                <th className="px-4 py-3 w-[80px] text-right">费用金额</th>
                <th className="px-4 py-3 text-left">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenseFiltered.map(e => {
                const c = cases.find(i => i.id === e.caseId);
                return (
                  <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold min-w-0 text-left">
                      <Tooltip text={c?.name || '未知案件'} className="w-full">
                        <span className="cursor-help block truncate text-[12px] text-gray-700">{c?.name || '未知案件'}</span>
                      </Tooltip>
                    </td>
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

const SystemManagement: React.FC<{ cases: Case[]; entries: TimeEntry[]; expenses: ExpenseEntry[]; workTypes: string[]; expenseTypes: string[]; setCases: any; setEntries: any; setExpenses: any; setWorkTypes: any; setExpenseTypes: any; backupSettings: BackupSettings; setBackupSettings: any; showConfirm: any; }> = ({ cases, entries, expenses, workTypes, expenseTypes, setCases, setEntries, setExpenses, setWorkTypes, setExpenseTypes, backupSettings, setBackupSettings, showConfirm }) => {
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text(); const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.cases)) { showConfirm({ title: "恢复数据确认", message: "导入备份将永久覆盖您当前浏览器中的所有计时记录和设置。此操作不可撤销，是否继续？", isDestructive: true, confirmText: "开始恢复", onConfirm: () => { setCases(parsed.cases); setEntries(parsed.entries); setExpenses(parsed.expenses); if(parsed.workTypes) setWorkTypes(parsed.workTypes); if(parsed.expenseTypes) setExpenseTypes(parsed.expenseTypes); } }); }
    } catch (err) { window.alert("读取失败：请上传有效的 .json 备份文件。"); } finally { e.target.value = ''; }
  };

  const intervals = [
    { label: '禁用', value: 0 },
    { label: '15分', value: 15 },
    { label: '30分', value: 30 },
    { label: '1小时', value: 60 },
    { label: '4小时', value: 240 },
    { label: '12小时', value: 720 },
    { label: '每天', value: 1440 },
  ];

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4"><Icons.Clock style={{ width: '140px', height: '140px' }} /></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h4 className="text-lg font-bold text-indigo-900 flex items-center gap-2 tracking-tight"><Icons.Clock className="text-indigo-600 w-6 h-6" /> 自动定时备份系统</h4>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm border ${backupSettings.interval > 0 ? 'bg-green-500 text-white border-green-400 animate-pulse' : 'bg-white text-gray-300 border-gray-100'}`}>
            {backupSettings.interval > 0 ? '运行中' : '已暂停'}
          </span>
        </div>
        <div className="space-y-5 relative z-10">
          <p className="text-sm text-indigo-700/70 leading-relaxed font-medium">应用将在设定的时间间隔自动将您的工作数据（案件、工时、配置）下载为本地 JSON 备份文件。建议开启以防止由于浏览器缓存清理导致的意外数据丢失。</p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {intervals.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBackupSettings({ ...backupSettings, interval: opt.value })}
                className={`px-1 py-2 rounded-lg text-xs font-bold transition-all border ${backupSettings.interval === opt.value ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {backupSettings.interval > 0 && (
            <div className="bg-white/50 rounded-lg p-3 border border-indigo-100/50">
              <p className="text-xs text-indigo-400 font-mono italic text-center leading-normal">
                上次备份成功: {formatDateTime(backupSettings.lastBackupTime)}<br/>
                预计下次备份: {formatDateTime(backupSettings.lastBackupTime + backupSettings.interval * 60 * 1000)}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-gray-400"><Icons.ArrowDown className="w-6 h-6" /></div>
          <h4 className="font-bold text-gray-700 mb-2 text-base">手动导出备份</h4>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">即刻导出一份包含当前所有数据的 JSON 格式文件至您的下载目录。</p>
          <button onClick={() => downloadJson({ cases, entries, expenses, workTypes, expenseTypes, timestamp: Date.now() }, `Chronos_手动备份_${formatFullTimestamp(Date.now())}.json`)} className="w-full bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all active:scale-95">下载 JSON 备份</button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors text-gray-400"><Icons.ArrowUp className="w-6 h-6" /></div>
          <h4 className="font-bold text-gray-700 mb-2 text-base">恢复历史数据</h4>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">从本地存储的 JSON 备份文件中恢复案件状态和历史计时记录。</p>
          <label className="w-full bg-gray-100 border-2 border-dashed border-gray-200 text-gray-500 px-6 py-2 rounded-xl cursor-pointer hover:bg-gray-200 hover:border-gray-400 inline-block font-bold text-sm transition-all active:scale-95">浏览本地文件<input type="file" accept=".json" onChange={handleRestore} className="hidden" /></label>
        </div>
      </div>
    </div>
  );
};

export default App;
