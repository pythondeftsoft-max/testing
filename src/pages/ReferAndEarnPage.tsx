import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Gift, Users, TrendingUp, Clock, CheckCircle2, Send, Copy } from 'lucide-react';

interface ReferralStats {
  total_referrals: number;
  pending_invitations: number;
  registered_referrals: number;
  approved_referrals: number;
  qualified_referrals: number;
  total_rewards_earned: number;
  available_rewards_count: number;
  recent_events: any;
}

interface ReferralFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ReferAndEarnPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'invited' | 'registered' | 'qualified'>('all');
  const [formData, setFormData] = useState<ReferralFormData>({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    fetchUserAndStats();
  }, []);

  const fetchUserAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Get detailed referral stats
      const { data: statsData } = await supabase
        .rpc('get_detailed_referral_stats', { p_user_id: user.id });

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSubmitting(true);
    try {
      // Create referral invitation
      const { data: referralData, error: referralError } = await supabase
        .rpc('create_referral_invitation', {
          p_referrer_id: user.id,
          p_referred_name: formData.name,
          p_referred_email: formData.email,
          p_referred_phone: formData.phone || null
        });

      if (referralError) throw referralError;

      const referralCode = referralData[0]?.referral_code;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-referral-invitation', {
        body: {
          referrer_name: `${profile.first_name} ${profile.last_name}`.trim() || 'Your friend',
          referred_name: formData.name,
          referred_email: formData.email,
          referred_phone: formData.phone,
          referral_code: referralCode
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation Sent!",
        description: `Successfully sent referral invitation to ${formData.name}`,
      });

      // Reset form
      setFormData({ name: '', email: '', phone: '', message: '' });
      
      // Refresh stats
      fetchUserAndStats();

    } catch (error: any) {
      console.error('Error sending referral:', error);
      
      // Handle specific duplicate referral error
      if (error.message?.includes('already sent a referral to this email address')) {
        toast({
          title: "Duplicate Referral",
          description: "You have already sent a referral to this email address.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send referral invitation",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferralLink = async () => {
    if (!user) return;
    
    const referralLink = `${window.location.origin}/signup?ref=${user.id}`;
    await navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Refer & Earn Program</h1>
            <p className="text-muted-foreground">Help friends find their perfect home and earn rewards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Program Info & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  How It Works
                </CardTitle>
                <CardDescription>
                  Earn $100 in reward points for every qualified referral
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Send className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">1. Send Invitation</h3>
                    <p className="text-sm text-muted-foreground">Invite friends via email</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">2. Friend Signs Up</h3>
                    <p className="text-sm text-muted-foreground">They create an account</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">3. Gets Approved</h3>
                    <p className="text-sm text-muted-foreground">Approved for a property</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">4. You Earn</h3>
                    <p className="text-sm text-muted-foreground">$100 in points</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Reward Timeline</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <strong>Registration:</strong> Friend creates account with your referral code
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <strong>Application:</strong> Friend applies for properties
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <strong>Approval:</strong> Friend gets approved for a rental
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <strong>60-Day Milestone:</strong> You earn $100 in reward points after they've been a tenant for 60 days
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Referral Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Your Referral Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.total_referrals}</div>
                      <div className="text-sm text-muted-foreground">Total Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.registered_referrals}</div>
                      <div className="text-sm text-muted-foreground">Registered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.qualified_referrals}</div>
                      <div className="text-sm text-muted-foreground">Qualified</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">${stats.total_rewards_earned}</div>
                      <div className="text-sm text-muted-foreground">Earned</div>
                    </div>
                  </div>

                  {stats.available_rewards_count > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">🎉 Rewards Available!</h4>
                      <p className="text-sm text-green-700">
                        You have {stats.available_rewards_count} reward(s) ready to claim. 
                        Contact support to receive your gift cards.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {stats?.recent_events && Array.isArray(stats.recent_events) && stats.recent_events.length > 0 && (() => {
              const filteredEvents = stats.recent_events.filter((event: any) => {
                if (activityFilter === 'all') return true;
                
                if (activityFilter === 'invited') {
                  return event.event_type === 'invitation_sent';
                }
                
                if (activityFilter === 'registered') {
                  return event.event_type === 'user_registered';
                }
                
                if (activityFilter === 'qualified') {
                  return ['application_approved', 'first_payment', '60_day_milestone'].includes(event.event_type);
                }
                
                return true;
              });

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge 
                        variant={activityFilter === 'all' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setActivityFilter('all')}
                      >
                        All
                      </Badge>
                      <Badge 
                        variant={activityFilter === 'invited' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setActivityFilter('invited')}
                      >
                        Invited
                      </Badge>
                      <Badge 
                        variant={activityFilter === 'registered' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setActivityFilter('registered')}
                      >
                        Registered
                      </Badge>
                      <Badge 
                        variant={activityFilter === 'qualified' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setActivityFilter('qualified')}
                      >
                        Qualified
                      </Badge>
                    </div>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {filteredEvents.length > 0 ? (
                          filteredEvents.map((event: any, index: number) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">
                                  {event.event_type.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm">{event.referred_name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No {activityFilter} activities found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Right Column - Referral Form */}
          <div className="space-y-6">
            {/* Referral Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send Referral Invitation</CardTitle>
                <CardDescription>
                  Invite a friend to join our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReferral} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Friend's Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter their full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="their@email.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Add a personal note to your invitation..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Quick Share */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Share</CardTitle>
                <CardDescription>
                  Copy your referral link to share anywhere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={copyReferralLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Referral Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}