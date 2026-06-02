import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { usePortfolioAssetDocuments } from '@/hooks/useAssetDocuments';
import { formatDate } from '@/lib/utils';

interface DocumentExpirationNotificationsProps {
  portfolioId: string;
  onDocumentClick?: (documentId: string) => void;
}

export const DocumentExpirationNotifications: React.FC<DocumentExpirationNotificationsProps> = ({
  portfolioId,
  onDocumentClick,
}) => {
  const { data: documents = [] } = usePortfolioAssetDocuments(portfolioId);

  // Filter for expiring documents (within 30 days)
  const expiringDocuments = documents.filter(doc => {
    if (!doc.expiration_date) return false;
    const expDate = new Date(doc.expiration_date);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });

  // Filter for expired documents
  const expiredDocuments = documents.filter(doc => {
    if (!doc.expiration_date) return false;
    return new Date(doc.expiration_date) < new Date();
  });

  const totalNotifications = expiringDocuments.length + expiredDocuments.length;

  if (totalNotifications === 0) {
    return null;
  }

  return (
    <Card className="border-warning">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <Bell className="h-5 w-5" />
          Document Notifications
          <Badge variant="secondary" className="ml-auto">
            {totalNotifications}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Expired Documents */}
        {expiredDocuments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Expired Documents</span>
              <Badge variant="destructive" className="text-xs">
                {expiredDocuments.length}
              </Badge>
            </div>
            {expiredDocuments.slice(0, 3).map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 bg-destructive/5 rounded-lg cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => onDocumentClick?.(doc.id)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium text-sm">{doc.document_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Expired {formatDate(new Date(doc.expiration_date!))}
                    </div>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">
                  Expired
                </Badge>
              </div>
            ))}
            {expiredDocuments.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{expiredDocuments.length - 3} more expired documents
              </div>
            )}
          </div>
        )}

        {/* Expiring Documents */}
        {expiringDocuments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-warning">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Expiring Soon</span>
              <Badge variant="outline" className="text-xs border-warning text-warning">
                {expiringDocuments.length}
              </Badge>
            </div>
            {expiringDocuments.slice(0, 3).map(doc => {
              const expDate = new Date(doc.expiration_date!);
              const now = new Date();
              const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-warning/5 rounded-lg cursor-pointer hover:bg-warning/10 transition-colors"
                  onClick={() => onDocumentClick?.(doc.id)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-warning" />
                    <div>
                      <div className="font-medium text-sm">{doc.document_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expires {formatDate(expDate)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-warning text-warning">
                    {diffDays} days
                  </Badge>
                </div>
              );
            })}
            {expiringDocuments.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{expiringDocuments.length - 3} more expiring documents
              </div>
            )}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full">
          View All Notifications
        </Button>
      </CardContent>
    </Card>
  );
};