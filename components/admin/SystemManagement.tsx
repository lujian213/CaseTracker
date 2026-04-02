import React from 'react';
import { Case, TimeEntry, ExpenseEntry, BackupSettings } from '../../types';
import { Icons } from '../../constants';
import { formatDateTime, formatFullTimestamp, downloadJson } from '../../utils';

interface SystemManagementProps {
  cases: Case[];
  entries: TimeEntry[];
  expenses: ExpenseEntry[];
  workTypes: string[];
  expenseTypes: string[];
  setCases: any;
  setEntries: any;
  setExpenses: any;
  setWorkTypes: any;
  setExpenseTypes: any;
  backupSettings: BackupSettings;
  setBackupSettings: any;
  showConfirm: any;
}

const SystemManagement: React.FC<SystemManagementProps> = ({ cases, entries, expenses, workTypes, expenseTypes, setCases, setEntries, setExpenses, setWorkTypes, setExpenseTypes, backupSettings, setBackupSettings, showConfirm }) => {
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

export default SystemManagement;