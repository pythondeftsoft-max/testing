
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, isYesterday } from 'date-fns';
import { Clock, Calendar, AlertTriangle, Shield, User, Globe } from 'lucide-react';

interface SecurityLog {
  id: string;
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  severity: string;
  created_at: string;
  hash: string;
}

interface SecurityTimelineViewProps {
  logs: SecurityLog[];
  getSeverityColor: (severity: string) => string;
}

export const SecurityTimelineView: React.FC<SecurityTimelineViewProps> = ({
  logs,
  getSeverityColor
}) => {
  const groupedLogs = useMemo(() => {
    const groups: Record<string, SecurityLog[]> = {};
    
    logs.forEach(log => {
      const date = new Date(log.created_at);
      let dateKey: string;
      
      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(date, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    
    // Sort logs within each group by time (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    
    return groups;
  }, [logs]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Shield className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('session') || eventType.includes('login')) {
      return <User className="w-4 h-4" />;
    } else if (eventType.includes('rate_limit') || eventType.includes('suspicious')) {
      return <AlertTriangle className="w-4 h-4" />;
    } else {
      return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Security Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No security events found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([dateGroup, dayLogs]) => (
                <div key={dateGroup}>
                  <div className="sticky top-0 bg-white border-b pb-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {dateGroup}
                      <Badge variant="outline">{dayLogs.length} events</Badge>
                    </h3>
                  </div>
                  
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    <div className="space-y-4">
                      {dayLogs.map((log, index) => (
                        <div key={log.id} className="relative flex items-start space-x-4">
                          {/* Timeline dot */}
                          <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white ${getSeverityColor(log.severity)} shadow-sm`}>
                            {getSeverityIcon(log.severity)}
                          </div>
                          
                          {/* Event content */}
                          <div className="flex-1 min-w-0 pb-8">
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {getEventTypeIcon(log.event_type)}
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </h4>
                                  <Badge className={getSeverityColor(log.severity)}>
                                    {log.severity}
                                  </Badge>
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {format(new Date(log.created_at), 'HH:mm:ss')}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">
                                Action: <span className="font-medium">{log.action}</span>
                                {log.resource_type && (
                                  <>
                                    {' '}on <span className="font-medium">{log.resource_type}</span>
                                  </>
                                )}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                {log.ip_address && (
                                  <div className="flex items-center text-gray-500">
                                    <Globe className="w-3 h-3 mr-1" />
                                    <span className="font-mono">{log.ip_address}</span>
                                  </div>
                                )}
                                {log.user_id && (
                                  <div className="flex items-center text-gray-500">
                                    <User className="w-3 h-3 mr-1" />
                                    <span className="font-mono">{log.user_id.substring(0, 8)}...</span>
                                  </div>
                                )}
                                {log.resource_id && (
                                  <div className="flex items-center text-gray-500">
                                    <Shield className="w-3 h-3 mr-1" />
                                    <span className="font-mono">{log.resource_id.substring(0, 8)}...</span>
                                  </div>
                                )}
                              </div>
                              
                              {Object.keys(log.metadata).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <details className="group">
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                      View metadata ({Object.keys(log.metadata).length} items)
                                    </summary>
                                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-20">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
