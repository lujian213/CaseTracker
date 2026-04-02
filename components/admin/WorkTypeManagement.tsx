import React, { useState } from 'react';
import { Icons } from '../../constants';

interface WorkTypeManagementProps {
  workTypes: string[];
  setWorkTypes: any;
  expenseTypes: string[];
  setExpenseTypes: any;
  showConfirm: any;
}

const WorkTypeManagement: React.FC<WorkTypeManagementProps> = ({ workTypes, setWorkTypes, expenseTypes, setExpenseTypes, showConfirm }) => {
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

export default WorkTypeManagement;