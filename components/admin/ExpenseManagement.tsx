import React, { useState, useMemo } from 'react';
import { Case, ExpenseEntry } from '../../types';
import { Icons } from '../../constants';
import { generateId } from '../../utils';
import Tooltip from '../Tooltip';
import EditableSelect from '../EditableSelect';

interface ExpenseManagementProps {
  cases: Case[];
  expenses: ExpenseEntry[];
  setExpenses: any;
  expenseTypes: string[];
  setExpenseTypes: any;
  showConfirm: any;
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ cases, expenses, setExpenses, expenseTypes, setExpenseTypes, showConfirm }) => {
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
                <EditableSelect
                  value={editingExpense.type}
                  onChange={(v) => setEditingExpense({...editingExpense, type: v})}
                  options={expenseTypes}
                  className="w-full"
                />
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

export default ExpenseManagement;