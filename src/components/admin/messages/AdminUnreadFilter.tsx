import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail } from 'lucide-react';

interface AdminUnreadFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminUnreadFilter: React.FC<AdminUnreadFilterProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <Mail className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Unread" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="landlord">Unread by Landlord</SelectItem>
        <SelectItem value="tenant">Unread by Tenant</SelectItem>
        <SelectItem value="none">All Read</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminUnreadFilter;
