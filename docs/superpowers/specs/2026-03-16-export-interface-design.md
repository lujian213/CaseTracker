# Export Interface Enhancement Design

## Overview
Enhance the export functionality in the CaseTracker application by adding a new "费用记录明细" (Expense Record Details) tab in the statistics report section. This will complement the existing "时间记录明细" (Time Record Details) tab with dedicated expense reporting capabilities.

## Requirements
- Add a new tab "费用记录明细" next to existing "时间记录明细" tab in statistics report interface
- The new tab should display expense records similar to how time records are displayed
- Include export functionality for expense records in XLSX format only
- Maintain consistent UI/UX with existing report generation component
- Do not modify existing export functionality

## Design Specification

### 1. Component Architecture
```
ReportGeneration (main component)
├── TabNavigation
│   ├── "时间记录明细" tab (existing)
│   └── "费用记录明细" tab (new)
├── TimeRecordTab (existing functionality)
└── ExpenseRecordTab (new component)
```

### 2. Updated Component Signature
The ReportGeneration component needs to be updated to accept the expenses prop:
```typescript
const ReportGeneration: React.FC<{
  cases: Case[];
  entries: TimeEntry[];
  expenses: ExpenseEntry[];
}> = ({ cases, entries, expenses }) => {
```

### 3. Tab State Management
Implement tab state management with:
```typescript
type ReportTab = 'time-records' | 'expense-records';
const [activeTab, setActiveTab] = useState<ReportTab>('time-records');
```

### 4. ExpenseRecordTab Component
- Date range filtering (start date, end date)
- Case selection with multi-select capability
- Expense record table display
- Export button for XLSX format
- Sorting and filtering controls consistent with existing UI

### 5. UI Layout
- Header with date range selectors
- Case filtering section with "全部案件" option
- Statistics summary section
- Main table showing expense records
- Export button group

### 6. Data Structure
- Columns: 案件名称 (case name), 费用日期 (expense date), 费用类型 (expense type), 费用金额 (amount), 备注 (notes)
- Data sourced from `expenses` state array filtered by date range and selected cases
- Sorting by case name and date in ascending order
- Share same date filtering and case selection with time records tab

### 7. Export Functionality
```typescript
const handleExpenseXlsx = () => {
  try {
    // Prepare expense data according to export specifications
    const expenseData = prepareExpenseData(); // This function needs to be implemented
    downloadXlsx(
      ['案件名称', '费用日期', '费用类型', '费用金额', '备注'],
      expenseData,
      `Chronos_费用报表_${formatFullTimestamp(Date.now())}.xlsx`
    );
  } catch (error) {
    console.error('Failed to export expense data:', error);
    alert('导出费用记录失败，请重试。');
  }
};
```

### 8. Implementation Approach
- Update ReportGeneration component signature to include expenses prop
- Implement tab navigation system in ReportGeneration
- Create new ExpenseRecordTab component based on existing ReportGeneration structure
- Reuse existing UI patterns and styling for consistency
- Add export-specific logic for expense data processing
- Ensure proper error handling and validation
- Implement shared filtering functionality that works for both time and expense records

## Technical Considerations
- Update ReportGeneration component to accept expenses prop
- Implement proper tab state management using useState
- Ensure both tabs share the same date filtering and case selection functionality
- Leverage existing date formatting utilities
- Apply same security and validation measures as existing functionality
- Maintain responsive design compatibility
- Follow existing error handling patterns
- Implement proper memoization for performance with large datasets
- Consider virtual scrolling for large datasets if needed

## Performance Considerations
- Use useMemo for expensive filtering and sorting operations
- Share common filtering logic between time and expense records
- Optimize rendering for large numbers of records

## Dependencies
- Expenses state from main App component
- Date formatting utilities from utils.ts
- Existing styling classes and UI components
- XLSX export functionality from utils.ts

## Testing Considerations
- Verify expense data displays correctly in table
- Confirm export functionality produces correctly formatted XLSX
- Test date filtering accuracy
- Validate case selection behavior
- Check export filename format
- Ensure UI responsiveness across devices