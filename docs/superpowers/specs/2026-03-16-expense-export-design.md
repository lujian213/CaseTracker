# 费用报表导出功能设计文档

## 1. 概述

本文档描述了费用报表导出功能的设计方案，包括界面入口和导出内容的详细规范。此功能将在统计报表界面中添加费用记录明细tab，并实现费用报表的导出功能。

## 2. 需求分析

### 2.1 功能需求
- 在统计报表界面中添加"费用记录明细"tab
- 实现费用报表按日期范围和案件筛选
- 支持费用报表导出为Excel(XLSX)格式
- 导出内容包括明细和汇总两部分
- 费用金额使用千分位分隔符显示

### 2.2 非功能需求
- 界面与现有时间记录报表保持一致
- 数据处理性能良好
- 错误处理机制健全

## 3. 界面设计

### 3.1 Tab设计
- "时间记录明细"和"费用记录明细"两个标签页并列显示
- 当前激活的tab有视觉高亮效果
- 筛选区域和导出按钮与当前激活的tab关联

### 3.2 筛选组件
- 日期筛选：起始日期和截止日期选择器
- 案件筛选：多选案件筛选器，与当前日期范围内的数据联动
- 筛选组件对两个tab通用

### 3.3 表格设计
- 表头：案件名称（左对齐）、费用日期（左对齐）、费用类型（左对齐）、费用金额（右对齐）、备注（左对齐）
- 表格内容根据当前tab显示相应的数据
- 支持数据排序功能

## 4. 数据处理流程

### 4.1 费用数据筛选
```javascript
// 算法伪代码
function filterExpenseData(startDate, endDate, selectedCaseIds) {
  // 按日期范围筛选
  const dateFiltered = expenses.filter(e =>
    e.date >= startDate.getTime() && e.date <= endDate.getTime()
  );

  // 按案件筛选
  if (selectedCaseIds.length > 0) {
    return dateFiltered.filter(e => selectedCaseIds.includes(e.caseId));
  }

  return dateFiltered;
}
```

### 4.2 数据排序
- 按案件名称升序排列
- 案件内按日期升序排列

### 4.3 数据格式化
- 日期格式：yyyy/MM/dd
- 金额格式：使用千分位分隔符，保留两位小数

## 5. 导出内容结构

### 5.1 Excel文件结构
- 文件名格式：`Chronos_费用报表_YYYYMMDD_HHmmss.xlsx`
- Sheet名称：费用记录明细

### 5.2 明细部分
- 表头：['案件名称', '费用日期', '费用类型', '费用金额', '备注']
- 数据行：对应字段的实际数据
- 按案件名称和日期升序排列

### 5.3 汇总部分
- 在明细数据后空一行
- 每个案件一行汇总数据
- 列内容：[案件名称, '总计', '', 费用总金额, '']

## 6. 实现方案

### 6.1 组件结构
```
ReportGeneration (主组件)
├── FilterSection (筛选组件)
│   ├── DateFilter (日期筛选)
│   └── CaseFilter (案件筛选)
├── TabNavigation (tab导航)
├── TimeRecordTab (时间记录明细tab)
├── ExpenseRecordTab (费用记录明细tab)
└── ExportButtons (导出按钮集合)
```

### 6.2 状态管理
- activeTab: 控制当前激活的tab
- startDate/endDate: 筛选日期范围
- selectedCaseIds: 选中的案件ID数组
- filteredExpenses: 筛选后的费用数据

### 6.3 核心函数
- `prepareExpenseData()`: 准备费用报表导出数据
- `handleExpenseExport()`: 处理费用报表导出逻辑
- `filterExpenses()`: 费用数据筛选函数

## 7. 错误处理

### 7.1 数据验证
- 验证日期范围的有效性
- 验证金额字段的正数要求

### 7.2 边界情况处理
- 空数据集处理
- 筛选结果为空时的用户提示

## 8. 测试策略

### 8.1 单元测试
- 数据准备函数的正确性测试
- 金额格式化函数测试
- 筛选逻辑测试

### 8.2 集成测试
- Tab切换功能测试
- 导出功能端到端测试

## 9. 性能考虑

- 使用useMemo优化数据筛选和处理
- 避免不必要的重渲染
- Excel导出时的数据分批处理（如有大量数据）

## 10. 用户体验

- 保持与现有报表界面一致的UI/UX
- 明确的加载状态指示
- 清晰的错误提示信息