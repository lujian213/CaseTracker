import React, { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartData[];
  title: string;
  formatter?: (value: number) => string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, formatter = (v) => v.toString() }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const formatterRef = useRef(formatter);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 过滤掉值为0的数据
    const filteredData = data.filter(d => d.value > 0);
    if (filteredData.length === 0) return;

    // 截断图例文字（最多18字符）
    const truncateLabel = (name: string) => name.length > 18 ? name.substring(0, 16) + '...' : name;

    // 保存 formatter 到 ref，供 tooltip 使用
    formatterRef.current = formatter;

    chartRef.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: filteredData.map(d => truncateLabel(d.name)),
        datasets: [{
          data: filteredData.map(d => d.value),
          backgroundColor: filteredData.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 8,
              font: { size: 11 }
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                const item = filteredData[context.dataIndex];
                const total = filteredData.reduce((sum, d) => sum + d.value, 0);
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                const name = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
                return `${name}: ${formatterRef.current(item.value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]); // formatter 只影响 tooltip 显示，不加入依赖

  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative rounded-xl items-center">
      <h4 className="text-xs font-bold text-gray-600 absolute -top-2.5 left-3 bg-white px-1">{title}</h4>
      <div className="h-44 w-full flex items-center justify-center">
        <canvas ref={canvasRef} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default PieChart;