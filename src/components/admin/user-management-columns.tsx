import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, MoreHorizontal, RotateCcw, Trash2, UserMinus } from "lucide-react";

export interface UserManagementData {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  company_name?: string;
  phone?: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  status: string;
  tenant_info?: {
    housing_status: 'housed' | 'searching';
    is_inactive: boolean;
  };
}

interface UserManagementColumnsProps {
  onView: (user: UserManagementData) => void;
  onEdit: (user: UserManagementData) => void;
  onDelete: (user: UserManagementData) => void;
  onResetPassword: (user: UserManagementData) => void;
  onImpersonate: (user: UserManagementData) => void;
}

export const createUserManagementColumns = ({
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  onImpersonate
}: UserManagementColumnsProps): ColumnDef<UserManagementData>[] => [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div>
          <div className="font-medium">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "user_type",
    header: "Type",
    cell: ({ row }) => {
      const userType = row.getValue("user_type") as string;
      const getTypeColor = (type: string) => {
        switch (type) {
          case 'admin': return 'bg-red-100 text-red-800';
          case 'tenant': return 'bg-blue-100 text-blue-800';
          case 'landlord': return 'bg-green-100 text-green-800';
          case 'individual_owner': return 'bg-green-100 text-green-800';
          case 'property_manager': return 'bg-purple-100 text-purple-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      };
      
      const getTypeLabel = (type: string) => {
        switch (type) {
          case 'individual_owner': return 'Individual Owner';
          case 'property_manager': return 'Property Manager';
          default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
      };

      return (
        <Badge className={getTypeColor(userType)} variant="secondary">
          {getTypeLabel(userType)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "housing_status",
    header: "Housing Status",
    cell: ({ row }) => {
      const user = row.original;
      if (user.user_type !== 'tenant' || !user.tenant_info) {
        return null;
      }
      
      const { housing_status } = user.tenant_info;
      return (
        <Badge 
          variant={housing_status === 'housed' ? 'default' : 'secondary'}
          className={housing_status === 'housed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
        >
          {housing_status === 'housed' ? 'Housed' : 'Searching'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "last_sign_in_at",
    header: "Last Sign-in",
    cell: ({ row }) => {
      const lastSignIn = row.getValue("last_sign_in_at") as string | null;
      if (!lastSignIn) {
        return <div className="text-sm text-muted-foreground">Never</div>;
      }
      const date = new Date(lastSignIn);
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      const date = new Date(createdAt);
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Account Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'active': return 'bg-green-100 text-green-800';
          case 'invited': return 'bg-blue-100 text-blue-800';
          case 'suspended': return 'bg-red-100 text-red-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      };

      return (
        <Badge className={getStatusColor(status)} variant="secondary">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      const isAdmin = user.user_type === 'admin';

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(user)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(user)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              {!isAdmin && (
                <DropdownMenuItem onClick={() => onImpersonate(user)}>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Impersonate User
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(user)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];