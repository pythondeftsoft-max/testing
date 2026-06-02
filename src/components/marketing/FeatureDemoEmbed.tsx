import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

interface FeatureDemoEmbedProps {
  featureKey: string;
  className?: string;
}

/**
 * Resolves a feature_key (e.g. "hap-batching") to an embeddable demo video.
 * Renders nothing if no active demo is configured for the key.
 * Supports Loom and Vimeo URLs (auto-converts share URLs to embed URLs).
 */
function toEmbedUrl(rawUrl: string): string {
  // Loom: https://www.loom.com/share/{id} → https://www.loom.com/embed/{id}
  const loom = rawUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;

  // Vimeo: https://vimeo.com/{id} → https://player.vimeo.com/video/{id}
  const vimeo = rawUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // YouTube: https://youtu.be/{id} or https://youtube.com/watch?v={id} → embed
  const ytShort = rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  const ytLong = rawUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (ytLong) return `https://www.youtube.com/embed/${ytLong[1]}`;

  return rawUrl;
}

export function FeatureDemoEmbed({ featureKey, className }: FeatureDemoEmbedProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-demo', featureKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_demos')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !data) return null;

  const embedUrl = toEmbedUrl(data.video_url);

  return (
    <Card className={`overflow-hidden ${className || ''}`}>
      <div className="aspect-video bg-muted relative">
        <iframe
          src={embedUrl}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={data.title}
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{data.title}</h4>
            {data.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
            )}
          </div>
          {data.duration_seconds && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.floor(data.duration_seconds / 60)}:{String(data.duration_seconds % 60).padStart(2, '0')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
