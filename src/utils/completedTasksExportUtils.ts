import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface CompletedTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  completed_date: string;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  actual_cost: number;
}

export const generateCompletedTasksCSV = (
  completedTasks: CompletedTask[],
  reportDate: string
) => {
  const csv = [
    ['Task', 'Description', 'Property/Unit', 'Assigned To', 'Category', 'Priority', 'Completion Date', 'Estimated Cost', 'Actual Cost'],
    ...completedTasks.map(task => [
      task.title,
      task.description || '',
      task.unit_number ? `${task.property_address} - Unit ${task.unit_number}` : task.property_address,
      task.assigned_to_name || 'Unassigned',
      task.category,
      task.priority,
      format(new Date(task.completed_date), 'yyyy-MM-dd'),
      task.estimated_cost?.toString() || '0',
      task.actual_cost?.toString() || '0'
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `completed-tasks-report-${reportDate}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const generateCompletedTasksPDF = (
  completedTasks: CompletedTask[],
  reportDate: string
) => {
  const doc = new jsPDF('landscape');
  
  // Add title
  doc.setFontSize(18);
  doc.text('Completed Tasks Report', 14, 20);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Report Date: ${format(new Date(reportDate), 'MMM dd, yyyy')}`, 14, 28);
  
  // Calculate summary statistics
  const totalTasks = completedTasks.length;
  const totalEstimatedCost = completedTasks.reduce((sum, task) => sum + (task.estimated_cost || 0), 0);
  const totalActualCost = completedTasks.reduce((sum, task) => sum + (task.actual_cost || 0), 0);
  const costVariance = totalActualCost - totalEstimatedCost;
  const avgCost = totalTasks > 0 ? totalActualCost / totalTasks : 0;
  
  // Category breakdown
  const categoryBreakdown = completedTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = { count: 0, cost: 0 };
    }
    acc[task.category].count++;
    acc[task.category].cost += task.actual_cost || 0;
    return acc;
  }, {} as Record<string, { count: number; cost: number }>);
  
  // Priority breakdown
  const priorityBreakdown = completedTasks.reduce((acc, task) => {
    if (!acc[task.priority]) {
      acc[task.priority] = { count: 0, cost: 0 };
    }
    acc[task.priority].count++;
    acc[task.priority].cost += task.actual_cost || 0;
    return acc;
  }, {} as Record<string, { count: number; cost: number }>);
  
  // Add summary section
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary', 14, 38);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  let yPos = 45;
  doc.text(`Total Tasks Completed: ${totalTasks}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Estimated Cost: $${totalEstimatedCost.toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Actual Cost: $${totalActualCost.toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Cost Variance: ${costVariance >= 0 ? '+' : ''}$${costVariance.toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Average Cost per Task: $${avgCost.toFixed(2)}`, 14, yPos);
  yPos += 10;
  
  // Category breakdown
  doc.setFont(undefined, 'bold');
  doc.text('By Category:', 14, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 5;
  Object.entries(categoryBreakdown).forEach(([category, data]) => {
    doc.text(`  ${category}: ${data.count} tasks, $${data.cost.toLocaleString()}`, 14, yPos);
    yPos += 5;
  });
  yPos += 3;
  
  // Priority breakdown
  doc.setFont(undefined, 'bold');
  doc.text('By Priority:', 14, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 5;
  Object.entries(priorityBreakdown).forEach(([priority, data]) => {
    doc.text(`  ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${data.count} tasks, $${data.cost.toLocaleString()}`, 14, yPos);
    yPos += 5;
  });
  
  // Add tasks table
  const tableData = completedTasks.map(task => [
    task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title,
    task.unit_number ? `${task.property_address}\nUnit ${task.unit_number}` : task.property_address,
    task.assigned_to_name || 'Unassigned',
    task.category,
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
    format(new Date(task.completed_date), 'MM/dd/yyyy'),
    task.estimated_cost ? `$${task.estimated_cost.toLocaleString()}` : '-',
    task.actual_cost ? `$${task.actual_cost.toLocaleString()}` : '-'
  ]);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Task', 'Property', 'Assigned To', 'Category', 'Priority', 'Date', 'Est. Cost', 'Actual Cost']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 45 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 }
    },
    didParseCell: function(data) {
      // Color code priority column
      if (data.column.index === 4 && data.section === 'body') {
        const priority = data.cell.text[0].toLowerCase();
        if (priority === 'high') {
          data.cell.styles.fillColor = [254, 226, 226]; // red-100
          data.cell.styles.textColor = [153, 27, 27]; // red-800
        } else if (priority === 'medium') {
          data.cell.styles.fillColor = [254, 249, 195]; // yellow-100
          data.cell.styles.textColor = [133, 77, 14]; // yellow-800
        } else if (priority === 'low') {
          data.cell.styles.fillColor = [220, 252, 231]; // green-100
          data.cell.styles.textColor = [22, 101, 52]; // green-800
        }
      }
    }
  });
  
  // Save the PDF
  doc.save(`completed-tasks-report-${reportDate}.pdf`);
};
