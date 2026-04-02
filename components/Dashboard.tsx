import React, { useState, useEffect, useRef } from 'react';
import { Case, TimeEntry } from '../types';
import { Icons } from '../constants';
import { formatLiveDuration } from '../utils';
import Tooltip from './Tooltip';
import EditableSelect from './EditableSelect';

interface DashboardProps {
  cases: Case[];
  entries: TimeEntry[];
  workTypes: string[];
  expenseTypes: string[];
  onStart: (id: string, type: string, content: string, notes: string) => void;
  onAddExpense: (caseId: string) => void;
  onStop: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ cases, entries, workTypes, expenseTypes, onStart, onAddExpense, onStop }) => {
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

interface CaseRowProps {
  caseItem: Case;
  workTypes: string[];
  expenseTypes: string[];
  onStart: (id: string, type: string, content: string, notes: string) => void;
  onAddExpense: (caseId: string) => void;
  activeEntry: TimeEntry | null;
}

const CaseRow: React.FC<CaseRowProps> = ({ caseItem, workTypes, expenseTypes, onStart, onAddExpense, activeEntry }) => {
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

export default Dashboard;