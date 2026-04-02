import React from 'react';
import { Case, TimeEntry, ExpenseEntry, BackupSettings } from '../../types';
import CaseManagement from './CaseManagement';
import WorkTypeManagement from './WorkTypeManagement';
import RecordManagement from './RecordManagement';
import ExpenseManagement from './ExpenseManagement';
import ReportGeneration from './ReportGeneration';
import SystemManagement from './SystemManagement';

type AdminTab = 'cases' | 'worktypes' | 'records' | 'expenses' | 'reports' | 'system';

interface AdminOverlayProps {
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  onClose: () => void;
  cases: Case[];
  setCases: any;
  entries: TimeEntry[];
  setEntries: any;
  expenses: ExpenseEntry[];
  setExpenses: any;
  workTypes: string[];
  setWorkTypes: any;
  expenseTypes: string[];
  setExpenseTypes: any;
  backupSettings: BackupSettings;
  setBackupSettings: any;
  showConfirm: any;
}

const AdminOverlay: React.FC<AdminOverlayProps> = ({ tab, setTab, onClose, cases, setCases, entries, setEntries, expenses, setExpenses, workTypes, setWorkTypes, expenseTypes, setExpenseTypes, backupSettings, setBackupSettings, showConfirm }) => (
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
        <div className="flex-1 p-3 bg-white overflow-hidden relative">
          {tab === 'cases' && <CaseManagement cases={cases} setCases={setCases} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'worktypes' && <WorkTypeManagement workTypes={workTypes} setWorkTypes={setWorkTypes} expenseTypes={expenseTypes} setExpenseTypes={setExpenseTypes} showConfirm={showConfirm} />}
          {tab === 'records' && <RecordManagement cases={cases} entries={entries} workTypes={workTypes} setEntries={setEntries} showConfirm={showConfirm} />}
          {tab === 'expenses' && <ExpenseManagement cases={cases} expenses={expenses} setExpenses={setExpenses} expenseTypes={expenseTypes} setExpenseTypes={setExpenseTypes} showConfirm={showConfirm} />}
          {tab === 'reports' && <ReportGeneration cases={cases} entries={entries} expenses={expenses} workTypes={workTypes} expenseTypes={expenseTypes} />}
          {tab === 'system' && <SystemManagement cases={cases} entries={entries} expenses={expenses} workTypes={workTypes} expenseTypes={expenseTypes} setCases={setCases} setEntries={setEntries} setExpenses={setExpenses} setWorkTypes={setWorkTypes} setExpenseTypes={setExpenseTypes} backupSettings={backupSettings} setBackupSettings={setBackupSettings} showConfirm={showConfirm} />}
        </div>
      </div>
    </div>
  </div>
);

export default AdminOverlay;
export type { AdminTab };