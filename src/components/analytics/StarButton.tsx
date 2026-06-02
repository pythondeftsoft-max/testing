import React from 'react';
import { Star } from 'lucide-react';

interface StarButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StarButton: React.FC<StarButtonProps> = ({
  isFavorited,
  onToggle,
  className = '',
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-5 h-5';
      case 'lg':
        return 'w-7 h-7';
      default:
        return 'w-6 h-6';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`
        ${getSizeClasses()}
        flex items-center justify-center rounded-full transition-all duration-200
        ${isFavorited 
          ? 'bg-openkey-gold text-white shadow-md' 
          : 'bg-white/80 hover:bg-openkey-gold/10 text-muted-foreground hover:text-openkey-gold border border-gray-200 hover:border-openkey-gold/30'
        }
        hover:scale-110
        ${className}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star className={`${getIconSize()} ${isFavorited ? 'fill-current' : ''}`} />
    </button>
  );
};

export default StarButton;