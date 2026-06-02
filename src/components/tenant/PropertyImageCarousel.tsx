import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon, X, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PropertyImageCarouselProps {
  photos: string[];
  videoTourUrl?: string | null;
  className?: string;
}

const PropertyImageCarousel: React.FC<PropertyImageCarouselProps> = ({
  photos,
  videoTourUrl,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const validPhotos = photos.filter((_, i) => !imageError.has(i));
  const hasPhotos = validPhotos.length > 0;

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleImageError = (index: number) => {
    setImageError((prev) => new Set(prev).add(index));
  };

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  if (!hasPhotos) {
    return (
      <div className={cn("relative h-40 bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos available</p>
        </div>
        {videoTourUrl && (
          <a
            href={videoTourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3"
          >
            <Button size="sm" variant="secondary" className="gap-2">
              <Play className="h-4 w-4" />
              Video Tour
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative group", className)}>
        {/* Smaller Main Image - Clickable */}
        <div 
          className="relative h-48 overflow-hidden rounded-lg bg-muted cursor-pointer"
          onClick={openLightbox}
        >
          <img
            src={photos[currentIndex]}
            alt={`Property photo ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
            onError={() => handleImageError(currentIndex)}
          />

          {/* Expand Icon Overlay */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
            <Expand className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Photo Counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium">
              {currentIndex + 1} / {photos.length}
            </div>
          )}

          {/* Video Tour Button */}
          {videoTourUrl && (
            <a
              href={videoTourUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" variant="secondary" className="gap-2 bg-background/80 hover:bg-background h-7 text-xs">
                <Play className="h-3 w-3" />
                Video
              </Button>
            </a>
          )}
        </div>

        {/* Thumbnail Strip - Smaller */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex-shrink-0 w-12 h-9 rounded overflow-hidden border-2 transition-all",
                  currentIndex === index
                    ? "border-primary ring-1 ring-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-background/95 backdrop-blur-sm border-none">
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Main Lightbox Image */}
            <div className="relative aspect-video">
              <img
                src={photos[currentIndex]}
                alt={`Property photo ${currentIndex + 1}`}
                className="w-full h-full object-contain"
                onError={() => handleImageError(currentIndex)}
              />

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Photo Counter */}
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-md px-3 py-1.5 text-sm font-medium">
                  {currentIndex + 1} / {photos.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip in Lightbox */}
            {photos.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto justify-center">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all",
                      currentIndex === index
                        ? "border-primary ring-1 ring-primary"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(index)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyImageCarousel;
