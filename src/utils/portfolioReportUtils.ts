import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Portfolio Performance Report
export const generatePortfolioPerformancePDF = async (
  portfolioId: string, 
  portfolioName: string,
  startDate: string, 
  endDate: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Portfolio Performance Report', 20, 30);
  doc.setFontSize(12);
  doc.text(`Portfolio: ${portfolioName}`, 20, 45);
  doc.text(`Period: ${startDate} to ${endDate}`, 20, 55);
  
  try {
    // Fetch portfolio metrics
    const { data: properties } = await supabase
      .from('properties')
      .select('*, rent_payments(*), maintenance_requests(*)')
      .eq('portfolio_id', portfolioId);

    if (properties) {
      const totalUnits = properties.length;
      const occupiedUnits = properties.filter(p => p.status === 'occupied').length;
      const vacancyRate = ((totalUnits - occupiedUnits) / totalUnits * 100) || 0;
      const totalRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);

      // Performance metrics
      doc.setFontSize(16);
      doc.text('Key Performance Indicators', 20, 80);
      doc.setFontSize(11);
      
      const metrics = [
        ['Total Units', totalUnits.toString()],
        ['Occupied Units', occupiedUnits.toString()],
        ['Vacancy Rate', `${vacancyRate.toFixed(1)}%`],
        ['Total Monthly Rent', `$${totalRent.toLocaleString()}`],
        ['Average Rent per Unit', `$${(totalRent / totalUnits).toFixed(0)}`]
      ];

      let y = 100;
      metrics.forEach(([label, value]) => {
        doc.text(`${label}:`, 30, y);
        doc.text(value, 150, y);
        y += 15;
      });
    }
    
  } catch (error) {
    console.error('Error generating portfolio performance PDF:', error);
    doc.text('Error loading portfolio data', 20, 100);
  }

  doc.save(`portfolio-performance-${portfolioName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Collections & Delinquency Report
export const generateCollectionsDelinquencyPDF = async (
  portfolioId: string,
  portfolioName: string, 
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Collections & Delinquency Report', 20, 30);
  doc.setFontSize(12);
  doc.text(`Portfolio: ${portfolioName}`, 20, 45);
  doc.text(`Period: ${startDate} to ${endDate}`, 20, 55);

  try {
    // Fetch rent payment data
    const { data: rentData } = await supabase
      .from('rent_payments')
      .select(`
        *,
        properties!inner(portfolio_id, address, monthly_rent)
      `)
      .eq('properties.portfolio_id', portfolioId)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (rentData) {
      const totalPayments = rentData.length;
      const onTimePayments = rentData.filter(r => r.days_late === 0).length;
      const latePayments = rentData.filter(r => r.days_late > 0).length;
      const totalLateFees = rentData.reduce((sum, r) => sum + (r.late_fee_amount || 0), 0);
      const onTimeRate = (onTimePayments / totalPayments * 100) || 0;

      doc.setFontSize(16);
      doc.text('Collection Metrics', 20, 80);
      doc.setFontSize(11);
      
      const metrics = [
        ['Total Payments', totalPayments.toString()],
        ['On-Time Payments', onTimePayments.toString()],
        ['Late Payments', latePayments.toString()],
        ['On-Time Payment Rate', `${onTimeRate.toFixed(1)}%`],
        ['Total Late Fees Collected', `$${totalLateFees.toLocaleString()}`]
      ];

      let y = 100;
      metrics.forEach(([label, value]) => {
        doc.text(`${label}:`, 30, y);
        doc.text(value, 150, y);
        y += 15;
      });
    }
    
  } catch (error) {
    console.error('Error generating collections PDF:', error);
    doc.text('Error loading collection data', 20, 100);
  }

  doc.save(`collections-delinquency-${portfolioName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Lease Pipeline Report  
export const generateLeasePipelinePDF = async (
  portfolioId: string,
  portfolioName: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Lease Pipeline Report', 20, 30);
  doc.setFontSize(12);
  doc.text(`Portfolio: ${portfolioName}`, 20, 45);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd')}`, 20, 55);

  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('portfolio_id', portfolioId);

    if (properties) {
      const now = new Date();
      const expiring30 = properties.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).length;
      
      const expiring60 = properties.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      ).length;
      
      const expiring90 = properties.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      ).length;

      doc.setFontSize(16);
      doc.text('Lease Expiration Pipeline', 20, 80);
      doc.setFontSize(11);
      
      const metrics = [
        ['Expiring in 30 Days', expiring30.toString()],
        ['Expiring in 60 Days', expiring60.toString()],
        ['Expiring in 90 Days', expiring90.toString()]
      ];

      let y = 100;
      metrics.forEach(([label, value]) => {
        doc.text(`${label}:`, 30, y);
        doc.text(value, 150, y);
        y += 15;
      });
    }
    
  } catch (error) {
    console.error('Error generating lease pipeline PDF:', error);
    doc.text('Error loading lease data', 20, 100);
  }

  doc.save(`lease-pipeline-${portfolioName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Maintenance Efficiency Report
export const generateMaintenanceEfficiencyPDF = async (
  portfolioId: string,
  portfolioName: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Maintenance Efficiency Report', 20, 30);
  doc.setFontSize(12);
  doc.text(`Portfolio: ${portfolioName}`, 20, 45);
  doc.text(`Period: ${startDate} to ${endDate}`, 20, 55);

  try {
    const { data: maintenance } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties!inner(portfolio_id)
      `)
      .eq('properties.portfolio_id', portfolioId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (maintenance) {
      const openRequests = maintenance.filter(m => m.status !== 'completed').length;
      const completedRequests = maintenance.filter(m => m.status === 'completed').length;
      const avgResolutionDays = completedRequests > 0 ? 
        maintenance
          .filter(m => m.status === 'completed' && m.completed_date)
          .reduce((sum, m) => {
            const created = new Date(m.created_at);
            const completed = new Date(m.completed_date);
            return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 3600 * 24));
          }, 0) / completedRequests : 0;

      doc.setFontSize(16);
      doc.text('Maintenance Metrics', 20, 80);
      doc.setFontSize(11);
      
      const metrics = [
        ['Open Requests', openRequests.toString()],
        ['Completed Requests', completedRequests.toString()],
        ['Average Resolution Time', `${avgResolutionDays.toFixed(1)} days`],
        ['Total Requests', maintenance.length.toString()]
      ];

      let y = 100;
      metrics.forEach(([label, value]) => {
        doc.text(`${label}:`, 30, y);
        doc.text(value, 150, y);
        y += 15;
      });
    }
    
  } catch (error) {
    console.error('Error generating maintenance efficiency PDF:', error);
    doc.text('Error loading maintenance data', 20, 100);
  }

  doc.save(`maintenance-efficiency-${portfolioName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// Raw Portfolio Data Export
export const exportPortfolioDataCSV = async (
  portfolioId: string,
  portfolioName: string,
  selectedDatasets: string[],
  startDate?: string,
  endDate?: string
) => {
  try {
    for (const dataset of selectedDatasets) {
      let data: any[] = [];
      let filename = '';
      
      switch (dataset) {
        case 'properties':
          const { data: properties } = await supabase
            .from('properties')
            .select('*')
            .eq('portfolio_id', portfolioId);
          data = properties || [];
          filename = `${portfolioName}-properties`;
          break;
          
        case 'rent_payments':
          let query = supabase
            .from('rent_payments')
            .select(`*, properties!inner(portfolio_id, address)`)
            .eq('properties.portfolio_id', portfolioId);
          
          if (startDate) query = query.gte('payment_date', startDate);
          if (endDate) query = query.lte('payment_date', endDate);
          
          const { data: rentPayments } = await query;
          data = rentPayments || [];
          filename = `${portfolioName}-rent-payments`;
          break;
          
        case 'maintenance_requests':
          let maintenanceQuery = supabase
            .from('maintenance_requests')
            .select(`*, properties!inner(portfolio_id, address)`)
            .eq('properties.portfolio_id', portfolioId);
            
          if (startDate) maintenanceQuery = maintenanceQuery.gte('created_at', startDate);
          if (endDate) maintenanceQuery = maintenanceQuery.lte('created_at', endDate);
          
          const { data: maintenance } = await maintenanceQuery;
          data = maintenance || [];
          filename = `${portfolioName}-maintenance-requests`;
          break;
          
        case 'portfolio_assets':
          const { data: assets } = await supabase
            .from('portfolio_assets')
            .select('*')
            .eq('portfolio_id', portfolioId);
          data = assets || [];
          filename = `${portfolioName}-assets`;
          break;
          
        default:
          continue;
      }
      
      if (data.length > 0) {
        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' ? `"${value}"` : value;
            }).join(',')
          )
        ].join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    }
  } catch (error) {
    console.error('Error exporting portfolio data:', error);
    throw error;
  }
};