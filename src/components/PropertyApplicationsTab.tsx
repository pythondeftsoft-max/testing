import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, FileText, Eye, Search, DollarSign, MapPin, Home, MessageCircle, Ban } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ApplicationDashboardWidgets } from './applications/ApplicationDashboardWidgets';
import { EnhancedApplicationDetailsModal } from './applications/EnhancedApplicationDetailsModal';
import { useNavigate } from 'react-router-dom';
import ApplicationQuotaDisplay from '@/components/ApplicationQuotaDisplay';
import { AppliedHomesSubTabs } from './applications/AppliedHomesSubTabs';
import { getStatusBadge } from './applications/ApplicationsUtils';
import { useApplicationActions } from '@/hooks/useApplicationActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface PropertyApplicationsTabProps {
  applications: any[];
  userId?: string;
}

const PropertyApplicationsTab = ({ applications, userId }: PropertyApplicationsTabProps) => {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const navigate = useNavigate();
  const { withdrawApplication } = useApplicationActions();

  const handleWithdrawClick = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setWithdrawDialogOpen(true);
  };

  const handleWithdrawConfirm = () => {
    if (selectedApplicationId) {
      withdrawApplication.mutate({
        applicationId: selectedApplicationId,
        reason: withdrawReason || undefined,
      });
      setWithdrawDialogOpen(false);
      setSelectedApplicationId(null);
      setWithdrawReason('');
    }
  };

  const canWithdraw = (status: string) => {
    return ['draft', 'submitted', 'pending', 'under_review', 'background_check', 'landlord_review', 'approved', 'lease_sent'].includes(status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleApplicationSelect = (application: any) => {
    setSelectedApplication(application);
  };

  // Filter and search applications
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      app.properties?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.properties?.street_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.properties?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Wrap all content in the sub-tabs component
  const applicationsContent = (
    <div className="space-y-6">
      {/* Application Quota Display - Always show */}
      {userId && <ApplicationQuotaDisplay userId={userId} totalApplications={applications?.length || 0} />}
      
      {/* Empty state when no applications */}
      {(!applications || applications.length === 0) ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You Haven't Applied Yet</h3>
            <p className="text-gray-600 max-w-sm mx-auto mb-6">
              Browse available properties and submit applications to find your next home.
            </p>
            <Button 
              onClick={() => navigate('/dashboard?tab=Market')}
              className="bg-openkey-blue hover:bg-openkey-blue-dark"
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Properties
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard Widgets */}
          <ApplicationDashboardWidgets applications={applications} />

          {/* Applications Header with Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Applications</h2>
              <p className="text-gray-600">Track your application status and property details</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-openkey-blue focus:border-transparent"
                />
              </div>
              
              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-openkey-blue focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="draft">Draft</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
              
              <Badge variant="outline" className="px-3 py-1">
                {filteredApplications.length} of {applications.length}
              </Badge>
            </div>
          </div>

          {/* Applications Grid */}
          <div className="grid gap-6">
            {filteredApplications.map((application: any) => {
              // Get unit details if available
              const unit = application.property_units;
              const property = application.properties;
              const displayRent = unit?.monthly_rent || property?.monthly_rent || 0;
              const displayBedrooms = unit?.bedrooms || property?.bedrooms || 0;
              const displayBathrooms = unit?.bathrooms || property?.bathrooms || 0;
              
              return (
                <CardEnhanced 
                  key={application.id}
                  variant="elevated"
                  className="card-hover transition-all duration-300"
                >
                  <CardEnhancedContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {/* Property Icon */}
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-openkey-blue to-blue-600">
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {property?.street_address || property?.address}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {property?.city}, {property?.state} {property?.zipcode}
                          </p>
                          {unit && (
                            <p className="text-xs text-gray-500 mt-1">
                              Unit {unit.unit_number}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(application)}
                        <span className="text-xs text-gray-500">
                          Applied {formatDate(application.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Property Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Home className="h-4 w-4 text-openkey-blue" />
                        <span className="font-medium text-gray-900">Property Details</span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
                          <p className="font-semibold text-openkey-gold text-lg">
                            ${displayRent.toLocaleString()}/mo
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Size</p>
                          <p className="font-medium text-gray-900 text-sm">
                            {displayBedrooms}BR / {displayBathrooms}BA
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Status</p>
                          <Badge variant={
                            application.status === 'lease_sent' ? 'success' :
                            application.status === 'approved' ? 'success' :
                            application.status === 'rejected' ? 'destructive' :
                            application.status === 'submitted' ? 'default' : 
                            'secondary'
                          }>
                            {application.status === 'submitted' && 'Under Review'}
                            {application.status === 'draft' && 'Incomplete'}
                            {application.status === 'withdrawn' && 'Withdrawn'}
                            {application.status === 'lease_sent' && 'Lease Sent'}
                            {application.status === 'approved' && 'Approved'}
                            {application.status === 'rejected' && 'Rejected'}
                            {application.status === 'pending' && 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>


                    {/* Application Notes */}
                    {application.notes && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900">Notes</span>
                        </div>
                        <p className="text-sm text-gray-700">{application.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/messages')}
                        className="border-openkey-blue text-openkey-blue hover:bg-openkey-blue hover:text-white"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Send Message
                      </Button>
                      
                      {canWithdraw(application.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWithdrawClick(application.id)}
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplicationSelect(application)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      
                      {application.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/apply/${application.property_id}`)}
                          className="bg-openkey-blue hover:bg-openkey-blue-dark"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              );
            })}
          </div>
        </>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <EnhancedApplicationDetailsModal
          application={selectedApplication}
          open={!!selectedApplication}
          onOpenChange={(open) => !open && setSelectedApplication(null)}
          viewerType="tenant"
        />
      )}

      {/* Withdraw Application Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
            <Textarea
              placeholder="Enter reason for withdrawal..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setWithdrawReason('');
              setSelectedApplicationId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Withdraw Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Return the content wrapped in sub-tabs
  return userId ? (
    <AppliedHomesSubTabs 
      applicationsContent={applicationsContent}
      userId={userId}
    />
  ) : (
    <div>{applicationsContent}</div>
  );
};

export default PropertyApplicationsTab;
