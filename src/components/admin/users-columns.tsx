
import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface UsersColumnsProps {
  onViewDetails: (user: User) => void;
}

export const createUsersColumns = ({ onViewDetails }: UsersColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return <Badge variant="outline">{role}</Badge>;
    },
  },
  {
    accessorKey: "tenant_info.housing_status",
    header: "Housing Status",
    cell: ({ row }) => {
      const user = row.original;
      if (user.role !== 'tenant' || !user.tenant_info) {
        return null;
      }
      const status = user.tenant_info.housing_status;
      return <Badge variant="secondary">{status}</Badge>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(user)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </Button>
      );
    },
  },
];
