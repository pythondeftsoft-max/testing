import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';

interface WorkOrder {
  id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  created_at: string;
  due_date: string | null;
  completed_date: string | null;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  actual_cost: number;
}

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'new': 'New',
  'pending': 'Pending',
  'in_progress': 'In Progress',
  'completed': 'Completed',
  'deferred': 'Deferred',
  'closed': 'Closed'
};

const escapeCSV = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const generateWorkOrdersCSV = (workOrders: WorkOrder[], reportDate: string) => {
  const headers = [
    'Work Order ID',
    'Property/Unit',
    'Title',
    'Description',
    'Category',
    'Status',
    'Priority',
    'Assigned To',
    'Submitted Date',
    'Due Date',
    'Completed Date',
    'Est. Cost',
    'Actual Cost'
  ];

  const rows = workOrders.map(order => [
    escapeCSV(order.task_id),
    escapeCSV(order.property_address + (order.unit_number ? ` Unit ${order.unit_number}` : '')),
    escapeCSV(order.title),
    escapeCSV(order.description),
    escapeCSV(CATEGORY_DISPLAY_NAMES[order.category] || order.category),
    escapeCSV(STATUS_DISPLAY_NAMES[order.status] || order.status),
    escapeCSV(order.priority.charAt(0).toUpperCase() + order.priority.slice(1)),
    escapeCSV(order.assigned_to_name || 'Unassigned'),
    escapeCSV(format(new Date(order.created_at), 'yyyy-MM-dd')),
    escapeCSV(order.due_date ? format(new Date(order.due_date), 'yyyy-MM-dd') : ''),
    escapeCSV(order.completed_date ? format(new Date(order.completed_date), 'yyyy-MM-dd') : ''),
    escapeCSV(order.estimated_cost?.toFixed(2) || '0.00'),
    escapeCSV(order.actual_cost?.toFixed(2) || '0.00')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `work-orders-report-${reportDate}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const generateWorkOrdersPDF = (workOrders: WorkOrder[], reportDate: string) => {
  const doc = new jsPDF('landscape');

  // Title
  doc.setFontSize(18);
  doc.text('Work Orders Report', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 28);

  // Calculate summary statistics
  const totalWorkOrders = workOrders.length;
  
  const statusBreakdown = workOrders.reduce((acc, order) => {
    const status = order.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityBreakdown = workOrders.reduce((acc, order) => {
    acc[order.priority] = (acc[order.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryBreakdown = workOrders.reduce((acc, order) => {
    const categoryName = CATEGORY_DISPLAY_NAMES[order.category] || order.category;
    acc[categoryName] = (acc[categoryName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEstimatedCost = workOrders.reduce((sum, order) => sum + (order.estimated_cost || 0), 0);
  const totalActualCost = workOrders.reduce((sum, order) => sum + (order.actual_cost || 0), 0);
  const costVariance = totalEstimatedCost - totalActualCost;
  const averageCost = totalEstimatedCost / totalWorkOrders;

  const today = new Date();
  const overdueCount = workOrders.filter(order => 
    order.due_date && 
    new Date(order.due_date) < today && 
    !['completed', 'closed'].includes(order.status)
  ).length;

  // Summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 38);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 45;
  const summaryItems = [
    `Total Work Orders: ${totalWorkOrders}`,
    `Status - ${Object.entries(statusBreakdown).map(([status, count]) => 
      `${STATUS_DISPLAY_NAMES[status] || status}: ${count}`).join(', ')}`,
    `Priority - High: ${priorityBreakdown.high || 0}, Medium: ${priorityBreakdown.medium || 0}, Low: ${priorityBreakdown.low || 0}`,
    `Overdue Tasks: ${overdueCount}`,
    `Total Estimated Cost: $${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Total Actual Cost: $${totalActualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Cost Variance: $${costVariance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Average Cost: $${averageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ];

  summaryItems.forEach(item => {
    doc.text(item, 14, yPos);
    yPos += 5;
  });

  // Top categories
  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  if (topCategories.length > 0) {
    doc.text(`Top Categories: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}`, 14, yPos);
    yPos += 8;
  }

  // Table data
  const tableData = workOrders.map(order => {
    const isOverdue = order.due_date && 
      new Date(order.due_date) < today && 
      !['completed', 'closed'].includes(order.status);

    return [
      order.task_id,
      order.property_address + (order.unit_number ? `\nUnit ${order.unit_number}` : ''),
      order.title.length > 30 ? order.title.substring(0, 27) + '...' : order.title,
      CATEGORY_DISPLAY_NAMES[order.category] || order.category,
      STATUS_DISPLAY_NAMES[order.status] || order.status,
      order.priority.charAt(0).toUpperCase() + order.priority.slice(1),
      order.assigned_to_name || 'Unassigned',
      format(new Date(order.created_at), 'MMM dd, yyyy'),
      order.due_date ? format(new Date(order.due_date), 'MMM dd, yyyy') + (isOverdue ? '\n(OVERDUE)' : '') : '-',
      order.estimated_cost ? `$${order.estimated_cost.toLocaleString()}` : '-',
      order.actual_cost ? `$${order.actual_cost.toLocaleString()}` : '-'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      'WO ID',
      'Property/Unit',
      'Title',
      'Category',
      'Status',
      'Priority',
      'Assigned To',
      'Submitted',
      'Due Date',
      'Est. Cost',
      'Actual Cost'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
      6: { cellWidth: 25 },
      7: { cellWidth: 22 },
      8: { cellWidth: 25 },
      9: { cellWidth: 20 },
      10: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      const colIndex = data.column.index;
      
      if (data.section === 'body' && workOrders[rowIndex]) {
        const order = workOrders[rowIndex];
        
        // Priority coloring
        if (colIndex === 5) {
          if (order.priority === 'high') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [127, 29, 29];
          } else if (order.priority === 'medium') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [120, 53, 15];
          } else if (order.priority === 'low') {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
        
        // Status coloring
        if (colIndex === 4) {
          const status = order.status;
          if (status === 'new') {
            data.cell.styles.fillColor = [219, 234, 254];
            data.cell.styles.textColor = [30, 64, 175];
          } else if (status === 'pending') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [120, 53, 15];
          } else if (status === 'in_progress') {
            data.cell.styles.fillColor = [254, 215, 170];
            data.cell.styles.textColor = [154, 52, 18];
          } else if (status === 'completed') {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
          } else if (status === 'deferred') {
            data.cell.styles.fillColor = [243, 232, 255];
            data.cell.styles.textColor = [107, 33, 168];
          } else if (status === 'closed') {
            data.cell.styles.fillColor = [243, 244, 246];
            data.cell.styles.textColor = [75, 85, 99];
          }
        }
        
        // Overdue date highlighting
        if (colIndex === 8) {
          const isOverdue = order.due_date && 
            new Date(order.due_date) < today && 
            !['completed', 'closed'].includes(order.status);
          
          if (isOverdue) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  doc.save(`work-orders-report-${reportDate}.pdf`);
};
