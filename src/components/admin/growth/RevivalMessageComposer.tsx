import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, X, Eye } from 'lucide-react';

interface Props {
  recipientCount: number;
  sampleName: string;
  onSend: (template: string) => void;
  onCancel: () => void;
  isSending: boolean;
}

const DEFAULT_TEMPLATE = `Hey {{first_name}}! It's OpenKey Housing 🏠 We noticed you haven't checked in lately. We have new listings and matches that might be perfect for you. Log in and take a look: https://openkey-housing-hub.lovable.app`;

export const RevivalMessageComposer = ({ recipientCount, sampleName, onSend, onCancel, isSending }: Props) => {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);

  const preview = template.replace(/\{\{first_name\}\}/g, sampleName);
  const charCount = preview.length;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Revival SMS
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Message Template</span>
            <Badge variant="outline">{`{{first_name}}`} = merge field</Badge>
          </div>
          <Textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={4}
            placeholder="Hey {{first_name}}! ..."
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{charCount}/1600 chars</span>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-3 w-3 mr-1" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </div>

        {showPreview && (
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
            <span className="text-xs text-muted-foreground block mb-1">Preview (for "{sampleName}"):</span>
            {preview}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Will send to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? 's' : ''} with 5s spacing
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSend(template)} disabled={isSending || !template.trim()}>
              {isSending ? 'Sending...' : `Send to ${recipientCount}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
