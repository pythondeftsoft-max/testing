import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, Search, CheckCircle, Clock, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AppointmentRecord {
  id: string;
  scheduled_date: string;
  estimated_duration: number;
  status: string;
  notes: string | null;
  tenant_confirmed: boolean;
  vendor_confirmed: boolean;
  property_address: string | null;
  unit_name: string | null;
  vendor_name: string | null;
  tenant_name: string | null;
  landlord_name: string | null;
}

export function AdminAppointmentsLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['admin-appointments-log'],
    queryFn: async () => {
      console.log('AdminAppointmentsLog: Fetching via RPC get_admin_all_appointments...');
      
      const { data, error } = await supabase.rpc('get_admin_all_appointments');

      console.log('AdminAppointmentsLog: RPC result:', { count: data?.length, error });
      if (error) throw error;

      return (data || []) as AppointmentRecord[];
    },
  });

  // Generate available months from appointments
  const availableMonths = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    const monthSet = new Set<string>();
    appointments.forEach(apt => {
      if (apt.scheduled_date) {
        const date = parseISO(apt.scheduled_date);
        const monthKey = format(date, 'yyyy-MM');
        monthSet.add(monthKey);
      }
    });
    
    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map(monthKey => ({
        value: monthKey,
        label: format(parseISO(`${monthKey}-01`), 'MMMM yyyy'),
      }));
  }, [appointments]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!appointments) return { total: 0, scheduled: 0, completed: 0 };
    
    const total = appointments.length;
    const scheduled = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    
    return { total, scheduled, completed };
  }, [appointments]);

  // Filter records
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    return appointments.filter(apt => {
      const matchesSearch = searchTerm === '' || 
        apt.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.landlord_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;

      let matchesMonth = true;
      if (selectedMonth !== 'all' && apt.scheduled_date) {
        const aptMonth = format(parseISO(apt.scheduled_date), 'yyyy-MM');
        matchesMonth = aptMonth === selectedMonth;
      }

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [appointments, searchTerm, statusFilter, selectedMonth]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedMonth, itemsPerPage]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; label: string; className: string }> = {
      scheduled: { icon: Clock, label: 'Scheduled', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { icon: CheckCircle, label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      in_progress: { icon: Clock, label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
      completed: { icon: CheckCircle, label: 'Completed', className: 'bg-green-100 text-green-800' },
      cancelled: { icon: Clock, label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      rescheduled: { icon: Calendar, label: 'Rescheduled', className: 'bg-orange-100 text-orange-800' },
    };
    const config = variants[status] || variants.scheduled;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const csvRows = [
      ['Date', 'Time', 'Property', 'Unit', 'Tenant', 'Landlord', 'Status', 'Notes'],
      ...filteredAppointments.map(apt => [
        apt.scheduled_date ? format(parseISO(apt.scheduled_date), 'yyyy-MM-dd') : 'N/A',
        apt.scheduled_date ? format(parseISO(apt.scheduled_date), 'HH:mm') : 'N/A',
        apt.property_address || 'N/A',
        apt.unit_name || 'N/A',
        apt.tenant_name || 'N/A',
        apt.landlord_name || 'N/A',
        apt.status,
        (apt.notes || '').replace(/,/g, ';'),
      ])
    ];

    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Appointments</CardDescription>
            <CardTitle className="text-3xl">{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled/Confirmed</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{metrics.scheduled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{metrics.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by property, tenant, or landlord..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToCSV} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-20">Time</TableHead>
                  <TableHead className="w-40">Property</TableHead>
                  <TableHead className="w-28">Tenant</TableHead>
                  <TableHead className="w-28">Landlord</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="whitespace-nowrap">
                        {apt.scheduled_date 
                          ? format(parseISO(apt.scheduled_date), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {apt.scheduled_date 
                          ? format(parseISO(apt.scheduled_date), 'h:mm a')
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={apt.property_address || ''}>
                          {apt.property_address || '—'}
                        </div>
                        {apt.unit_name && (
                          <div className="text-xs text-muted-foreground">
                            {apt.unit_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="truncate max-w-[150px]">
                        {apt.tenant_name || '—'}
                      </TableCell>
                      <TableCell className="truncate max-w-[150px]">
                        {apt.landlord_name || '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate text-sm text-muted-foreground" title={apt.notes || ''}>
                          {apt.notes || '—'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length} appointments
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
