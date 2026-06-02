import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  MapPin, 
  Calendar, 
  Star, 
  Home,
  CreditCard,
  FileText,
  MessageCircle,
  Phone,
  Mail,
  Building,
  Car,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  DollarSign,
  Shield,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedApplicationDetailsModalProps {
  application: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerType?: 'tenant' | 'landlord';
}

export const EnhancedApplicationDetailsModal = ({ 
  application, 
  open, 
  onOpenChange,
  viewerType = 'landlord'
}: EnhancedApplicationDetailsModalProps) => {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load messages when application changes
  useEffect(() => {
    if (application?.id) {
      loadMessages();
    }
  }, [application?.id]);

  const loadMessages = async () => {
    if (!application?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey (
            first_name,
            last_name,
            user_type
          )
        `)
        .eq('property_application_id', application.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  const property = application.properties;
  const tenant = application.profiles;
  const tenantProfile = application.tenant_profiles;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !application) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .insert({
          property_application_id: application.id,
          sender_id: user.id,
          message_text: message.trim()
        });

      if (error) throw error;

      setMessage('');
      await loadMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(application.status)}
              Application Details
            </div>
            {application.priority_payment_made && (
              <Badge className="bg-gradient-to-r from-openkey-gold to-yellow-400 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Priority
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={`grid w-full ${viewerType === 'tenant' ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            {viewerType !== 'tenant' && (
              <>
                <TabsTrigger value="tenant">Tenant</TabsTrigger>
                <TabsTrigger value="communication">Messages</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Application Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-openkey-blue" />
                  Application Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Applicant</label>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="p-2 bg-openkey-blue/10 rounded-lg">
                          <User className="h-4 w-4 text-openkey-blue" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant?.first_name} {tenant?.last_name}</p>
                          <p className="text-sm text-gray-600">{tenant?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Property</label>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="p-2 bg-openkey-blue/10 rounded-lg">
                          <Home className="h-4 w-4 text-openkey-blue" />
                        </div>
                        <div>
                          <p className="font-medium">{property?.address}</p>
                          <p className="text-sm text-openkey-gold font-semibold">
                            ${property?.monthly_rent?.toLocaleString()}/month
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Application Date</label>
                      <div className="flex items-center gap-3 mt-1">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span>{new Date(application.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="property" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-openkey-blue" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 font-medium">{property?.address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Monthly Rent</label>
                      <p className="mt-1 text-xl font-bold text-openkey-gold">
                        ${property?.monthly_rent?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Property Type</label>
                      <p className="mt-1">{property?.property_type || 'Residential'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Bedrooms</label>
                      <p className="mt-1">{property?.bedrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Bathrooms</label>
                      <p className="mt-1">{property?.bathrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Square Feet</label>
                      <p className="mt-1">{property?.square_feet ? `${property.square_feet} sq ft` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                {property?.description && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-gray-600">{property.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tenant" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-openkey-blue" />
                  Tenant Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contact Information</label>
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-600" />
                          <span>{tenant?.email}</span>
                        </div>
                        {tenant?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-600" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Employment Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Briefcase className="h-4 w-4 text-gray-600" />
                        <span className="capitalize">
                          {tenantProfile?.employment_status || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Monthly Income</label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">
                          ${tenantProfile?.monthly_income?.toLocaleString() || 'Not provided'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Credit Score</label>
                      <div className="flex items-center gap-2 mt-1">
                        <CreditCard className="h-4 w-4 text-gray-600" />
                        <span className={`font-semibold ${
                          tenantProfile?.credit_score >= 700 ? 'text-green-600' :
                          tenantProfile?.credit_score >= 650 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {tenantProfile?.credit_score || 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {tenantProfile?.voucher_holder && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Housing Voucher Holder</span>
                    </div>
                    {tenantProfile.voucher_amount && (
                      <p className="text-sm text-blue-700 mt-1">
                        Voucher Amount: ${tenantProfile.voucher_amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-openkey-blue" />
                  Message Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] overflow-y-auto">
                    {loading ? (
                      <p className="text-sm text-gray-600 text-center py-8">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-gray-600 text-center py-8">
                        No messages yet. Start a conversation with the landlord.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === application.tenant_id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg ${
                                msg.sender_id === application.tenant_id
                                  ? 'bg-openkey-blue text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <User className="h-3 w-3" />
                                <span className="text-xs font-medium">
                                  {msg.sender_id === application.tenant_id 
                                    ? 'You' 
                                    : `${msg.profiles?.first_name || 'Landlord'} ${msg.profiles?.last_name || ''}`
                                  }
                                </span>
                              </div>
                              <p className="text-sm">{msg.message_text}</p>
                              <p className="text-xs opacity-75 mt-1">
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Send Message</label>
                    <Textarea
                      placeholder="Type your message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      className="bg-openkey-blue hover:bg-openkey-blue/90 text-white w-full"
                      disabled={!message.trim() || loading}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {loading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};