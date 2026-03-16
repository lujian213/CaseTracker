# Export Interface Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "费用记录明细" (Expense Record Details) tab to the statistics report section with dedicated expense export functionality.

**Architecture:** Extend the existing ReportGeneration component to include tab navigation with two tabs: "时间记录明细" (Time Record Details) and "费用记录明细" (Expense Record Details). Each tab will have its own filtering and display logic but share common date range and case selection controls. Implement dedicated export functionality for expense records in XLSX format.

**Tech Stack:** TypeScript, React, xlsx library

---

## Context
Currently, the ReportGeneration component only handles time entries. We need to extend it to handle expense entries as well, with a tabbed interface to switch between viewing time records and expense records. The new "费用记录明细" tab should display expense records and provide an export function following the specifications in feature-expense.md.

## File Structure
- Modify: `App.tsx` - Update ReportGeneration component to include tab navigation and expense record handling
- Modify: `types.ts` - Ensure proper typing for the enhanced component
- No new files needed - extending existing functionality

## Chunk 1: Update ReportGeneration Component Structure

### Task 1: Modify ReportGeneration component signature to accept expenses prop

**Files:**
- Modify: `App.tsx:1076-1076`

- [ ] **Step 1: Update the component signature to include expenses prop**

```typescript
const ReportGeneration: React.FC<{ cases: Case[]; entries: TimeEntry[]; expenses: ExpenseEntry[]; }> = ({ cases, entries, expenses }) => {
```

- [ ] **Step 2: Run the application to verify compilation errors**

Run: `npm run build` or check if the application compiles
Expected: Compilation errors because the parent component doesn't pass the new prop

- [ ] **Step 3: Update the AdminPanel component to pass the expenses prop**

Locate where ReportGeneration is used in the AdminPanel component and update it to pass the expenses prop.

- [ ] **Step 4: Run the application again to verify no more compilation errors**

Run: `npm run build` or start the dev server
Expected: No compilation errors

- [ ] **Step 5: Commit the changes**

```bash
git add App.tsx
git commit -m "feat: Update ReportGeneration component signature to include expenses prop"
```

### Task 2: Add tab navigation state and UI elements

**Files:**
- Modify: `App.tsx:1076-1200`

- [ ] **Step 1: Add state for tracking active tab**

At the beginning of the ReportGeneration component, add:
```typescript
type ReportTab = 'time-records' | 'expense-records';
const [activeTab, setActiveTab] = useState<ReportTab>('time-records');
```

- [ ] **Step 2: Update the UI to include tab navigation**

After the filtering controls and before the stats section, add tab navigation UI:
```jsx
<div className="flex gap-2 mb-4 border-b border-gray-200">
  <button
    className={`pb-2 px-1 font-bold text-sm ${activeTab === 'time-records' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
    onClick={() => setActiveTab('time-records')}
  >
    时间记录明细
  </button>
  <button
    className={`pb-2 px-1 font-bold text-sm ${activeTab === 'expense-records' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
    onClick={() => setActiveTab('expense-records')}
  >
    费用记录明细
  </button>
</div>
```

- [ ] **Step 3: Wrap existing stats and table in conditional rendering**

Wrap the current stats display and table in a condition based on activeTab:
```jsx
{activeTab === 'time-records' && (
  <>
    {/* Current stats and table for time records */}
  </>
)}

{activeTab === 'expense-records' && (
  <>
    {/* Placeholder for expense records - will be implemented in next task */}
  </>
)}
```

- [ ] **Step 4: Update the export buttons section to be conditional**

Update the export buttons to show different buttons based on the active tab.

- [ ] **Step 5: Run the application to verify tab UI works**

Start the application and verify that the tab navigation appears and switches between states
Expected: Tabs appear and can be switched between

- [ ] **Step 6: Commit the changes**

```bash
git add App.tsx
git commit -m "feat: Add tab navigation to ReportGeneration component"
```

### Task 3: Prepare data processing logic for expense records

**Files:**
- Modify: `App.tsx:1107-1175`

- [ ] **Step 1: Create a function to prepare expense data similar to prepareData**

Create a new function called `prepareExpenseData` that filters and processes expense records based on the current date and case filters:
```typescript
const prepareExpenseData = () => {
  // Similar to prepareData but for expenses
  // Filter expenses by date range and selected cases
  const dateFiltered = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime() + 86400000;
    return expenses.filter(item => {
      const itemDate = new Date(item.date).setHours(0, 0, 0, 0);
      return itemDate >= s && itemDate <= e;
    }).sort((a, b) => b.date - a.date);
  }, [expenses, startDate, endDate]);

  const expenseFiltered = useMemo(() => {
    if (selectedCaseIds.length === 0) return dateFiltered;
    return dateFiltered.filter(e => selectedCaseIds.includes(e.caseId));
  }, [dateFiltered, selectedCaseIds]);

  // Process the filtered expenses into the required format
  const mainRows = expenseFiltered.map(expense => {
    const caseInfo = cases.find(c => c.id === expense.caseId);
    return [
      caseInfo?.name || '未知',
      formatDateForExport(expense.date),
      expense.type,
      expense.amount.toFixed(2), // Format to 2 decimal places
      expense.notes
    ];
  });

  // Sort by case name and date ascending
  mainRows.sort((a, b) => {
    const caseCmp = String(a[0]).localeCompare(String(b[0]));
    if (caseCmp !== 0) return caseCmp;
    return String(a[1]).localeCompare(String(b[1]));
  });

  // Create summary by case
  const caseSummary = new Map<string, number>();
  expenseFiltered.forEach(expense => {
    const caseName = cases.find(c => c.id === expense.caseId)?.name || '未知';
    caseSummary.set(caseName, (caseSummary.get(caseName) || 0) + expense.amount);
  });

  const summaryRows = Array.from(caseSummary.entries()).map(([caseName, total]) => (
    [caseName, '', '总计', total.toFixed(2), '']
  ));

  return { mainRows, summaryRows };
};
```

- [ ] **Step 2: Update the existing prepareData function to work with the new tab system**

Ensure the existing prepareData function still works correctly with the new tab system.

- [ ] **Step 3: Add helper functions if needed for date filtering of expenses**

Check if expenses use the same date format as entries and adjust filtering logic if needed.

- [ ] **Step 4: Verify the function compiles correctly**

Run the application to check for any TypeScript errors
Expected: No compilation errors

- [ ] **Step 5: Commit the changes**

```bash
git add App.tsx
git commit -m "feat: Add expense data preparation logic"
```

## Chunk 2: Implement Expense Records Tab Display

### Task 4: Implement the expense records tab UI

**Files:**
- Modify: `App.tsx:1348-1400`

- [ ] **Step 1: Create the UI for the expense records tab**

Replace the placeholder in the expense-records conditional with a similar structure to the time records display, but showing expense information:
```jsx
{activeTab === 'expense-records' && (
  <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 overflow-x-auto pb-1 custom-scrollbar">
      {/* Calculate expense statistics per case */}
      {statsForExpenses.map(s => (
        <Tooltip key={s.id} text={s.tooltipText}>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 h-full cursor-help min-w-0 transition-all hover:bg-amber-100 shadow-sm min-w-[120px]">
            <p className="text-[10px] text-amber-400 font-bold truncate tracking-tight mb-1">{s.name}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-black text-amber-700 tabular-nums">{s.total.toFixed(2)}</p>
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
    <div className="border border-gray-100 rounded-xl bg-white flex-grow overflow-y-auto custom-scrollbar shadow-sm">
      <table className="w-full text-left table-fixed border-collapse">
        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] sticky top-0 z-10 border-b border-gray-100 shadow-sm">
          <tr>
            <th className="px-4 py-3 w-[25%]">案件</th>
            <th className="px-4 py-3 w-[120px]">费用类型</th>
            <th className="px-4 py-3 w-[100px]">费用金额</th>
            <th className="px-4 py-3 w-[130px]">费用日期</th>
            <th className="px-4 py-3">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {expenseFiltered.map(expense => {
            const c = cases.find(i => i.id === expense.caseId);
            const tooltipText = (c ? (c.description || c.name) : '未知');
            return (
              <tr key={expense.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3 font-semibold min-w-0">
                  <Tooltip text={tooltipText} className="w-full">
                    <span className="cursor-help block truncate text-[12px] text-gray-700">{c?.name}</span>
                  </Tooltip>
                </td>
                <td className="px-4 py-3 truncate text-xs text-gray-500">{expense.type}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-600 text-xs">{expense.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{formatDate(expense.date)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={expense.notes}>{expense.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
)}
```

- [ ] **Step 2: Calculate expense statistics for the summary cards**

Create a statsForExpenses useMemo hook similar to the existing stats hook but for expenses:
```typescript
const statsForExpenses = useMemo(() => {
  const m = new Map<string, { total: number, name: string, tooltipText: string }>();
  expenseFiltered.forEach(e => {
    const caseInfo = cases.find(c => c.id === e.caseId);
    const key = e.caseId;
    if (m.has(key)) {
      m.get(key)!.total += e.amount;
    } else {
      m.set(key, {
        total: e.amount,
        name: caseInfo?.name || '未知',
        tooltipText: (caseInfo?.description || caseInfo?.name || '未知')
      });
    }
  });
  return Array.from(m.values());
}, [expenseFiltered, cases]);
```

- [ ] **Step 3: Update the expenseFiltered calculation to be compatible with both tabs**

Modify the expenseFiltered calculation to be accessible by the UI:
```typescript
const expenseFiltered = useMemo(() => {
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime() + 86400000;

  let dateFiltered = expenses.filter(item => {
    const itemDate = new Date(item.date).setHours(0, 0, 0, 0);
    return itemDate >= s && itemDate <= e;
  });

  if (selectedCaseIds.length === 0) return dateFiltered;
  return dateFiltered.filter(e => selectedCaseIds.includes(e.caseId));
}, [expenses, startDate, endDate, selectedCaseIds]);
```

- [ ] **Step 4: Run the application to verify the expense tab displays correctly**

Start the application and navigate to the expense records tab
Expected: Expense records display correctly in the table

- [ ] **Step 5: Commit the changes**

```bash
git add App.tsx
git commit -m "feat: Implement expense records tab UI"
```

### Task 5: Update export functionality for expense records

**Files:**
- Modify: `App.tsx:1177-1180`

- [ ] **Step 1: Create the handleExpenseXlsx function**

Add a new function to handle expense record export:
```typescript
const handleExpenseXlsx = () => {
  const { mainRows, summaryRows } = prepareExpenseData();
  const headers = ['案件名称', '费用日期', '费用类型', '费用金额', '备注'];
  downloadXlsx(headers, [...mainRows, [], ...summaryRows], `Chronos_费用报表_${formatFullTimestamp(Date.now())}.xlsx`);
};
```

- [ ] **Step 2: Update the export buttons to be conditional based on active tab**

Replace the current export buttons with conditional rendering:
```jsx
<div className="flex justify-between items-center shrink-0">
  <h3 className="text-lg font-bold text-gray-800">统计报表明细</h3>
  <div className="flex gap-2">
    {activeTab === 'time-records' && (
      <>
        <button onClick={handleCsv} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors">导出 CSV</button>
        <button onClick={handleXlsx} className="bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-800 shadow-sm transition-colors">导出 XLSX</button>
      </>
    )}
    {activeTab === 'expense-records' && (
      <button onClick={handleExpenseXlsx} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm transition-colors">导出费用报表</button>
    )}
  </div>
</div>
```

- [ ] **Step 3: Adjust the export function according to feature-expense.md specifications**

Update the handleExpenseXlsx function to match the specifications in feature-expense.md:
- Format amounts with thousand separators
- Proper date formatting
- Correct sorting
- Proper summary data

- [ ] **Step 4: Test the export functionality**

Run the application and test exporting expense records
Expected: XLSX file with proper format and data

- [ ] **Step 5: Commit the changes**

```bash
git add App.tsx
git commit -m "feat: Add export functionality for expense records"
```

## Chunk 3: Testing and Verification

### Task 6: Comprehensive testing

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Verify tab switching works correctly**

Switch between time records and expense records tabs and ensure each displays the correct information
Expected: Each tab shows its respective data correctly

- [ ] **Step 2: Verify filtering works for expense records**

Apply date and case filters on the expense records tab and verify the table updates correctly
Expected: Expense records are filtered according to the selected criteria

- [ ] **Step 3: Verify export works for expense records**

Export expense records and verify the generated XLSX file has correct format and data
Expected: XLSX file with correct headers and properly formatted expense data

- [ ] **Step 4: Verify existing functionality still works**

Test that the time records tab and its export functionality still work correctly
Expected: No regression in existing functionality

- [ ] **Step 5: Commit the verification results**

```bash
git add .
git commit -m "test: Verify export interface enhancement functionality"
```