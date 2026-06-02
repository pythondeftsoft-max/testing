import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { useAdminUserSearch, type AdminUserSearchResult } from '@/hooks/useAdminUserSearch';

interface UserSearchAutocompleteProps {
  onUserSelect: (user: AdminUserSearchResult) => void;
  placeholder?: string;
  selectedUser?: AdminUserSearchResult | null;
}

const UserSearchAutocomplete: React.FC<UserSearchAutocompleteProps> = ({
  onUserSelect,
  placeholder = "Search users by name or email...",
  selectedUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [], isLoading } = useAdminUserSearch(searchQuery);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.length >= 2);
  };

  const handleUserClick = (user: AdminUserSearchResult) => {
    onUserSelect(user);
    setSearchQuery(selectedUser ? `${user.first_name} ${user.last_name}` : '');
    setShowDropdown(false);
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType.toLowerCase()) {
      case 'landlord':
        return 'bg-blue-100 text-blue-800';
      case 'tenant':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-10"
          onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
        />
      </div>

      {showDropdown && (
        <Card ref={dropdownRef} className="absolute z-50 w-full mt-1 max-h-64 overflow-auto shadow-lg">
          <div className="p-2">
            {isLoading && searchQuery.length >= 2 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.first_name} {user.last_name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={getUserTypeColor(user.user_type)}
                          >
                            {user.user_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default UserSearchAutocomplete;