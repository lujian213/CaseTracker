# Expense Management Feature Test Cases

## Test Cases for Expense Management Implementation

### 1. Main Interface "添加费用" Entry Point
- [x] Verify that each case row in the dashboard displays an "添加费用" button
- [x] Clicking the "添加费用" button opens a modal form
- [x] Modal form includes: expense date (defaults to today), expense type dropdown, amount input, notes field
- [x] Expense date can be changed via date picker
- [x] Expense type dropdown populated from expenseTypes list
- [x] Amount input only accepts positive numbers
- [x] Notes field is optional
- [x] Form validates inputs before submission
- [x] Form saves expense record to state and localStorage when submitted
- [x] Form closes after successful submission
- [x] Cancel button closes the form without saving

### 2. Expense Type Management Interface
- [x] Verify the "类型管理" section now has two tabs: "工作类型" and "费用类型"
- [x] "费用类型" tab displays list of expense types with reorder arrows and delete buttons
- [x] Can add new expense types via the input field
- [x] Can delete expense types with confirmation dialog
- [x] Can reorder expense types using up/down arrows
- [x] Changes to expense types are reflected in the main interface

### 3. Expense Management Interface in Admin Panel
- [x] "费用管理" button appears in admin navigation sidebar
- [x] Clicking "费用管理" shows expense management interface
- [x] Interface includes case selection dropdown (with "所有案件" option)
- [x] "手动添加" button opens form to add new expenses
- [x] Expense records table displays: case name, expense date, expense type, amount, notes
- [x] Table supports sorting by case, date, type, and amount
- [x] Each record has an "编辑" button to modify the record
- [x] Batch selection and deletion functionality works
- [x] Manual add form pre-fills case if one is selected in the dropdown
- [x] Manual add form has all required fields (case, date, type, amount, notes)
- [x] Table font styling matches RecordManagement component
- [x] Expense amount display does not include currency symbol

### 4. Data Persistence
- [x] Expense records are saved to localStorage
- [x] Expense types are saved to localStorage
- [x] Data persists after page refresh
- [x] Data integrity maintained across application states

### 5. Export Functionality
- [x] "统计报表" section has "费用记录明细" tab
- [x] Tab displays expense records in a table format
- [x] Export functionality works for expense records
- [x] Exported files contain all required expense information

### 6. Integration
- [x] All components properly integrate with existing app architecture
- [x] No console errors during normal operation
- [x] Performance remains acceptable with reasonable amounts of data
- [x] UI maintains consistency with existing application design

### 7. Error Handling
- [x] Proper validation of input data
- [x] Meaningful error messages when validation fails
- [x] Graceful handling of edge cases (empty data, invalid dates, etc.)
- [x] Confirmation dialogs for destructive operations

### 8. Edge Cases
- [x] Adding expenses without any cases created
- [x] Working with empty expense lists
- [x] Maximum length validation for text fields
- [x] Decimal precision handling for amount field
- [x] Date range validation