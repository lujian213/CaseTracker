# 报表导出功能增强 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强导出功能，在Excel文件中实现按案件和日期合并单元格，并添加"当日工作清单"和"当日总时长"列

**Architecture:** 修改现有的prepareData函数逻辑，引入按案件+日期的分组机制，保持原有数据完整性的同时增加汇总信息，利用Excel库的合并单元格功能实现视觉上的合并效果

**Tech Stack:** TypeScript, React, xlsx library

---

## Chunk 1: 修改prepareData函数逻辑

### Task 1: 重构prepareData函数以支持按案件+日期分组

**Files:**
- Modify: `App.tsx:522-588`

- [ ] **Step 1: 修改prepareData函数，添加按案件+日期分组逻辑**

在App.tsx文件的ReportGeneration组件中，重构prepareData函数，使其首先按案件ID和日期进行分组，然后再处理每组内的详细记录。

```typescript
const prepareData = () => {
  // 按案件ID和日期分组
  const dateGroups = new Map<string, {
    caseName: string,
    date: string,
    entries: TimeEntry[]
  }>();

  filtered.forEach(e => {
    const caseName = cases.find(c => c.id === e.caseId)?.name || '未知';
    const dateKey = formatDateForExport(e.startTime);
    const dateGroupKey = `${e.caseId}|${dateKey}`;

    if (!dateGroups.has(dateGroupKey)) {
      dateGroups.set(dateGroupKey, {
        caseName,
        date: dateKey,
        entries: []
      });
    }
    dateGroups.get(dateGroupKey).entries.push(e);
  });

  // 构建主数据行
  const mainRows: string[][] = [];

  Array.from(dateGroups.values()).forEach(group => {
    // 计算当日工作清单和总时长
    const dailyWorkList = group.entries.map(entry => {
      const workContent = `${entry.workType} ${entry.workContent}`.trim();
      const duration = minutesToRoundedHours(entry.duration);
      return `${workContent}(${duration.toFixed(1)})`;
    }).join('; ');

    const dailyTotalHours = group.entries.reduce((sum, entry) => {
      return sum + minutesToRoundedHours(entry.duration);
    }, 0);

    // 为组内的每条记录创建行
    group.entries.forEach((entry, idx) => {
      const workContent = `${entry.workType} ${entry.workContent}`.trim();
      const roundedHours = minutesToRoundedHours(entry.duration);

      // 只在第一行显示合并后的信息
      const row: string[] = [
        group.caseName,  // 案件名称
        idx === 0 ? group.date : '',  // 日期，只在第一行显示
        idx === 0 ? dailyWorkList : '',  // 当日工作清单，只在第一行显示
        idx === 0 ? dailyTotalHours.toFixed(1) : '',  // 当日总时长，只在第一行显示
        workContent,  // 工作内容
        roundedHours.toFixed(1),  // 时长(小时)
        entry.endTime ? `${formatDateTimeForExport(entry.startTime)} - ${formatDateTimeForExport(entry.endTime)}` : `${formatDateTimeForExport(entry.startTime)} - `,  // 起止时间
        entry.notes  // 注释
      ];
      mainRows.push(row);
    });
  });

  // 按案件名称和日期排序
  mainRows.sort((a, b) => {
    const caseCmp = String(a[0]).localeCompare(String(b[0]));
    if (caseCmp !== 0) return caseCmp;
    return String(a[1]).localeCompare(String(b[1])); // a[1]是日期列
  });

  // 摘要行暂时保留原有逻辑
  const caseSummary = new Map<string, number>();
  Array.from(dateGroups.values()).forEach(group => {
    const totalHours = group.entries.reduce((sum, entry) => {
      return sum + minutesToRoundedHours(entry.duration);
    }, 0);
    caseSummary.set(group.caseName, (caseSummary.get(group.caseName) || 0) + totalHours);
  });

  const summaryRows = Array.from(caseSummary.entries()).map(([caseName, hours]) => ([caseName, '', '', '', '', hours.toFixed(1), '', '总计']));

  return { mainRows, summaryRows };
};
```

- [ ] **Step 2: 更新表头定义**

修改headers数组，从原来的6列扩展为8列：
```typescript
const headers = ['案件名称', '日期', '当日工作清单', '当日总时长(小时)', '工作内容', '时长(小时)', '起止时间', '注释'];
```

- [ ] **Step 3: 更新handleCsv和handleXlsx函数以使用新表头和数据**

```typescript
const handleCsv = () => {
  const { mainRows, summaryRows } = prepareData();
  downloadCsv(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.csv`);
};

const handleXlsx = () => {
  const { mainRows, summaryRows } = prepareData();
  downloadXlsx(headers, [...mainRows, [], ...summaryRows], `Chronos_时间记录报表_${formatFullTimestamp(Date.now())}.xlsx`);
};
```

- [ ] **Step 4: 运行应用并验证基本功能**

启动应用，检查报表生成页面是否正常加载，无JavaScript错误。

- [ ] **Step 5: 提交更改**

```bash
git add App.tsx
git commit -m "feat: 修改prepareData函数以支持新的报表格式
- 按案件ID和日期分组数据
- 添加当日工作清单和当日总时长列
- 更新表头定义"
```