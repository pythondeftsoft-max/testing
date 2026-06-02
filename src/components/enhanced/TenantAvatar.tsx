
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantAvatarProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TenantAvatar = ({ 
  firstName, 
  lastName, 
  email, 
  imageUrl, 
  size = 'md',
  className 
}: TenantAvatarProps) => {
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'T';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};
