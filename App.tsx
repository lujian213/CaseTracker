
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Case, TimeEntry, WorkType, AppData } from './types';
import { generateId, calculateDuration, downloadJson, formatDateTime, formatDate, downloadCsv, downloadXlsx, formatDurationDisplay } from './utils';
import { Icons } from './constants';

const LOCAL_STORAGE_KEY = 'chronos_case_tracker_data';
const DEFAULT_WORK_TYPES = Object.values(WorkType);

type AdminTab = 'cases' | 'worktypes' | 'records' | 'reports' | 'system';

type SortField = 'case' | 'type' | 'time' | 'duration';
type SortOrder = 'asc' | 'desc';

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
        <div className="p-5"><h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3><p className="text-gray-600 text-xs leading-relaxed">{message}</p></div>
        <div className="bg-gray-50 px-5 py-3 flex justify-end gap-2 border-t border-gray-100">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>(DEFAULT_WORK_TYPES);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('cases');
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; isDestructive?: boolean; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AppData = JSON.parse(stored);
        if (parsed.cases) setCases(parsed.cases);
        if (parsed.entries) setEntries(parsed.entries);
        if (parsed.workTypes) setWorkTypes(parsed.workTypes);
      } catch (e) { console.error("Failed to load data", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ cases, entries, workTypes }));
  }, [cases, entries, workTypes]);

  const stopAllTimers = useCallback((ts?: number) => {
    const timestamp = ts || Date.now();
    setEntries(prev => prev.map(entry => entry.endTime === null ? { ...entry, endTime: timestamp, duration: calculateDuration(entry.startTime, timestamp) } : entry));
  }, []);

  const startTimer = useCallback((caseId: string, workType: string, workContent: string, notes: string) => {
    const now = Date.now(); stopAllTimers(now);
    setEntries(prev => [...prev, { id: generateId('REC-'), caseId, workType, workContent, notes, startTime: now, endTime: null, duration: 0 }]);
  }, [stopAllTimers]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-slate-800 font-sans">
      <ConfirmDialog {...confirmConfig} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} />
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-2"><span className="bg-indigo-700 text-white p-1 rounded shadow-lg">Chronos</span><span className="text-gray-600 font-light">时间记录器</span></h1>
        <button onClick={() => setIsAdminOpen(true)} className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg shadow-sm transition-all"><Icons.Settings /> <span className="font-medium">管理</span></button>
      </header>
      <main className="max-w-4xl mx-auto"><Dashboard cases={cases.filter(c => c.isOpen)} entries={entries} workTypes={workTypes} onStart={startTimer} onStop={() => stopAllTimers()} /></main>
      {isAdminOpen && <AdminOverlay tab={adminTab} setTab={setAdminTab} onClose={() => setIsAdminOpen(false)} cases={cases} setCases={setCases} entries={entries} setEntries={setEntries} workTypes={workTypes} setWorkTypes={setWorkTypes} showConfirm={(c:any) => setConfirmConfig({...c, isOpen:true})} />}
    </div>
  );
};

const Dashboard: React.FC<{ cases: Case[]; entries: TimeEntry[]; workTypes: string[]; onStart: (id: string, type: string, content: string, notes: string) => void; onStop: () => void; }> = ({ cases, entries, workTypes, onStart, onStop }) => {
  const activeEntry = entries.find(e => e.endTime === null);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 min-h-[320px]">
        <div className="p-1">
          {cases.length === 0 ? <div className="py-20 text-center text-gray-400"><p>目前没有打开的案件</p><p className="text-sm">点击右上角“管理”按钮创建新案件</p></div> :
            <div className="divide-y divide-gray-100">{cases.map(c => <CaseRow key={c.id} caseItem={c} workTypes={workTypes} onStart={onStart} isActive={activeEntry?.caseId === c.id} />)}</div>}
        </div>
      </div>
      <div className="flex justify-center mt-8"><button onClick={onStop} className="bg-gray-800 hover:bg-black text-white px-10 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all font-bold active:scale-95"><Icons.Stop /> 休息 (停止计时)</button></div>
    </div>
  );
};

const CaseRow: React.FC<{ caseItem: Case; workTypes: string[]; onStart: (id: string, type: string, content: string, notes: string) => void; isActive: boolean; }> = ({ caseItem, workTypes, onStart, isActive }) => {
  const [workType, setWorkType] = useState<string>(workTypes[0] || '会议');
  const [workContent, setWorkContent] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { if (!workTypes.includes(workType) && workTypes.length > 0) setWorkType(workTypes[0]); }, [workTypes, workType]);
  return (
    <div className={`p-4 transition-colors flex flex-col md:flex-row md:items-center gap-4 first:rounded-t-xl last:rounded-b-xl ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}>
      <div className="flex-grow group relative">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2" title={caseItem.description || caseItem.name}>
          {caseItem.name}
          <Icons.ChevronRight className="opacity-0 group-hover:opacity-30 w-3 h-3" />
        </h3>
        <p className="text-xs text-gray-500 font-mono">{caseItem.code}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <EditableSelect value={workType} onChange={setWorkType} options={workTypes} className="w-full md:w-32" placeholder="类型" />
        <input type="text" placeholder="工作内容" value={workContent} onChange={(e) => setWorkContent(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm md:w-28 focus:ring-2 focus:ring-indigo-200 outline-none" />
        <input type="text" placeholder="注释" value={notes} onChange={(e) => setNotes(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm flex-grow md:w-40" />
        <button onClick={() => onStart(caseItem.id, workType, workContent, notes)} disabled={isActive} className={`flex items-center gap-1 px-4 py-1.5 rounded text-sm font-bold shadow transition-all ${isActive ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}`}>{isActive ? '计时中...' : <><Icons.Play /> 开始计时</>}</button>
      </div>
    </div>
  );
};

const AdminOverlay: React.FC<{ tab: AdminTab; setTab: (t: AdminTab) => void; onClose: () => void; cases: Case[]; setCases: any; entries: TimeEntry[]; setEntries: any; workTypes: string[]; setWorkTypes: any; showConfirm: any; }> = ({ tab, setTab, onClose, cases, setCases, entries, setEntries, workTypes, setWorkTypes, showConfirm }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="border-b border-gray-100 flex justify-between items-center px-6 py-4 bg-gray-50 shrink-0"><h2 className="text-xl font-bold text-gray-800">管理后台</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-gray-100 bg-gray-50 flex flex-col p-4 gap-2 shrink-0">{[{ id:'cases', label:'案件管理' },{ id:'worktypes', label:'类型管理' },{ id:'records', label:'记录管理' },{ id:'reports', label:'统计报表' },{ id:'system', label:'系统备份' }].map(t => (<button key={t.id} onClick={() => setTab(t.id as AdminTab)} className={`text-left px-4 py-2.5 rounded-lg transition-colors font-medium ${tab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}>{t.label}</button>))}</div>
        <div className="flex-1 p-6 bg-white overflow-hidden">
          {tab === 'cases' && <CaseManagement cases={cases} setCases={setCases} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'worktypes' && <WorkTypeManagement workTypes={workTypes} setWorkTypes={setWorkTypes} showConfirm={showConfirm} />}
          {tab === 'records' && <RecordManagement cases={cases} entries={entries} workTypes={workTypes} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'reports' && <ReportGeneration cases={cases} entries={entries} />}
          {tab === 'system' && <SystemManagement cases={cases} entries={entries} workTypes={workTypes} setCases={setCases} setEntries={setEntries} setWorkTypes={setWorkTypes} showConfirm={showConfirm} />}
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
      <div className="flex justify-between items-center mb-6 shrink-0"><h3 className="text-lg font-bold text-gray-800">所有案件</h3><button onClick={() => { setIsAdding(true); setEditingCase({ id: generateId('C-'), code: `CASE-${Math.floor(1000 + Math.random() * 9000)}`, name: '', description: '', isOpen: true }); }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow"><Icons.Plus /> 创建案件</button></div>
      <div className="grid gap-4 overflow-y-auto pr-2 pb-4">
        {cases.map(c => (
          <div key={c.id} className="border border-gray-200 rounded-xl p-4 flex justify-between bg-white hover:border-indigo-200">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{c.isOpen ? '打开' : '关闭'}</span>
              </div>
              <h4 className="font-bold text-gray-800" title={c.description || c.name}>{c.name}</h4>
            </div>
            <div className="flex gap-2"><button onClick={() => setEditingCase(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Icons.Edit /></button><button onClick={() => showConfirm({ title: "删除案件", message: "确定要删除吗？计时记录也将删除。", isDestructive: true, confirmText: "删除", onConfirm: () => { setCases((prev:Case[]) => prev.filter(item => item.id !== c.id)); setEntries((prev:any[]) => prev.filter(e => e.caseId !== c.id)); } })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Icons.Trash /></button></div>
          </div>
        ))}
      </div>
      {(editingCase || isAdding) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130] p-4"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"><h4 className="text-lg font-bold mb-4">{isAdding ? '创建' : '编辑'}</h4><div className="space-y-4"><input placeholder="案件名称" autoFocus value={editingCase?.name} onChange={(e) => setEditingCase(prev => prev ? {...prev, name: e.target.value} : null)} className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-indigo-200" /><textarea placeholder="描述" value={editingCase?.description} onChange={(e) => setEditingCase(prev => prev ? {...prev, description: e.target.value} : null)} className="w-full border border-gray-300 rounded p-2 h-24" /><label className="flex items-center gap-2"><input type="checkbox" checked={editingCase?.isOpen} onChange={(e) => setEditingCase(prev => prev ? {...prev, isOpen: e.target.checked} : null)} /> 启用案件</label></div><div className="flex justify-end gap-3 mt-8"><button onClick={() => { setEditingCase(null); setIsAdding(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100">取消</button><button onClick={() => editingCase && saveCase(editingCase)} disabled={!editingCase?.name} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold">保存</button></div></div></div>
      )}
    </div>
  );
};

const WorkTypeManagement: React.FC<{ workTypes: string[]; setWorkTypes: any; showConfirm: any; }> = ({ workTypes, setWorkTypes, showConfirm }) => {
  const [newType, setNewType] = useState('');
  return (
    <div className="flex flex-col h-full"><h3 className="text-lg font-bold text-gray-800 mb-6">工作类型管理</h3><div className="flex gap-2 mb-6"><input type="text" placeholder="新类型" value={newType} onChange={(e) => setNewType(e.target.value)} className="flex-grow border border-gray-300 rounded-lg px-4 py-2" /><button onClick={() => { if(newType) setWorkTypes((prev:any)=>[...prev, newType]); setNewType(''); }} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow">添加</button></div><div className="flex-grow overflow-y-auto">{workTypes.map((type, index) => (<div key={type + index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl mb-2"><span className="font-medium text-gray-700">{type}</span><button onClick={() => showConfirm({ title:"删除类型", message:`确定删除 ${type} 吗？`, isDestructive: true, onConfirm: () => setWorkTypes((prev:any)=>prev.filter((t:any)=>t!==type)) })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Icons.Trash /></button></div>))}</div></div>
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
    if (openCases.length === 0) { window.alert("请先创建并打开一个案件。"); return; }
    const now = Date.now();
    const startTime = now - (10 * 60 * 1000);
    const newEntry: TimeEntry = { id: generateId('REC-'), caseId: openCases[0].id, workType: workTypes[0] || '会议', workContent: '', notes: '', startTime, endTime: now, duration: 10 };
    setEntries((prev:any) => [newEntry, ...prev]); setIsNewRecord(true); setEditingEntry(newEntry);
  };

  const safeToISO = (ts: number | null) => { if (!ts) return ''; const d = new Date(ts); const pad = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0"><div className="flex gap-3"><select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="border rounded px-4 py-2 bg-white text-sm"><option value="">所有记录</option>{cases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={handleAddManual} className="flex items-center gap-1 text-indigo-600 border border-indigo-600 px-3 py-1.5 rounded-lg font-bold text-xs"><Icons.Plus /> 手动添加</button></div>{batchSelection.length > 0 && <button onClick={() => showConfirm({ title:"删除", message:`删除选中的 ${batchSelection.length} 条？`, isDestructive:true, onConfirm:()=> { setEntries((p:any)=>p.filter((e:any)=>!batchSelection.includes(e.id))); setBatchSelection([]); } })} className="bg-red-50 text-red-600 border border-red-500 px-4 py-1.5 rounded-lg text-xs font-black shadow-sm">删除选中</button>}</div>
      <div className="flex-grow border border-gray-100 rounded-xl bg-white overflow-y-auto">
        <table className="w-full text-left text-sm table-fixed">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold sticky top-0">
            <tr>
              <th className="px-4 py-3 w-10"><input type="checkbox" onChange={e => setBatchSelection(e.target.checked ? sortedEntries.filter(i=>i.endTime!==null).map(i=>i.id) : [])} checked={batchSelection.length > 0 && batchSelection.length === sortedEntries.filter(i=>i.endTime!==null).length} /></th>
              <th className="px-4 py-3 w-[20%]">案件</th>
              <th className="px-4 py-3 w-[110px]">类型</th>
              <th className="px-4 py-3 w-[130px]">时间</th>
              <th className="px-4 py-3 w-[70px]">时长</th>
              <th className="px-4 py-3 w-[60px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedEntries.map(e => {
              const c = cases.find(i => i.id === e.caseId);
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" disabled={e.endTime===null} checked={batchSelection.includes(e.id)} onChange={()=>setBatchSelection(p=>p.includes(e.id)?p.filter(i=>i!==e.id):[...p,e.id])} /></td>
                  <td className="px-4 py-3 font-medium truncate" title={c ? (c.description || c.name) : ''}>
                    {c?.name}
                  </td>
                  <td className="px-4 py-3 truncate">{e.workType}</td>
                  <td className="px-4 py-3 text-[10px] text-gray-500 font-mono">{formatDateTime(e.startTime)}<br/>{formatDateTime(e.endTime)}</td>
                  <td className="px-4 py-3 font-bold text-indigo-600">{e.endTime===null?'计时中...':formatDurationDisplay(e.duration)}</td>
                  <td className="px-4 py-3"><button onClick={()=>{setIsNewRecord(false);setEditingEntry(e)}} className="text-indigo-600 text-xs">编辑</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[130] p-4"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"><h4 className="text-lg font-bold mb-4">{isNewRecord ? '添加' : '编辑'}</h4><div className="space-y-4"><div><label className="text-xs font-bold text-gray-500">案件</label><select value={editingEntry.caseId} disabled={!isNewRecord} onChange={e=>setEditingEntry({...editingEntry, caseId: e.target.value})} className="w-full border p-2 rounded">{ (isNewRecord ? openCases : cases).map(c=><option key={c.id} value={c.id}>{c.name}</option>) }</select></div><EditableSelect value={editingEntry.workType} onChange={v=>setEditingEntry({...editingEntry, workType: v})} options={workTypes} placeholder="工作类型" /><input placeholder="工作内容" value={editingEntry.workContent} onChange={e=>setEditingEntry({...editingEntry, workContent: e.target.value})} className="w-full border p-2 rounded text-sm" /><div className="grid grid-cols-2 gap-4"><div><label className="text-xs">开始</label><input type="datetime-local" value={safeToISO(editingEntry.startTime)} onChange={e => { const ts = new Date(e.target.value).getTime(); if(ts) setEditingEntry({...editingEntry, startTime: ts, duration: calculateDuration(ts, editingEntry.endTime)})}} className="w-full border p-1 text-xs" /></div><div><label className="text-xs">结束</label><input type="datetime-local" value={safeToISO(editingEntry.endTime)} onChange={e => { const ts = new Date(e.target.value).getTime(); if(ts) setEditingEntry({...editingEntry, endTime: ts, duration: calculateDuration(editingEntry.startTime, ts)})}} className="w-full border p-1 text-xs" /></div></div></div><div className="flex justify-end gap-3 mt-8"><button onClick={()=>setEditingEntry(null)} className="px-4 py-2 text-gray-400">取消</button><button onClick={()=>{ setEntries((prev:any)=>prev.map((i:any)=>i.id===editingEntry.id?editingEntry:i)); setEditingEntry(null); }} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold">保存</button></div></div></div>
      )}
    </div>
  );
};

const ReportGeneration: React.FC<{ cases: Case[]; entries: TimeEntry[]; }> = ({ cases, entries }) => {
  const [startDate, setStartDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()));
  const [endDate, setEndDate] = useState(formatDate(Date.now()));
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const filtered = useMemo(() => {
    const s = new Date(startDate).getTime(); const e = new Date(endDate).getTime() + 86400000;
    const items = entries.filter(item => item.startTime >= s && item.startTime <= e && (selectedCaseIds.length === 0 || selectedCaseIds.includes(item.caseId)));
    return items.sort((a,b)=>b.startTime-a.startTime);
  }, [entries, startDate, endDate, selectedCaseIds]);

  const stats = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach(e => m.set(e.caseId, (m.get(e.caseId) || 0) + e.duration));
    return Array.from(m.entries()).map(([id, total]) => ({ id, name: cases.find(c=>c.id===id)?.name || '未知', total }));
  }, [filtered, cases]);

  const prepareData = () => {
    const map = new Map<string, any>();
    filtered.forEach(e => {
      const caseName = cases.find(c=>c.id===e.caseId)?.name || '未知';
      const key = `${e.caseId}|${e.workType}|${e.workContent}|${e.notes}|${formatDate(e.startTime)}`;
      const timeRange = `${formatDateTime(e.startTime)} - ${formatDateTime(e.endTime)}`;
      if(map.has(key)) {
        const obj = map.get(key);
        obj.ranges.push(timeRange);
        obj.duration += e.duration;
      } else {
        map.set(key, { caseName, workType: e.workType, workContent: e.workContent, notes: e.notes, ranges: [timeRange], duration: e.duration, timestamp: e.startTime });
      }
    });

    const aggregated = Array.from(map.values()).sort((a,b) => b.timestamp - a.timestamp);
    const mainRows = aggregated.map(o => [
      o.caseName,
      o.workType,
      o.workContent,
      o.notes,
      o.ranges.join('\n'),
      o.duration.toString()
    ]);
    const summaryRows = stats.map(s => [s.name, '总计', '', '', '', s.total.toString()]);
    return { mainRows, summaryRows };
  };

  const headers = ['案件', '工作类型', '工作内容', '注释', '起止时间', '时长(m)'];
  const handleCsv = () => { const { mainRows, summaryRows } = prepareData(); downloadCsv(headers, [...mainRows, ['','','','','',''], ...summaryRows], `Report_${startDate}.csv`); };
  const handleXlsx = () => { const { mainRows, summaryRows } = prepareData(); downloadXlsx(headers, [...mainRows, ['','','','','',''], ...summaryRows], `Report_${startDate}.xlsx`); };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col gap-4 shrink-0">
        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2 text-sm" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cases.map(c => (<button key={c.id} onClick={()=>setSelectedCaseIds(p=>p.includes(c.id)?p.filter(i=>i!==c.id):[...p,c.id])} className={`text-[10px] px-2 py-1 rounded-full border transition-all ${selectedCaseIds.includes(c.id)?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-500'}`}>{c.name}</button>))}
        </div>
      </div>
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-lg font-bold text-gray-800">报表明细</h3>
        <div className="flex gap-2">
          <button onClick={handleCsv} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold">CSV</button>
          <button onClick={handleXlsx} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Excel (XLSX)</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {stats.map(s => {
          const c = cases.find(item => item.id === s.id);
          return (
            <div key={s.id} className="bg-indigo-50 p-3 rounded-xl border border-indigo-100" title={c ? (c.description || c.name) : s.name}>
              <p className="text-[9px] text-indigo-400 font-bold truncate">{s.name}</p>
              <p className="text-lg font-black text-indigo-700">{formatDurationDisplay(s.total)}</p>
            </div>
          );
        })}
      </div>
      <div className="border border-gray-100 rounded-xl bg-white flex-grow min-h-0 overflow-y-auto">
        <table className="w-full text-left text-xs table-fixed">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[9px] sticky top-0">
            <tr>
              <th className="px-4 py-3 w-[25%]">案件</th>
              <th className="px-4 py-3 w-[100px]">类型</th>
              <th className="px-4 py-3 w-[130px]">时间</th>
              <th className="px-4 py-3 w-[70px] text-right">时长</th>
              <th className="px-4 py-3">内容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(e => {
              const c = cases.find(i => i.id === e.caseId);
              return (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 truncate font-semibold" title={c ? (c.description || c.name) : '未知'}>
                    {c?.name}
                  </td>
                  <td className="px-4 py-3 truncate">{e.workType}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-[9px]">{formatDateTime(e.startTime)}<br/>{formatDateTime(e.endTime)}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatDurationDisplay(e.duration)}</td>
                  <td className="px-4 py-3 truncate text-gray-400">{e.workContent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SystemManagement: React.FC<{ cases: Case[]; entries: TimeEntry[]; workTypes: string[]; setCases: any; setEntries: any; setWorkTypes: any; showConfirm: any; }> = ({ cases, entries, workTypes, setCases, setEntries, setWorkTypes, showConfirm }) => {
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text(); const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.cases)) { showConfirm({ title: "恢复数据", message: "确定覆盖现有数据吗？", isDestructive: true, onConfirm: () => { setCases(parsed.cases); setEntries(parsed.entries); if(parsed.workTypes) setWorkTypes(parsed.workTypes); } }); }
    } catch (err) { window.alert("读取失败"); } finally { e.target.value = ''; }
  };
  return (
    <div className="max-w-xl mx-auto py-10 text-center"><div className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100 mb-8"><h4 className="text-xl font-black text-indigo-900 mb-4">备份数据</h4><button onClick={() => downloadJson({ cases, entries, workTypes, timestamp: Date.now() }, `Chronos_Backup.json`)} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg">立即备份 (JSON)</button></div><div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 hover:border-indigo-300"><h4 className="font-bold text-gray-700 mb-4">恢复备份</h4><label className="bg-white border border-gray-300 px-6 py-2 rounded-lg cursor-pointer hover:bg-gray-50 inline-block font-medium">选择并导入<input type="file" accept=".json" onChange={handleRestore} className="hidden" /></label></div></div>
  );
};

export default App;
