import React, { useState } from 'react';
import { Lightbulb, X, Send, Link2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInnovationIdea } from '@/hooks/useInnovationIdeas';
import { PLATFORM_OPTIONS } from '@/types/innovation';

export function QuickCaptureWidget() {
  const [open, setOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [description, setDescription] = useState('');
  
  const createIdea = useCreateInnovationIdea();

  const detectPlatform = (url: string) => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    return 'other';
  };

  const handleUrlChange = (url: string) => {
    setSourceUrl(url);
    if (url) {
      const detectedPlatform = detectPlatform(url);
      setPlatform(detectedPlatform);
    }
  };

  const handleSubmit = async () => {
    if (!sourceUrl && !description) {
      return;
    }

    await createIdea.mutateAsync({
      source_url: sourceUrl || null,
      source_platform: (platform as any) || null,
      raw_description: description || null,
    });

    // Reset form
    setSourceUrl('');
    setPlatform('');
    setDescription('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:from-amber-100 hover:to-orange-100"
        >
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <span className="hidden sm:inline">Capture Idea</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Capture Innovation Idea
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Video/Post URL
            </Label>
            <Input
              id="url"
              placeholder="Paste TikTok, Instagram, YouTube URL..."
              value={sourceUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          {sourceUrl && (
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quick Notes (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="What caught your attention? What could this do for OpenKey?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>Next:</strong> Once submitted, n8n will analyze the video content and AI will evaluate its potential for OpenKey.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={(!sourceUrl && !description) || createIdea.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {createIdea.isPending ? 'Submitting...' : 'Submit Idea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
