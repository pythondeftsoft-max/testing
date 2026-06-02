
import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Eye, Star, ChevronLeft, ChevronRight, ChevronsLeft, Hash } from 'lucide-react';

interface DraggablePropertyImagesProps {
  images: string[];
  onImagesReorder: (images: string[]) => void;
  onImageRemove: (index: number) => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const HOLD_REPEAT_MS = 150;
const HOLD_INITIAL_MS = 400;

export const DraggablePropertyImages = ({ 
  images, 
  onImagesReorder, 
  onImageRemove 
}: DraggablePropertyImagesProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [imageRetries, setImageRetries] = useState<Map<string, number>>(new Map());
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [moveInputIndex, setMoveInputIndex] = useState<number | null>(null);
  const [moveInputValue, setMoveInputValue] = useState('');
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleImageError = useCallback((imageUrl: string) => {
    const currentRetries = imageRetries.get(imageUrl) || 0;
    if (currentRetries < MAX_RETRIES) {
      setImageRetries(prev => {
        const newMap = new Map(prev);
        newMap.set(imageUrl, currentRetries + 1);
        return newMap;
      });
      setTimeout(() => setRetryTrigger(prev => prev + 1), RETRY_DELAY);
    } else {
      setBrokenImages(prev => {
        const newSet = new Set(prev);
        newSet.add(imageUrl);
        return newSet;
      });
    }
  }, [imageRetries]);

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const items = Array.from(images);
    const [item] = items.splice(index, 1);
    items.unshift(item);
    onImagesReorder(items);
  };

  const moveImage = useCallback((index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const items = Array.from(images);
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    onImagesReorder(items);
  }, [images, onImagesReorder]);

  const moveToFront = (index: number) => {
    if (index <= 1) return;
    const items = Array.from(images);
    const [item] = items.splice(index, 1);
    items.splice(1, 0, item);
    onImagesReorder(items);
  };

  const moveToPosition = (fromIndex: number, toPosition: number) => {
    const targetIdx = Math.max(0, Math.min(toPosition - 1, images.length - 1));
    if (targetIdx === fromIndex) return;
    const items = Array.from(images);
    const [item] = items.splice(fromIndex, 1);
    items.splice(targetIdx, 0, item);
    onImagesReorder(items);
    setMoveInputIndex(null);
    setMoveInputValue('');
  };

  const startHold = (index: number, direction: 'left' | 'right') => {
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        moveImage(index, direction);
      }, HOLD_REPEAT_MS);
    }, HOLD_INITIAL_MS);
  };

  const stopHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{images.length} photos</span>
        <span className="text-xs text-muted-foreground">· Hover for actions · Hold arrows to slide</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${retryTrigger}`}
            className="relative aspect-square rounded-lg overflow-hidden border group transition-all hover:shadow-md hover:border-primary/50"
            style={{ borderColor: index === 0 ? 'hsl(var(--primary) / 0.5)' : undefined, borderWidth: index === 0 ? 2 : 1 }}
          >
            <img
              key={`img-${imageUrl}-${imageRetries.get(imageUrl) || 0}`}
              src={imageUrl}
              alt={`Property image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={() => handleImageError(imageUrl)}
            />

            {/* Position badge */}
            <div className={`absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow backdrop-blur-sm ${
              index === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-black/60 text-white'
            }`}>
              {index === 0 ? 'Main' : index + 1}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none" />

            {/* Top action bar */}
            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                size="sm"
                className="h-6 w-6 p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0"
                onClick={() => setPreviewImage(imageUrl)}
              >
                <Eye className="h-3 w-3 text-white" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onImageRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Move-to-position input overlay */}
            {moveInputIndex === index && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const pos = parseInt(moveInputValue);
                    if (!isNaN(pos)) moveToPosition(index, pos);
                  }}
                  className="flex gap-1"
                >
                  <Input
                    autoFocus
                    type="number"
                    min={1}
                    max={images.length}
                    value={moveInputValue}
                    onChange={(e) => setMoveInputValue(e.target.value)}
                    onBlur={() => { setMoveInputIndex(null); setMoveInputValue(''); }}
                    placeholder="#"
                    className="h-7 w-12 text-xs text-center bg-white/90 border-0 px-1"
                  />
                </form>
              </div>
            )}

            {/* Bottom action bar */}
            <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {index > 1 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white/90 hover:bg-white text-foreground shadow-sm"
                  onClick={() => moveToFront(index)}
                  title="Move to front"
                >
                  <ChevronsLeft className="h-3 w-3" />
                </Button>
              )}
              {index > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white/90 hover:bg-white text-foreground shadow-sm"
                  onClick={() => moveImage(index, 'left')}
                  onMouseDown={() => startHold(index, 'left')}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
              )}
              {index !== 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-6 flex-1 text-[10px] px-1 bg-white/90 hover:bg-white text-foreground shadow-sm"
                  onClick={() => setAsMain(index)}
                >
                  <Star className="h-2.5 w-2.5 mr-0.5" />
                  Main
                </Button>
              )}
              {index < images.length - 1 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white/90 hover:bg-white text-foreground shadow-sm"
                  onClick={() => moveImage(index, 'right')}
                  onMouseDown={() => startHold(index, 'right')}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-6 w-6 p-0 bg-white/90 hover:bg-white text-foreground shadow-sm"
                onClick={() => { setMoveInputIndex(index); setMoveInputValue(''); }}
                title="Jump to position"
              >
                <Hash className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={previewImage}
              alt="Property preview"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-6 right-6"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
