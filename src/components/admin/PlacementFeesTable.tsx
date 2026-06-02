import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, Shield, 
  Building2, CreditCard, Building, FileText, ExternalLink, Info, 
  Settings, Eye, Mail, Link as LinkIcon 
} from 'lucide-react';
import { useAllPlacementFees, useLandlordPlacementFees } from '@/hooks/useLandlordPlacementFees';
import { format } from 'date-fns';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';
import { LinkBankTransactionDialog } from './LinkBankTransactionDialog';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PlacementFeesTable = () => {
  const { allPlacementFees, isLoading, markAsPaid, waiveFee, updateFollowUp } = useAllPlacementFees();
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;
  
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [waiveReason, setWaiveReason] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [feeForBankLink, setFeeForBankLink] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Pagination calculations
  const totalItems = allPlacementFees?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFees = allPlacementFees?.slice(startIndex, endIndex) || [];

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'waived':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Waived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFollowUpBadge = (status: string) => {
    switch (status) {
      case 'none':
        return <Badge variant="outline">No Follow-up</Badge>;
      case 'reminder_sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Reminder Sent</Badge>;
      case 'second_reminder':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">2nd Reminder</Badge>;
      case 'final_notice':
        return <Badge variant="destructive">Final Notice</Badge>;
      case 'collections':
        return <Badge className="bg-red-700">Collections</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMarkPaid = async (feeId: string) => {
    await markAsPaid({ feeId, paymentMethod, paymentDate, notes });
    setSelectedFee(null);
    setPaymentMethod('');
    setPaymentDate('');
    setNotes('');
  };

  const handleWaive = async (feeId: string) => {
    await waiveFee({ feeId, reason: waiveReason });
    setSelectedFee(null);
    setWaiveReason('');
  };

  const sendReminder = async (feeId: string, reminderType: string) => {
    await updateFollowUp({ feeId, followUpStatus: reminderType as any });
  };

  if (isLoading) {
    return <div>Loading placement fees...</div>;
  }

  return (
    <>
      <LinkBankTransactionDialog
        fee={feeForBankLink}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
      
      <div className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Landlord Placement Fees
            </div>
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} fees
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Track and manage {placementFeePercentage}% placement fees from landlords
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pagination Controls - Top */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-4">
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((pageNum, idx) => (
                    <PaginationItem key={idx}>
                      {pageNum === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum as number)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFees?.map((fee) => (
                  <TableRow key={fee.id}>
                    {/* Landlord Column with Admin Listed Badge */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {fee.profiles?.first_name} {fee.profiles?.last_name}
                          {fee.admin_listed && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin Listed
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{fee.profiles?.email}</div>
                        {(fee as any).tenant_name && (
                          <div className="text-xs text-muted-foreground pt-1 border-t border-dashed mt-1">
                            <span className="font-medium text-foreground/70">Tenant:</span> {(fee as any).tenant_name}
                          </div>
                        )}
                        {(fee as any).assigned_worker_name && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">Worker:</span> {(fee as any).assigned_worker_name}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Property Column with Unit Details */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{fee.properties?.address}</div>
                        {fee.property_units && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Unit {fee.property_units.unit_number}
                            {fee.property_units.unit_name && ` - ${fee.property_units.unit_name}`}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-semibold">
                      ${fee.fee_amount.toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {format(new Date(fee.due_date), 'MMM dd, yyyy')}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(fee.payment_status)}
                    </TableCell>

                    {/* Payment Method Column */}
                    <TableCell>
                      {fee.payment_status === 'paid' ? (
                        <div className="space-y-1">
                          {fee.stripe_payment_intent_id && (
                            <div className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-3 w-3 text-blue-600" />
                              <span className="font-medium">Stripe</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1"
                                onClick={() => window.open(
                                  `https://dashboard.stripe.com/payments/${fee.stripe_payment_intent_id}`,
                                  '_blank'
                                )}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {fee.plaid_transaction_id && (
                            <div className="flex items-center gap-1 text-sm">
                              <Building className="h-3 w-3 text-green-600" />
                              <span className="font-medium">Plaid ACH</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Auto-tracked from bank account
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                          {!fee.stripe_payment_intent_id && !fee.plaid_transaction_id && fee.payment_method && (
                            <div className="flex items-center gap-1 text-sm">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium capitalize">{fee.payment_method}</span>
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            </div>
                          )}
                          {fee.payment_date && (
                            <div className="text-xs text-muted-foreground">
                              Paid: {format(new Date(fee.payment_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Pending</div>
                      )}
                    </TableCell>

                    {/* Follow-up Column with Actions */}
                    <TableCell>
                      <div className="space-y-2">
                        {getFollowUpBadge(fee.follow_up_status)}
                        
                        {fee.last_reminder_sent && (
                          <div className="text-xs text-muted-foreground">
                            Last: {format(new Date(fee.last_reminder_sent), 'MMM dd')}
                          </div>
                        )}
                        
                        {fee.payment_status === 'pending' && (
                          <Select onValueChange={(value) => sendReminder(fee.id, value)}>
                            <SelectTrigger className="h-7 text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              <SelectValue placeholder="Send Reminder" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reminder_sent">First Reminder</SelectItem>
                              <SelectItem value="second_reminder">Second Reminder</SelectItem>
                              <SelectItem value="final_notice">Final Notice</SelectItem>
                              <SelectItem value="collections" className="text-destructive">
                                Escalate to Collections
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell>
                      <div className="flex gap-2">
                        {fee.payment_status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setFeeForBankLink({
                                id: fee.id,
                                fee_amount: fee.fee_amount,
                                landlord_name: `${fee.profiles?.first_name} ${fee.profiles?.last_name}`,
                                property_address: fee.properties?.address,
                                unit_number: fee.property_units?.unit_number,
                              });
                              setLinkDialogOpen(true);
                            }}
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Link Bank Tx
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedFee(fee);
                                setPaymentDate(new Date().toISOString().split('T')[0]);
                              }}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Manage Placement Fee</DialogTitle>
                            </DialogHeader>
                            {selectedFee?.id === fee.id && (
                              <div className="space-y-4">
                                {fee.payment_status === 'pending' && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Mark as Paid</label>
                                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Payment method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="check">Check</SelectItem>
                                          <SelectItem value="wire">Wire Transfer</SelectItem>
                                          <SelectItem value="ach">ACH</SelectItem>
                                          <SelectItem value="cash">Cash</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        placeholder="Payment date"
                                      />
                                      <Textarea
                                        placeholder="Payment notes (optional)"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                      />
                                      <Button 
                                        onClick={() => handleMarkPaid(fee.id)}
                                        disabled={!paymentMethod}
                                        className="w-full"
                                      >
                                        Mark as Paid
                                      </Button>
                                    </div>
                                    
                                    <div className="border-t pt-4 space-y-2">
                                      <label className="text-sm font-medium">Waive Fee</label>
                                      <Textarea
                                        placeholder="Reason for waiving fee"
                                        value={waiveReason}
                                        onChange={(e) => setWaiveReason(e.target.value)}
                                      />
                                      <Button 
                                        variant="destructive"
                                        onClick={() => handleWaive(fee.id)}
                                        disabled={!waiveReason}
                                        className="w-full"
                                      >
                                        Waive Fee
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                
                                {fee.payment_status !== 'pending' && (
                                  <div className="text-sm text-muted-foreground">
                                    Fee status: {fee.payment_status}
                                    {fee.notes && (
                                      <div className="mt-2">
                                        <strong>Notes:</strong> {fee.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p><strong>Property:</strong> {fee.properties?.address}</p>
                                {fee.property_units && (
                                  <p><strong>Unit:</strong> {fee.property_units.unit_number}</p>
                                )}
                                <p><strong>Fee:</strong> ${fee.fee_amount.toLocaleString()}</p>
                                <p><strong>Due:</strong> {format(new Date(fee.due_date), 'MMM dd, yyyy')}</p>
                                {fee.notes && <p><strong>Notes:</strong> {fee.notes}</p>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls - Bottom */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="flex justify-center pt-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((pageNum, idx) => (
                    <PaginationItem key={idx}>
                      {pageNum === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum as number)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No placement fees found
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default PlacementFeesTable;
