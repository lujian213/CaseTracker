import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Case, TimeEntry, WorkType, AppData } from './types';
import { generateId, calculateDuration, downloadJson, formatDateTime, formatDate, downloadCsv } from './utils';
import { Icons } from './constants';

const LOCAL_STORAGE_KEY = 'chronos_case_tracker_data';

// --- 自定义确认对话框组件 ---
const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "确认", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600 text-xs leading-relaxed">{message}</p>
        </div>
        <div className="bg-gray-50 px-5 py-3 flex justify-end gap-2 border-t border-gray-100">
          <button 
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }}
            className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all active:scale-95 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'cases' | 'records' | 'reports' | 'system'>('cases');

  // 确认对话框全局状态
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (config: Omit<typeof confirmConfig, 'isOpen'>) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  // Load Data
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AppData = JSON.parse(stored);
        if (parsed.cases) setCases(parsed.cases);
        if (parsed.entries) setEntries(parsed.entries);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save Data
  useEffect(() => {
    const data: AppData = { cases, entries };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }, [cases, entries]);

  const stopAllTimers = useCallback((timestampArg?: any) => {
    const timestamp = (typeof timestampArg === 'number') ? timestampArg : Date.now();
    setEntries(prev => prev.map(entry => {
      if (entry.endTime === null) {
        return { 
          ...entry, 
          endTime: timestamp, 
          duration: calculateDuration(entry.startTime, timestamp) 
        };
      }
      return entry;
    }));
  }, []);

  const startTimer = useCallback((caseId: string, workType: WorkType, notes: string) => {
    const now = Date.now();
    stopAllTimers(now);
    const newEntry: TimeEntry = {
      id: generateId('REC-'),
      caseId,
      workType,
      notes,
      startTime: now,
      endTime: null,
      duration: 0
    };
    setEntries(prev => [...prev, newEntry]);
  }, [stopAllTimers]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-slate-800 font-sans">
      <ConfirmDialog 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />

      <header className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <span className="bg-indigo-700 text-white p-1 rounded shadow-lg">Chronos</span>
          <span className="text-gray-600 font-light">时间记录器</span>
        </h1>
        <button 
          onClick={() => setIsAdminOpen(true)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Icons.Settings />
          <span className="font-medium">管理</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <Dashboard 
          cases={cases.filter(c => c.isOpen)} 
          entries={entries}
          onStart={startTimer}
          onStop={() => stopAllTimers()}
        />
      </main>

      {isAdminOpen && (
        <AdminOverlay 
          tab={adminTab}
          setTab={setAdminTab}
          onClose={() => setIsAdminOpen(false)}
          cases={cases}
          setCases={setCases}
          entries={entries}
          setEntries={setEntries}
          showConfirm={showConfirm}
        />
      )}
    </div>
  );
};

const Dashboard: React.FC<{
  cases: Case[];
  entries: TimeEntry[];
  onStart: (id: string, type: WorkType, notes: string) => void;
  onStop: () => void;
}> = ({ cases, entries, onStart, onStop }) => {
  const activeEntry = entries.find(e => e.endTime === null);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-1">
          {cases.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p>目前没有打开的案件</p>
              <p className="text-sm">点击右上角“管理”按钮创建新案件</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cases.map(c => (
                <CaseRow 
                  key={c.id} 
                  caseItem={c} 
                  onStart={onStart} 
                  onStop={onStop}
                  isActive={activeEntry?.caseId === c.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center mt-8">
        <button 
          onClick={onStop}
          className="bg-gray-800 hover:bg-black text-white px-10 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all font-bold tracking-wide active:scale-95"
        >
          <Icons.Stop /> 休息 (停止计时)
        </button>
      </div>
    </div>
  );
};

const CaseRow: React.FC<{
  caseItem: Case;
  onStart: (id: string, type: WorkType, notes: string) => void;
  onStop: () => void;
  isActive: boolean;
}> = ({ caseItem, onStart, onStop, isActive }) => {
  const [workType, setWorkType] = useState<WorkType>(WorkType.Meeting);
  const [notes, setNotes] = useState('');
  return (
    <div className={`p-4 transition-colors flex flex-col md:flex-row md:items-center gap-4 ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}>
      <div className="flex-grow">
        <h3 className="font-semibold text-gray-800">{caseItem.name}</h3>
        <p className="text-xs text-gray-500 font-mono">{caseItem.code}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select 
          value={workType}
          onChange={(e) => setWorkType(e.target.value as WorkType)}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          {Object.values(WorkType).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input 
          type="text" 
          placeholder="注释 (可选)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm flex-grow md:w-48 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        {isActive ? (
          <button onClick={onStop} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow transition-colors">
            <Icons.Stop /> 停止计时
          </button>
        ) : (
          <button onClick={() => onStart(caseItem.id, workType, notes)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold shadow transition-colors">
            <Icons.Play /> 开始计时
          </button>
        )}
      </div>
    </div>
  );
};

const AdminOverlay: React.FC<{
  tab: string;
  setTab: (t: any) => void;
  onClose: () => void;
  cases: Case[];
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  entries: TimeEntry[];
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  showConfirm: (config: any) => void;
}> = ({ tab, setTab, onClose, cases, setCases, entries, setEntries, showConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="border-b border-gray-100 flex justify-between items-center px-6 py-4 bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">管理后台</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-gray-100 bg-gray-50 flex flex-col p-4 gap-2 shrink-0">
            {[
              { id: 'cases', label: '案件管理' },
              { id: 'records', label: '记录管理' },
              { id: 'reports', label: '统计报表' },
              { id: 'system', label: '系统备份' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`text-left px-4 py-2.5 rounded-lg transition-colors font-medium ${tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6 bg-white overflow-hidden">
            {tab === 'cases' && <CaseManagement cases={cases} setCases={setCases} showConfirm={showConfirm} />}
            {tab === 'records' && <RecordManagement cases={cases} entries={entries} setEntries={setEntries} showConfirm={showConfirm} />}
            {tab === 'reports' && <ReportGeneration cases={cases} entries={entries} />}
            {tab === 'system' && <SystemManagement cases={cases} entries={entries} setCases={setCases} setEntries={setEntries} showConfirm={showConfirm} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const CaseManagement: React.FC<{
  cases: Case[];
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  showConfirm: (config: any) => void;
}> = ({ cases, setCases, showConfirm }) => {
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = (id: string) => {
    showConfirm({
      title: "删除案件",
      message: "确定要删除此案件吗？相关的计时记录将保留，但不再与该案件关联。",
      isDestructive: true,
      confirmText: "确认删除",
      onConfirm: () => {
        setCases(prev => prev.filter(c => c.id !== id));
      }
    });
  };

  const saveCase = (c: Case) => {
    setCases(prev => {
      if (prev.find(item => item.id === c.id)) {
        return prev.map(item => item.id === c.id ? c : item);
      } else {
        return [...prev, c];
      }
    });
    setEditingCase(null);
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-lg font-bold text-gray-800">所有案件</h3>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingCase({ id: generateId('C-'), code: `CASE-${Math.floor(1000 + Math.random() * 9000)}`, name: '', description: '', isOpen: true });
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow"
        >
          <Icons.Plus /> 创建案件
        </button>
      </div>
      <div className="grid gap-4 overflow-y-auto pr-2 pb-4">
        {cases.map(c => (
          <div key={c.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-start bg-white hover:border-indigo-200 transition-colors shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {c.isOpen ? '打开' : '已关闭'}
                </span>
              </div>
              <h4 className="font-bold text-gray-800">{c.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{c.description || '无描述'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingCase(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Icons.Edit /></button>
              <button 
                type="button"
                onClick={() => handleDelete(c.id)} 
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Icons.Trash />
              </button>
            </div>
          </div>
        ))}
        {cases.length === 0 && <p className="text-center py-10 text-gray-400">暂无案件数据</p>}
      </div>
      {(editingCase || isAdding) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold mb-4">{isAdding ? '创建新案件' : '编辑案件'}</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">案件编码 (不可修改)</label>
                <input readOnly value={editingCase?.code} className="w-full bg-gray-100 border border-gray-200 rounded p-2 text-gray-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">案件名称</label>
                <input autoFocus value={editingCase?.name} onChange={(e) => setEditingCase(prev => prev ? {...prev, name: e.target.value} : null)} className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">案件描述</label>
                <textarea value={editingCase?.description} onChange={(e) => setEditingCase(prev => prev ? {...prev, description: e.target.value} : null)} className="w-full border border-gray-300 rounded p-2 outline-none h-24 focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isOpen" checked={editingCase?.isOpen} onChange={(e) => setEditingCase(prev => prev ? {...prev, isOpen: e.target.checked} : null)} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="isOpen" className="text-sm font-medium text-gray-700">启用案件 (打开状态)</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setEditingCase(null); setIsAdding(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
              <button onClick={() => editingCase && saveCase(editingCase)} disabled={!editingCase?.name} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 shadow font-bold">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type SortField = 'case' | 'type' | 'time' | 'duration';
type SortOrder = 'asc' | 'desc';

const RecordManagement: React.FC<{
  cases: Case[];
  entries: TimeEntry[];
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  showConfirm: (config: any) => void;
}> = ({ cases, entries, setEntries, showConfirm }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [batchSelection, setBatchSelection] = useState<string[]>([]);
  
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedEntries = useMemo(() => {
    let result = entries.filter(e => !selectedCaseId || e.caseId === selectedCaseId);
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'case':
          const nameA = cases.find(c => c.id === a.caseId)?.name || '';
          const nameB = cases.find(c => c.id === b.caseId)?.name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'type':
          comparison = a.workType.localeCompare(b.workType);
          break;
        case 'time':
          comparison = a.startTime - b.startTime;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [entries, selectedCaseId, sortField, sortOrder, cases]);

  const selectableEntries = sortedEntries.filter(e => e.endTime !== null);

  const toggleSelection = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry || entry.endTime === null) return;
    setBatchSelection(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const deleteSelected = () => {
    const count = batchSelection.length;
    if (count === 0) return;
    showConfirm({
      title: "删除时间记录",
      message: `确定要删除选中的 ${count} 条时间记录吗？该操作不可撤销。`,
      isDestructive: true,
      confirmText: "确认删除",
      onConfirm: () => {
        setEntries(prev => prev.filter(e => !batchSelection.includes(e.id)));
        setBatchSelection([]);
      }
    });
  };

  const handleAddManual = () => {
    if (cases.length === 0) {
      window.alert("请先创建至少一个案件。");
      return;
    }
    const targetCaseId = selectedCaseId || cases[0].id;
    const now = Date.now();
    const startTime = now;
    const endTime = now + 1800000;
    const newEntry: TimeEntry = {
      id: generateId('REC-'),
      caseId: targetCaseId,
      workType: WorkType.Meeting,
      notes: '',
      startTime: startTime,
      endTime: endTime,
      duration: 30
    };
    setEntries(prev => [newEntry, ...prev]);
    setEditingEntry(newEntry);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    if (isNaN(editingEntry.startTime)) {
        window.alert("开始时间无效");
        return;
    }
    if (editingEntry.endTime !== null) {
      if (isNaN(editingEntry.endTime)) {
          window.alert("结束时间无效");
          return;
      }
      if (editingEntry.endTime <= editingEntry.startTime) {
        window.alert("结束时间必须晚于开始时间");
        return;
      }
    }
    setEntries(prev => prev.map(item => item.id === editingEntry.id ? editingEntry : item));
    setEditingEntry(null);
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 opacity-20">⇅</span>;
    return <span className="ml-1 text-indigo-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const safeTimestampToISO = (ts: number | null): string => {
    if (ts === null || isNaN(ts)) return '';
    try {
        const d = new Date(ts);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)} 
            className="border border-gray-300 rounded px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
          >
            <option value="">所有案件记录</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button 
            type="button"
            onClick={handleAddManual}
            className="flex items-center gap-1 text-indigo-600 border border-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-bold text-xs"
          >
            <Icons.Plus /> 手动添加
          </button>
        </div>
        {batchSelection.length > 0 && (
          <button 
            type="button"
            onClick={deleteSelected} 
            className="bg-red-50 text-red-600 border border-red-500 px-4 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-2 transition-all font-black shadow-sm text-xs"
          >
            <Icons.Trash /> 删除选中 ({batchSelection.length})
          </button>
        )}
      </div>
      <div className="flex-grow border border-gray-100 rounded-xl shadow-sm bg-white overflow-y-auto min-h-0">
        <table className="w-full text-left text-sm table-fixed">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  onChange={(e) => setBatchSelection(e.target.checked ? selectableEntries.map(e => e.id) : [])} 
                  checked={selectableEntries.length > 0 && batchSelection.length === selectableEntries.length}
                />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-600 transition-colors select-none w-[20%]" onClick={() => handleSort('case')}>
                案件 <SortIndicator field="case" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-600 transition-colors select-none w-[80px]" onClick={() => handleSort('type')}>
                类型 <SortIndicator field="type" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-600 transition-colors select-none w-[130px]" onClick={() => handleSort('time')}>
                起止时间 <SortIndicator field="time" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-600 transition-colors select-none w-[70px]" onClick={() => handleSort('duration')}>
                时长 <SortIndicator field="duration" />
              </th>
              <th className="px-4 py-3 text-right w-[60px]">操作</th>
              <th className="px-4 py-3">注释</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedEntries.map(e => {
              const c = cases.find(item => item.id === e.caseId);
              const isActive = e.endTime === null;
              return (
                <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${isActive ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      disabled={isActive}
                      checked={batchSelection.includes(e.id)} 
                      onChange={() => toggleSelection(e.id)} 
                      className={isActive ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium truncate" title={c?.name}>{c?.name || '未知'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold block truncate text-center ${isActive ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {e.workType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] leading-tight text-gray-500 font-mono">
                    {formatDateTime(e.startTime)}<br/>
                    {formatDateTime(e.endTime)}
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-600 font-bold text-xs">
                    {isActive ? <span className="animate-pulse">计时中...</span> : `${e.duration}m`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingEntry(e)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">编辑</button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic truncate" title={e.notes || '无注释'}>
                    {e.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedEntries.length === 0 && <p className="text-center py-20 text-gray-400 bg-white">没有找到相关计时记录</p>}
      </div>
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold mb-4">编辑计时记录</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">所属案件</label>
                <select 
                  value={editingEntry.caseId} 
                  onChange={(e) => setEditingEntry({...editingEntry, caseId: e.target.value})} 
                  className="w-full border border-gray-300 rounded p-2 outline-none"
                >
                  {cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">工作类型</label>
                <select value={editingEntry.workType} onChange={(e) => setEditingEntry({...editingEntry, workType: e.target.value as WorkType})} className="w-full border border-gray-300 rounded p-2 outline-none">
                  {Object.values(WorkType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">注释</label>
                <textarea value={editingEntry.notes} onChange={(e) => setEditingEntry({...editingEntry, notes: e.target.value})} className="w-full border border-gray-300 rounded p-2 outline-none h-20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">开始时间</label>
                  <input type="datetime-local" value={safeTimestampToISO(editingEntry.startTime)} onChange={(e) => {
                      const val = e.target.value; if (!val) return;
                      const newStart = new Date(val).getTime(); if (isNaN(newStart)) return;
                      setEditingEntry({...editingEntry, startTime: newStart, duration: calculateDuration(newStart, editingEntry.endTime)});
                  }} className="w-full border border-gray-300 rounded p-2 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">结束时间</label>
                  <input type="datetime-local" disabled={editingEntry.endTime === null} value={safeTimestampToISO(editingEntry.endTime)} onChange={(e) => {
                        const val = e.target.value; if (!val) return;
                        const newEnd = new Date(val).getTime(); if (isNaN(newEnd)) return;
                        setEditingEntry({...editingEntry, endTime: newEnd, duration: calculateDuration(editingEntry.startTime, newEnd)});
                  }} className="w-full border border-gray-300 rounded p-2 outline-none text-sm disabled:bg-gray-50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setEditingEntry(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleSaveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow font-bold">保存修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportGeneration: React.FC<{
  cases: Case[];
  entries: TimeEntry[];
}> = ({ cases, entries }) => {
  const defaultDates = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: formatDate(firstDay.getTime()),
        end: formatDate(lastDay.getTime())
    };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const entriesInRange = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000;
    return entries.filter(e => e.startTime >= start && e.startTime <= end);
  }, [entries, startDate, endDate]);

  const availableCases = useMemo(() => {
    const caseIdsWithRecords = new Set(entriesInRange.map(e => e.caseId));
    return cases.filter(c => caseIdsWithRecords.has(c.id));
  }, [cases, entriesInRange]);

  useEffect(() => {
    const availableIds = new Set(availableCases.map(c => c.id));
    setSelectedCaseIds(prev => prev.filter(id => availableIds.has(id)));
  }, [availableCases]);

  const filtered = useMemo(() => {
    const data = selectedCaseIds.length === 0 
      ? entriesInRange 
      : entriesInRange.filter(e => selectedCaseIds.includes(e.caseId));
    return [...data].sort((a, b) => b.startTime - a.startTime);
  }, [entriesInRange, selectedCaseIds]);

  const stats = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => { map.set(e.caseId, (map.get(e.caseId) || 0) + e.duration); });
    return Array.from(map.entries())
      .map(([id, total]) => ({ caseId: id, case: cases.find(c => c.id === id)?.name || '未知', total }))
      .sort((a, b) => a.case.localeCompare(b.case)); 
  }, [filtered, cases]);

  const handleExportCsv = () => {
    const headers = ['案件', '工作类型', '注释', '开始', '结束', '时长'];
    const rows = filtered.map(e => [
      cases.find(c => c.id === e.caseId)?.name || '未知',
      e.workType, e.notes,
      formatDateTime(e.startTime), formatDateTime(e.endTime), e.duration.toString()
    ]);
    rows.push(['', '', '', '', '', '']);
    stats.forEach(s => {
      rows.push([s.case, '总计', '', '', '', s.total.toString()]);
    });
    downloadCsv(headers, rows, `Report_${startDate}_${endDate}.csv`);
  };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col gap-6 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">开始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">结束日期</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-xs font-bold text-gray-500 mb-2">按案件筛选</label>
          <div className="flex flex-wrap gap-2">
            {availableCases.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 italic">该时间段内暂无案件记录</p>
            ) : (
                availableCases.map(c => (
                    <button key={c.id} onClick={() => setSelectedCaseIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedCaseIds.includes(c.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                      {c.name}
                    </button>
                  ))
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-lg font-bold text-gray-800">报表明细</h3>
        <button onClick={handleExportCsv} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors shadow flex items-center gap-2 text-sm font-bold disabled:opacity-50" disabled={filtered.length === 0}>
          导出 CSV
        </button>
      </div>
      {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {stats.map(s => (
              <div key={s.caseId} className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-[10px] text-indigo-400 font-bold uppercase truncate" title={s.case}>{s.case}</p>
                <p className="text-xl font-black text-indigo-700">{s.total}m</p>
              </div>
            ))}
          </div>
      )}
      <div className="border border-gray-100 rounded-xl shadow-sm bg-white flex flex-col flex-grow min-h-0 overflow-y-auto">
        <table className="w-full text-left text-xs table-fixed">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-[25%]">案件</th>
              <th className="px-4 py-3 w-[80px] text-center">类型</th>
              <th className="px-4 py-3 w-[130px]">起止时间</th>
              <th className="px-4 py-3 w-[70px] text-right">时长</th>
              <th className="px-4 py-3">注释</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-700 truncate" title={cases.find(c => c.id === e.caseId)?.name}>{cases.find(c => c.id === e.caseId)?.name || '未知'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] uppercase font-bold">{e.workType}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-[10px] leading-tight">
                  {formatDateTime(e.startTime)}<br/>
                  {formatDateTime(e.endTime)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">{e.duration}m</td>
                <td className="px-4 py-3 text-gray-500 italic truncate" title={e.notes || '无注释'}>{e.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-20 text-gray-400 bg-white">该时间段内暂无满足条件的记录</p>}
      </div>
    </div>
  );
};

const SystemManagement: React.FC<{
  cases: Case[]; entries: TimeEntry[];
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  showConfirm: (config: any) => void;
}> = ({ cases, entries, setCases, setEntries, showConfirm }) => {
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.cases) && Array.isArray(parsed.entries)) {
        showConfirm({
          title: "恢复备份数据", message: "这将会清除当前所有数据并覆盖为备份文件内容。确定要继续吗？",
          isDestructive: true, confirmText: "确认恢复", onConfirm: () => { setCases(parsed.cases); setEntries(parsed.entries); }
        });
      } else { window.alert("非法的备份文件格式。"); }
    } catch (err) { window.alert("读取文件失败"); } finally { e.target.value = ''; }
  };
  return (
    <div className="max-w-xl mx-auto py-10 text-center">
      <div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100 mb-8">
        <h4 className="text-xl font-black text-indigo-900 mb-4">备份数据</h4>
        <button onClick={() => downloadJson({ cases, entries, timestamp: Date.now() }, `Chronos_Backup_${Date.now()}.json`)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg">立即备份 (JSON)</button>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 hover:border-indigo-300 transition-colors">
        <h4 className="font-bold text-gray-700 mb-4">恢复备份</h4>
        <label className="bg-white border border-gray-300 px-6 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 font-medium shadow-sm transition-colors inline-block">选择文件并导入<input type="file" accept=".json" onChange={handleRestore} className="hidden" /></label>
      </div>
    </div>
  );
};

export default App;