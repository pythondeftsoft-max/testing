import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Star, 
  TrendingUp, 
  AlertCircle,
  Crown,
  MessageSquare,
  FileText,
  User,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Home
} from 'lucide-react';
import { useProfileAnalysis } from '@/hooks/useProfileAnalysis';
import { useAuth } from '@/hooks/useAuth';

interface ApplicationDashboardWidgetsProps {
  applications: any[];
}

export const ApplicationDashboardWidgets = ({ applications }: ApplicationDashboardWidgetsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { analysis, loading: profileLoading } = useProfileAnalysis(user?.id || '');

  // Calculate application statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    priority: applications.filter(app => app.priority_payment_made).length
  };

  const approvalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;

  const getRecommendationIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      User, Phone, MapPin, CreditCard, DollarSign, FileText, Home
    };
    return iconMap[iconName] || User;
  };

  const getRecommendationColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-700';
      default: return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const handleUpdateProfile = () => {
    navigate(`/tenant-profile/${user?.id}`);
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Application Status Overview */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-2 card-hover-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-openkey-blue" />
            Application Overview
          </CardTitle>
          <CardDescription>Status breakdown of all your applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-green-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
          </div>
          {stats.priority > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-openkey-gold/10 to-yellow-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-openkey-gold" />
                <span className="font-medium text-openkey-gold">
                  {stats.priority} Priority Application{stats.priority !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Success Rate */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Success Rate
          </CardTitle>
          <CardDescription>Application approval rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-green-600">
              {approvalRate.toFixed(0)}%
            </div>
            <Progress value={approvalRate} className="h-2" />
            <div className="text-sm text-gray-600">
              {stats.approved} of {stats.total} approved
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Guidance */}
      <Card className="card-hover-gold">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-4 w-4 text-openkey-gold" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profileLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-openkey-gold"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              {/* Profile Completion */}
              {analysis && (
                <div className={`p-3 rounded-lg border ${
                  analysis.isProfileComplete 
                    ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-800' 
                    : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200 dark:from-orange-950/50 dark:to-yellow-950/50 dark:border-orange-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {analysis.isProfileComplete ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">Profile Complete! ✅</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                            Profile: {analysis.completionPercentage}% Complete
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!analysis.isProfileComplete && (
                    <>
                      <Progress 
                        value={analysis.completionPercentage} 
                        className="h-1.5 mb-2" 
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {analysis.criticalMissing?.length || 0} critical items remaining
                        </p>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          {100 - analysis.completionPercentage}% to go
                        </span>
                      </div>
                    </>
                  )}
                  
                  {analysis.isProfileComplete && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Your profile is ready for applications!
                    </p>
                  )}
                </div>
              )}

              {/* Recommendations List */}
              <div className="space-y-2">
                {analysis?.recommendations.slice(0, 3).map((recommendation, index) => {
                  const IconComponent = getRecommendationIcon(recommendation.icon);
                  return (
                    <div key={recommendation.id} className="flex items-start gap-2 py-1.5">
                      <IconComponent className="h-3.5 w-3.5 text-openkey-gold mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{recommendation.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{recommendation.description}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Status Items */}
                {stats.pending > 0 && (
                  <div className="flex items-start gap-2 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">{stats.pending} Pending</p>
                      <p className="text-xs text-gray-600">Follow up with landlords</p>
                    </div>
                  </div>
                )}

                {stats.total === 0 && (
                  <div className="flex items-start gap-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">Start Applying</p>
                      <p className="text-xs text-gray-600">Browse properties</p>
                    </div>
                  </div>
                )}

                {stats.priority === 0 && stats.total > 0 && (
                  <div className="flex items-start gap-2 py-1.5">
                    <Crown className="h-3.5 w-3.5 text-openkey-gold mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">Priority Apps</p>
                      <p className="text-xs text-gray-600">Stand out from the crowd</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Single Action Button */}
              <Button 
                onClick={handleUpdateProfile}
                className="w-full bg-openkey-gold hover:bg-openkey-gold/90 text-white text-sm py-2"
                size="sm"
              >
                Update Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
};