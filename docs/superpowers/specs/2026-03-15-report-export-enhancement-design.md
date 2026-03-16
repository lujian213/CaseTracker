# 报表导出功能增强设计文档

## 需求概述

当前系统需要增强导出功能，使得在Excel文件中：

1. 对于同一个案件的相同日期，合并日期列的单元格
2. 增加"当日工作清单"列，内容为该案件在该日期的所有工作内容和时长的组合
3. 增加"当日总时长(小时)"列，为该案件在该日期的所有时长总和

## 设计目标

- 保持现有数据结构和大部分功能不变
- 增强数据准备逻辑以支持按案件+日期的分组
- 支持Excel单元格合并功能
- 确保新旧功能的兼容性

## 详细设计

### 1. 数据准备流程

#### 当前逻辑
```javascript
// 按案件ID|日期|工作内容|注释分组
const key = `${e.caseId}|${dateKey}|${mergedContent}|${e.notes}`;
```

#### 新逻辑
```javascript
// 按案件ID|日期分组
const dateGroupKey = `${e.caseId}|${dateKey}`;
// 按案件ID|日期|工作内容|注释分组（保持原有细节记录）
const detailKey = `${e.caseId}|${dateKey}|${mergedContent}|${e.notes}`;
```

### 2. 表头变更

- **原表头**: `['案件名称', '日期', '工作内容', '时长(小时)', '起止时间', '注释']`
- **新表头**: `['案件名称', '日期', '当日工作清单', '当日总时长(小时)', '工作内容', '时长(小时)', '起止时间', '注释']`

### 3. 数据聚合逻辑

#### 第一步：按案件+日期分组
```javascript
const dateGroups = new Map();
filtered.forEach(e => {
  const caseName = cases.find(c => c.id === e.caseId)?.name || '未知';
  const dateKey = formatDateForExport(e.startTime);
  const dateGroupKey = `${e.caseId}|${dateKey}`;

  if (!dateGroups.has(dateGroupKey)) {
    dateGroups.set(dateGroupKey, {
      caseName,
      date: dateKey,
      entries: []  // 存储该日期的所有原始条目
    });
  }
  dateGroups.get(dateGroupKey).entries.push(e);
});
```

#### 第二步：为每组计算汇总信息
```javascript
// 计算当日工作清单：由多个"{工作内容}({时长})"组成，中间以分号分割
const dailyWorkList = entries.map(entry => {
  const workContent = `${entry.workType} ${entry.workContent}`.trim();
  const duration = minutesToRoundedHours(entry.duration);
  return `${workContent}(${duration.toFixed(1)})`;
}).join('; ');

// 计算当日总时长
const dailyTotalHours = entries.reduce((sum, entry) => {
  return sum + minutesToRoundedHours(entry.duration);
}, 0);
```

#### 第三步：生成输出行
对于每组数据，生成多行输出：
- 第一行包含合并后的日期、当日工作清单、当日总时长
- 后续行日期等汇总字段为空（由Excel合并实现）

### 4. Excel单元格合并实现

利用xlsx库的合并功能，对于相同案件的相同日期行：

```javascript
// 假设相同案件相同日期有N行数据（从rowIndex开始）
const mergeRange = {
  s: { r: rowIndex, c: 1 }, // 开始位置：第rowIndex行，第1列（日期列）
  e: { r: rowIndex + N - 1, c: 1 }  // 结束位置：第rowIndex+N-1行，第1列
};

worksheet['!merges'] = worksheet['!merges'] || [];
worksheet['!merges'].push(mergeRange);
```

### 5. 数据排序

保持原有排序逻辑：按案件名称升序，然后按日期升序。

## 实现细节

### 函数重构

1. 修改`prepareData`函数的逻辑，引入两层分组
2. 添加辅助函数来处理单元格合并信息
3. 保持CSV和XLSX导出的一致性（虽然CSV不支持真正的单元格合并，但会在对应行留空以保持对齐）

### 单元格合并策略

- 只对Excel文件执行实际单元格合并
- CSV文件保持每行数据完整，但对不需要重复显示的字段使用空字符串填充
- 日期列和新增的两个汇总列进行合并处理

## 影响评估

### 正面影响
- 更清晰的报表展示，减少冗余信息
- 提供更丰富的汇总视图
- 保持了原始明细数据的可访问性

### 潜在风险
- 导出文件格式变化可能影响依赖该格式的外部工具
- Excel单元格合并可能会在某些特定情况下表现异常

## 测试策略

1. 验证数据准确性：确保合并后的数据与原始数据一致
2. 验证单元格合并：检查Excel中单元格合并是否正确
3. 验证不同场景：单个案件单日多记录、跨日期记录等
4. 验证性能：大数据量下的导出性能

## 回滚策略

如果新功能导致问题，可以通过回滚到之前的prepareData函数实现来恢复原有功能。