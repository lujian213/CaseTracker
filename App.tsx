import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chart, ArcElement, PieController, Tooltip as ChartTooltip } from 'chart.js';
import { Case, TimeEntry, WorkType, AppData, BackupSettings, ExpenseEntry, AdminTab, SortField, SortOrder } from './types';
import { generateId, calculateDuration, downloadJson, formatDateTime, formatDate, formatFullTimestamp, downloadCsv, downloadXlsx, formatDurationDisplay, formatDateForExport, formatDateTimeForExport, minutesToRoundedHours, formatDateForBillExport, formatLiveDuration } from './utils';
import { Icons } from './constants';
import { CASE_COLORS, WORK_TYPE_COLORS, EXPENSE_TYPE_COLORS, getCaseColor } from './constants/colors';

// 导入组件
import PieChart from './components/PieChart';
import Tooltip from './components/Tooltip';
import EditableSelect from './components/EditableSelect';
import ConfirmDialog from './components/ConfirmDialog';
import Dashboard from './components/Dashboard';
import CaseManagement from './components/admin/CaseManagement';
import WorkTypeManagement from './components/admin/WorkTypeManagement';
import ExpenseManagement from './components/admin/ExpenseManagement';
import RecordManagement from './components/admin/RecordManagement';
import ReportGeneration from './components/admin/ReportGeneration';
import SystemManagement from './components/admin/SystemManagement';
import AdminOverlay from './components/admin/AdminOverlay';

Chart.register(ArcElement, PieController, ChartTooltip);

const LOCAL_STORAGE_KEY = 'chronos_case_tracker_data';
const DEFAULT_WORK_TYPES = Object.values(WorkType);

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

export default App;
