import React, { useState, useMemo } from 'react';
import { Case, TimeEntry } from '../../types';
import { Icons } from '../../constants';
import { generateId, formatDateTime, formatDurationDisplay, formatLiveDuration } from '../../utils';
import Tooltip from '../Tooltip';
import EditableSelect from '../EditableSelect';

type SortField = 'case' | 'type' | 'time' | 'duration';
type SortOrder = 'asc' | 'desc';

interface RecordManagementProps {
  cases: Case[];
  entries: TimeEntry[];
  workTypes: string[];
  setEntries: any;
  showConfirm: any;
}

const RecordManagement: React.FC<RecordManagementProps> = ({ cases, entries, workTypes, setEntries, showConfirm }) => {
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
      caseId: targetCaseId,
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
                    !isNewRecord ||
                    (isNewRecord && !!selectedCaseId)
                  }
                  onChange={e => setEditingEntry({...editingEntry, caseId: e.target.value})}
                  className="w-full border border-gray-300 p-2 rounded bg-gray-50 text-sm outline-none"
                >
                  {
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

export default RecordManagement;