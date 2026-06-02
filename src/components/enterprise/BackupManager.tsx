import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackupManager } from '@/hooks/useBackupManager';
import { Database, Download, Upload, Trash, RefreshCw, Calendar, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const BackupManager = () => {
  const {
    createBackup,
    restoreBackup,
    cleanupOldBackups,
    backups,
    backupsLoading,
    refetchBackups,
    isCreating,
    isRestoring,
    isCleaning,
  } = useBackupManager();

  const handleCreateBackup = () => {
    createBackup.mutate({ 
      backup_type: 'full', 
      backup_scope: 'database' 
    });
  };

  const handleRestoreBackup = (backupId: string) => {
    if (confirm('Are you sure you want to restore this backup? This action cannot be undone.')) {
      restoreBackup.mutate(backupId);
    }
  };

  const handleCleanup = () => {
    if (confirm('Are you sure you want to cleanup old backups? This will permanently delete expired backups.')) {
      cleanupOldBackups.mutate();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Enterprise Backup Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="backups" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="backups">Backup List</TabsTrigger>
              <TabsTrigger value="create">Create Backup</TabsTrigger>
            </TabsList>

            <TabsContent value="backups" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recent Backups</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => refetchBackups()}
                    variant="outline"
                    size="sm"
                    disabled={backupsLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${backupsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleCleanup}
                    variant="outline"
                    size="sm"
                    disabled={isCleaning}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Cleanup Old
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {backupsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading backups...</p>
                  </div>
                ) : backups.length > 0 ? (
                  backups.map((backup: any) => (
                    <Card key={backup.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{backup.backup_type} - {backup.backup_scope}</span>
                            <Badge variant={getStatusColor(backup.status) as any}>
                              {backup.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Created: {formatDistanceToNow(new Date(backup.created_at))} ago</div>
                            {backup.file_size_bytes && (
                              <div>Size: {formatFileSize(backup.file_size_bytes)}</div>
                            )}
                            {backup.compression_ratio && (
                              <div>Compression: {Math.round(backup.compression_ratio * 100)}%</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {backup.status === 'completed' && (
                            <Button
                              onClick={() => handleRestoreBackup(backup.id)}
                              variant="outline"
                              size="sm"
                              disabled={isRestoring}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No backups found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Backup Type</label>
                      <Select defaultValue="full">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Backup</SelectItem>
                          <SelectItem value="incremental">Incremental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Backup Scope</label>
                      <Select defaultValue="database">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="database">Database</SelectItem>
                          <SelectItem value="storage">Storage Files</SelectItem>
                          <SelectItem value="configs">Configurations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleCreateBackup}
                    disabled={isCreating}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isCreating ? 'Creating Backup...' : 'Create Backup'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};