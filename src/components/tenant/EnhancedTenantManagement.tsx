import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  FileCheck, 
  Calendar,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { useEnhancedTenantManagement } from '@/hooks/useEnhancedTenantManagementReal';
import { format } from 'date-fns';

interface EnhancedTenantManagementProps {
  userId: string;
  portfolioId?: string;
}

const EnhancedTenantManagement = ({ userId, portfolioId }: EnhancedTenantManagementProps) => {
  const {
    leases,
    communications,
    rentAlerts,
    screenings,
    isLoading,
    sendRenewalNotice,
    processRenewal,
    sendTenantMessage,
    initiateScreening,
    handleRentAlert
  } = useEnhancedTenantManagement(portfolioId);

  const [activeTab, setActiveTab] = useState('leases');
  const [messageDialog, setMessageDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    type: 'general'
  });

  const getLeaseStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'destructive';
      case 'pending': return 'warning';
      case 'terminated': return 'secondary';
      default: return 'secondary';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getScreeningStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTenant || !messageForm.subject || !messageForm.message) return;
    
    try {
      await sendTenantMessage(
        selectedTenant.tenant_id,
        selectedTenant.property_id,
        messageForm.subject,
        messageForm.message,
        messageForm.type
      );
      setMessageDialog(false);
      setMessageForm({ subject: '', message: '', type: 'general' });
      setSelectedTenant(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Calculate metrics
  const activeLeases = leases.filter(l => l.lease_start_date && l.lease_end_date && 
    new Date(l.lease_start_date) <= new Date() && new Date(l.lease_end_date) >= new Date()).length;
    
  const expiringLeases = leases.filter(lease => {
    if (!lease.lease_end_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(lease.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
  });

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" animate={true}>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading tenant management data...</p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Cards */}
      {(expiringLeases.length > 0 || rentAlerts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiringLeases.length > 0 && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                {expiringLeases.length} lease(s) expiring within 60 days. Review renewal options.
              </AlertDescription>
            </Alert>
          )}
          
          {rentAlerts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {rentAlerts.length} rent collection alert(s) require attention.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leases</p>
                <p className="text-2xl font-bold text-foreground">{activeLeases}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold text-foreground">
                  {communications.filter(c => c.status === 'sent').length}
                </p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                <p className="text-2xl font-bold text-foreground">{rentAlerts.length}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
          <CardEnhancedContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Screenings</p>
                <p className="text-2xl font-bold text-foreground">{screenings.length}</p>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Main Dashboard */}
      <CardEnhanced variant="elevated" hover={true} animate={true}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2" gradient>
            <Users className="h-5 w-5 text-primary" />
            Enhanced Tenant Management
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leases">Lease Lifecycle</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="alerts">Rent Alerts</TabsTrigger>
              <TabsTrigger value="screening">Screening</TabsTrigger>
            </TabsList>

            <TabsContent value="leases" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Lease Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Renewal</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leases.map((lease) => {
                      const daysUntilExpiry = lease.lease_end_date 
                        ? Math.ceil((new Date(lease.lease_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : 0;
                      
                      return (
                        <TableRow key={lease.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {(lease as any).properties?.address || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">
                                {(lease as any).tenant?.first_name} {(lease as any).tenant?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(lease as any).tenant?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{lease.lease_start_date ? format(new Date(lease.lease_start_date), 'MMM dd, yyyy') : 'N/A'}</div>
                              <div className="text-muted-foreground">
                                to {lease.lease_end_date ? format(new Date(lease.lease_end_date), 'MMM dd, yyyy') : 'N/A'}
                              </div>
                              {daysUntilExpiry > 0 && daysUntilExpiry <= 60 && (
                                <div className="text-warning text-xs mt-1">
                                  Expires in {daysUntilExpiry} days
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={lease.lease_end_date && new Date(lease.lease_end_date) >= new Date() ? 'success' : 'secondary'}>
                              {lease.lease_end_date && new Date(lease.lease_end_date) >= new Date() ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {lease.renewal_notice_sent ? (
                                <div className="flex items-center gap-1 text-success">
                                  <CheckCircle className="h-3 w-3" />
                                  Notice Sent
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </div>
                              )}
                              {lease.renewal_terms && (
                                <div className="text-xs mt-1">
                                  Notes: {typeof lease.renewal_terms === 'string' ? lease.renewal_terms : JSON.stringify(lease.renewal_terms)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {!lease.renewal_notice_sent && daysUntilExpiry <= 90 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendRenewalNotice(lease.id)}
                                >
                                  <Bell className="h-3 w-3 mr-1" />
                                  Send Notice
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTenant(lease);
                                  setMessageForm({ ...messageForm, type: 'lease' });
                                  setMessageDialog(true);
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Message
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="communications" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                  <DialogTrigger asChild>
                    <Button variant="blue">
                      <Send className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Message to Tenant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={messageForm.subject}
                          onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                          placeholder="Enter message subject"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={messageForm.message}
                          onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                          placeholder="Enter your message"
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setMessageDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSendMessage}>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Tenant</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {(comm as any).tenant?.first_name} {(comm as any).tenant?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(comm as any).properties?.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{comm.subject}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {comm.message_content}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{comm.message_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={comm.status === 'read' ? 'success' : comm.status === 'replied' ? 'occupied' : 'warning'}>
                            {comm.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {format(new Date(comm.sent_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Property</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Days Late</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(alert as any).properties?.address || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {(alert as any).tenant?.first_name} {(alert as any).tenant?.last_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">
                            Alert
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            ${alert.amount_due.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{alert.days_late} days</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRentAlert(alert.id, 'resolve')}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRentAlert(alert.id, 'escalate')}
                            >
                              Escalate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="screening" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Applicant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credit Score</TableHead>
                      <TableHead>Background Check</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {screenings.map((screening) => (
                      <TableRow key={screening.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {(screening as any).applicant?.first_name} {(screening as any).applicant?.last_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {(screening as any).properties?.address || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {screening.credit_score || 'Pending'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              screening.background_check_id 
                                ? 'success'
                                : 'secondary'
                            }
                          >
                            {screening.background_check_id ? 'Complete' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {format(new Date(screening.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default EnhancedTenantManagement;