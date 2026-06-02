
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { User } from 'lucide-react';
import ApplicationDetailsModal from './ApplicationDetailsModal';

interface ApplicationsTableProps {
  applications: any[];
  onApplicationSelect: (application: any) => void;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string, priorityPayment: boolean) => React.ReactNode;
}

const ApplicationsTable = ({ 
  applications, 
  onApplicationSelect, 
  formatDate, 
  getStatusBadge 
}: ApplicationsTableProps) => {
  return (
    <div className="rounded-lg border border-openkey-blue/20 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-subtle-blue hover:bg-gradient-subtle-blue">
            <TableHead className="font-semibold text-openkey-blue">Tenant</TableHead>
            <TableHead className="font-semibold text-openkey-blue">Property</TableHead>
            <TableHead className="font-semibold text-openkey-blue">Requested</TableHead>
            <TableHead className="font-semibold text-openkey-blue">Status</TableHead>
            <TableHead className="font-semibold text-openkey-blue">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application: any) => {
            return (
              <TableRow key={application.id} className="hover:bg-gradient-subtle-blue/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-blue-gold">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {application.profiles?.first_name} {application.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {application.profiles?.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-foreground">{application.properties?.address}</div>
                    <div className="text-sm text-openkey-gold font-semibold">
                      ${application.properties?.monthly_rent}/month
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(application.created_at)}</TableCell>
                <TableCell>
                  {getStatusBadge(application.status, application.priority_payment_made)}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="blue" 
                        size="sm"
                        onClick={() => onApplicationSelect(application)}
                        className="shadow-sm"
                      >
                        View Profile
                      </Button>
                    </DialogTrigger>
                    <ApplicationDetailsModal application={application} />
                  </Dialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApplicationsTable;
