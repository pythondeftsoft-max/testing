import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface AdminMessageSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminMessageSearch: React.FC<AdminMessageSearchProps> = ({ value, onChange }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Search by tenant, landlord, property address..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

export default AdminMessageSearch;
