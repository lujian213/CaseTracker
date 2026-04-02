import React, { useState } from 'react';
import { Case } from '../../types';
import { Icons } from '../../constants';
import { generateId } from '../../utils';
import Tooltip from '../Tooltip';

interface CaseManagementProps {
  cases: Case[];
  setCases: any;
  setEntries: any;
  showConfirm: any;
}

const CaseManagement: React.FC<CaseManagementProps> = ({ cases, setCases, setEntries, showConfirm }) => {
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

export default CaseManagement;