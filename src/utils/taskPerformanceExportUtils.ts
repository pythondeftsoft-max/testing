import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';

export interface TaskDetail {
  id: string;
  task_id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  due_date: string | null;
  completed_date: string | null;
  property_address: string;
  unit_number?: string;
  assigned_to_name: string;
  estimated_cost: number;
  actual_cost: number;
  completion_time_days: number | null;
  is_overdue: boolean;
  days_overdue: number | null;
}

export interface VendorPerformance {
  vendorName: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  onTimeRate: number;
  totalCost: number;
  avgCostPerTask: number;
}

export interface PerformanceData {
  taskDetails: TaskDetail[];
  vendorPerformance: VendorPerformance[];
}

export const generateTaskPerformanceCSV = (taskDetails: TaskDetail[], reportDate: string): void => {
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvData = [
    ['Task ID', 'Property', 'Title', 'Category', 'Priority', 'Assigned To', 'Completion Time (Days)', 'Cost'],
    ...taskDetails.map(task => [
      escapeCSV(task.task_id),
      escapeCSV(task.property_address + (task.unit_number ? ` Unit ${task.unit_number}` : '')),
      escapeCSV(task.title),
      escapeCSV(CATEGORY_DISPLAY_NAMES[task.category] || task.category),
      escapeCSV(task.priority),
      escapeCSV(task.assigned_to_name),
      escapeCSV(task.completion_time_days),
      escapeCSV(task.actual_cost)
    ])
  ];

  const csv = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `task-performance-report-${reportDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateTaskPerformancePDF = (performanceData: PerformanceData, reportDate: string): void => {
  const doc = new jsPDF('landscape');
  
  // Calculate overall statistics
  const totalTasks = performanceData.taskDetails.length;
  const avgCompletionTime = totalTasks > 0
    ? performanceData.taskDetails.reduce((sum, task) => sum + (task.completion_time_days || 0), 0) / totalTasks
    : 0;
  const totalCost = performanceData.taskDetails.reduce((sum, task) => sum + task.actual_cost, 0);
  const avgCost = totalTasks > 0 ? totalCost / totalTasks : 0;
  
  // Calculate on-time rate from vendor data
  const totalVendorTasks = performanceData.vendorPerformance.reduce((sum, v) => sum + v.tasksCompleted, 0);
  const weightedOnTimeRate = totalVendorTasks > 0
    ? performanceData.vendorPerformance.reduce((sum, v) => sum + (v.onTimeRate * v.tasksCompleted), 0) / totalVendorTasks
    : 0;

  // Title
  doc.setFontSize(18);
  doc.text('Task Performance Report', 14, 15);
  
  doc.setFontSize(10);
  doc.text(`Report Date: ${reportDate}`, 14, 22);

  // Overall Statistics
  doc.setFontSize(12);
  doc.text('Overall Statistics', 14, 32);
  
  doc.setFontSize(9);
  const stats = [
    `Total Tasks: ${totalTasks}`,
    `Average Completion Time: ${avgCompletionTime.toFixed(1)} days`,
    `Overall On-Time Rate: ${weightedOnTimeRate.toFixed(1)}%`,
    `Total Cost: $${totalCost.toLocaleString()}`,
    `Average Cost Per Task: $${avgCost.toLocaleString()}`
  ];
  
  let yPos = 38;
  stats.forEach(stat => {
    doc.text(stat, 14, yPos);
    yPos += 5;
  });

  // Vendor Highlights (if available)
  if (performanceData.vendorPerformance.length > 0) {
    const bestOnTimeVendor = performanceData.vendorPerformance.reduce((best, v) => 
      v.onTimeRate > best.onTimeRate ? v : best
    );
    const fastestVendor = performanceData.vendorPerformance.reduce((fastest, v) => 
      v.avgCompletionTime < fastest.avgCompletionTime ? v : fastest
    );
    const costEffectiveVendor = performanceData.vendorPerformance.reduce((best, v) => 
      v.avgCostPerTask < best.avgCostPerTask ? v : best
    );

    yPos += 5;
    doc.setFontSize(12);
    doc.text('Vendor Highlights', 14, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    const highlights = [
      `Best On-Time Rate: ${bestOnTimeVendor.vendorName} (${bestOnTimeVendor.onTimeRate.toFixed(1)}%)`,
      `Fastest Completion: ${fastestVendor.vendorName} (${fastestVendor.avgCompletionTime.toFixed(1)} days)`,
      `Most Cost-Effective: ${costEffectiveVendor.vendorName} ($${costEffectiveVendor.avgCostPerTask.toLocaleString()})`
    ];
    
    highlights.forEach(highlight => {
      doc.text(highlight, 14, yPos);
      yPos += 5;
    });
  }

  // Task Details Table
  yPos += 10;
  doc.setFontSize(12);
  doc.text('Task Details', 14, yPos);
  
  const taskTableData = performanceData.taskDetails.map(task => {
    const property = task.property_address + (task.unit_number ? ` Unit ${task.unit_number}` : '');
    const title = task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title;
    
    return [
      task.task_id,
      property,
      title,
      CATEGORY_DISPLAY_NAMES[task.category] || task.category,
      task.priority,
      task.assigned_to_name,
      task.completion_time_days !== null ? `${task.completion_time_days} days` : '-',
      task.actual_cost > 0 ? `$${task.actual_cost.toLocaleString()}` : '-'
    ];
  });

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Task ID', 'Property/Unit', 'Title', 'Category', 'Priority', 'Assigned To', 'Time', 'Cost']],
    body: taskTableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
      5: { cellWidth: 35 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 }
    },
    didDrawCell: (data) => {
      // Color code priority column
      if (data.column.index === 4 && data.section === 'body') {
        const priority = performanceData.taskDetails[data.row.index].priority;
        if (priority === 'high') {
          doc.setFillColor(254, 226, 226);
        } else if (priority === 'medium') {
          doc.setFillColor(254, 243, 199);
        } else if (priority === 'low') {
          doc.setFillColor(220, 252, 231);
        }
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(data.cell.text[0], data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, {
          baseline: 'middle'
        });
      }
      
      // Red text for overdue tasks in completion time column
      if (data.column.index === 6 && data.section === 'body') {
        const isOverdue = performanceData.taskDetails[data.row.index].is_overdue;
        if (isOverdue) {
          doc.setTextColor(220, 38, 38);
          doc.setFont(undefined, 'bold');
        }
      }
    },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Vendor Performance Table
  if (performanceData.vendorPerformance.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 5;
    
    // Add new page if needed
    if (finalY > 160) {
      doc.addPage();
      yPos = 15;
    } else {
      yPos = finalY + 15;
    }
    
    doc.setFontSize(12);
    doc.text('Vendor Performance', 14, yPos);
    
    const vendorTableData = performanceData.vendorPerformance.map(vendor => [
      vendor.vendorName,
      vendor.tasksCompleted.toString(),
      `${vendor.avgCompletionTime.toFixed(1)} days`,
      `${vendor.onTimeRate.toFixed(1)}%`,
      `$${vendor.totalCost.toLocaleString()}`,
      `$${vendor.avgCostPerTask.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Vendor', 'Tasks', 'Avg Time', 'On-Time Rate', 'Total Cost', 'Avg Cost/Task']],
      body: vendorTableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 }
      },
      didDrawCell: (data) => {
        // Color code on-time rate column
        if (data.column.index === 3 && data.section === 'body') {
          const onTimeRate = performanceData.vendorPerformance[data.row.index].onTimeRate;
          if (onTimeRate >= 90) {
            doc.setFillColor(220, 252, 231);
          } else if (onTimeRate >= 70) {
            doc.setFillColor(254, 243, 199);
          } else {
            doc.setFillColor(254, 226, 226);
          }
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(0, 0, 0);
          doc.text(data.cell.text[0], data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, {
            baseline: 'middle'
          });
        }
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }

  doc.save(`task-performance-report-${reportDate}.pdf`);
};
