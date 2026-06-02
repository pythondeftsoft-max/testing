
import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  ExternalLink,
  Globe,
  User,
  Clock,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

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

interface SecurityLogStreamProps {
  logs: SecurityLog[];
  loading: boolean;
  isRealTime: boolean;
  getSeverityColor: (severity: string) => string;
}

export const SecurityLogStream: React.FC<SecurityLogStreamProps> = ({
  logs,
  loading,
  isRealTime,
  getSeverityColor
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive in real-time
  useEffect(() => {
    if (isRealTime && autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs, isRealTime, autoScroll]);

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading security logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Security Event Stream
            {isRealTime && (
              <Badge variant="default" className="animate-pulse">
                LIVE
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={autoScroll ? 'bg-blue-50' : ''}
            >
              {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            </Button>
            <span className="text-sm text-gray-500">
              {logs.length} events
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full" ref={scrollAreaRef}>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No security events found</p>
              <p className="text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedLogs.has(log.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-gray-900">
                            {log.event_type}
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{log.action}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {log.ip_address && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {log.ip_address}
                          </div>
                        )}
                        {log.user_id && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user_id.substring(0, 8)}...
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedLogs.has(log.id) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            Event Details
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">Event ID:</span> {log.id}</div>
                            <div><span className="font-medium">Timestamp:</span> {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
                            <div><span className="font-medium">User ID:</span> {log.user_id || 'N/A'}</div>
                            <div><span className="font-medium">Resource:</span> {log.resource_type || 'N/A'}</div>
                            <div><span className="font-medium">Resource ID:</span> {log.resource_id || 'N/A'}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Hash:</span> 
                              <code className="text-xs bg-white px-1 py-0.5 rounded">
                                {log.hash.substring(0, 16)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(log.hash)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                          <div className="text-sm">
                            {Object.keys(log.metadata).length > 0 ? (
                              <pre className="bg-white p-2 rounded border text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-gray-500">No additional metadata</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {log.user_agent && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-1">User Agent</h4>
                          <p className="text-sm text-gray-600 font-mono break-all">
                            {log.user_agent}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Investigate
                        </Button>
                        <Button variant="outline" size="sm">
                          Create Alert
                        </Button>
                        <Button variant="outline" size="sm">
                          Add to Case
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
