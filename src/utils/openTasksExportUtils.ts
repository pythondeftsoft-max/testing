import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface OpenTask {
  id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  submitted_date: string;
  due_date?: string;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  active_for: string;
}

const escapeCSV = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const generateOpenTasksCSV = (openTasks: OpenTask[], reportDate: string) => {
  const headers = [
    'Property/Unit',
    'Task ID',
    'Title',
    'Description',
    'Category',
    'Priority',
    'Status',
    'Created Date',
    'Due Date',
    'Active For',
    'Assigned To',
    'Estimated Cost'
  ];

  const rows = openTasks.map(task => [
    escapeCSV(`${task.property_address}${task.unit_number ? ` - Unit ${task.unit_number}` : ''}`),
    escapeCSV(task.task_id),
    escapeCSV(task.title),
    escapeCSV(task.description),
    escapeCSV(task.category),
    escapeCSV(task.priority),
    escapeCSV(task.status.replace('_', ' ')),
    escapeCSV(format(new Date(task.submitted_date), 'yyyy-MM-dd')),
    escapeCSV(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''),
    escapeCSV(task.active_for),
    escapeCSV(task.assigned_to_name || 'Unassigned'),
    escapeCSV(`$${task.estimated_cost.toFixed(2)}`)
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `open-tasks-report-${reportDate}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const generateOpenTasksPDF = (openTasks: OpenTask[], reportDate: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Open Tasks Report', 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${reportDate}`, 14, 22);

  // Calculate summary statistics
  const totalTasks = openTasks.length;
  const pendingTasks = openTasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = openTasks.filter(t => t.status === 'in_progress').length;
  const highPriority = openTasks.filter(t => t.priority === 'high').length;
  const mediumPriority = openTasks.filter(t => t.priority === 'medium').length;
  const lowPriority = openTasks.filter(t => t.priority === 'low').length;
  const overdueTasks = openTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length;
  const totalEstimatedCost = openTasks.reduce((sum, task) => sum + task.estimated_cost, 0);

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  openTasks.forEach(task => {
    categoryBreakdown[task.category] = (categoryBreakdown[task.category] || 0) + 1;
  });

  // Summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 32);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let yPos = 38;
  
  doc.text(`Total Open Tasks: ${totalTasks}`, 14, yPos);
  yPos += 5;
  doc.text(`By Status: Pending (${pendingTasks}), In Progress (${inProgressTasks})`, 14, yPos);
  yPos += 5;
  doc.text(`By Priority: High (${highPriority}), Medium (${mediumPriority}), Low (${lowPriority})`, 14, yPos);
  yPos += 5;
  doc.text(`Overdue Tasks: ${overdueTasks}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Estimated Cost: $${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
  yPos += 5;
  
  // Category breakdown
  const categoryText = Object.entries(categoryBreakdown)
    .map(([cat, count]) => `${cat} (${count})`)
    .join(', ');
  doc.text(`By Category: ${categoryText}`, 14, yPos);
  yPos += 10;

  // Prepare table data
  const tableData = openTasks.map(task => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const dueDateText = task.due_date 
      ? format(new Date(task.due_date), 'MMM dd, yyyy') + (isOverdue ? ' (OVERDUE)' : '')
      : '-';

    return [
      `${task.property_address}${task.unit_number ? ` - Unit ${task.unit_number}` : ''}`,
      task.task_id,
      task.title.length > 25 ? task.title.substring(0, 22) + '...' : task.title,
      task.category,
      task.priority,
      task.status.replace('_', ' '),
      format(new Date(task.submitted_date), 'MMM dd, yyyy'),
      dueDateText,
      task.active_for,
      task.assigned_to_name || 'Unassigned',
      `$${task.estimated_cost.toFixed(2)}`
    ];
  });

  // Generate table
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Property/Unit',
      'Task ID',
      'Task Title',
      'Category',
      'Priority',
      'Status',
      'Created',
      'Due Date',
      'Active For',
      'Assigned To',
      'Est. Cost'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { cellWidth: 25 },
      8: { cellWidth: 18 },
      9: { cellWidth: 25 },
      10: { cellWidth: 18, halign: 'right' }
    },
    didParseCell: (data) => {
      // Color code priority column
      if (data.column.index === 4 && data.section === 'body') {
        const priority = data.cell.text[0]?.toLowerCase();
        if (priority === 'high') {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
        } else if (priority === 'medium') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
        } else if (priority === 'low') {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
      
      // Color code status column
      if (data.column.index === 5 && data.section === 'body') {
        const status = data.cell.text[0]?.toLowerCase();
        if (status === 'pending') {
          data.cell.styles.fillColor = [255, 237, 213];
          data.cell.styles.textColor = [194, 65, 12];
        } else if (status.includes('progress')) {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.textColor = [30, 64, 175];
        }
      }
      
      // Highlight overdue dates
      if (data.column.index === 7 && data.section === 'body') {
        const cellText = data.cell.text[0];
        if (cellText && cellText.includes('OVERDUE')) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // Save the PDF
  doc.save(`open-tasks-report-${reportDate}.pdf`);
};
