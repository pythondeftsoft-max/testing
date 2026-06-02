import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTemplateSettings, saveTemplateSettings } from './templateSampleData';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  templateLabel: string;
}

const SCHEMA_TYPES = ['Article', 'FAQPage', 'LocalBusiness', 'WebPage', 'Product', 'HowTo'] as const;

const FIELDS = [
  { key: 'cta_primary_text', label: 'CTA Primary Text', placeholder: 'e.g. Get Housing Help in {city}' },
  { key: 'cta_secondary_text', label: 'CTA Secondary Text', placeholder: 'e.g. I\'m a landlord' },
  { key: 'cta_primary_url', label: 'CTA Primary URL Pattern', placeholder: 'e.g. /find-home' },
  { key: 'cta_secondary_url', label: 'CTA Secondary URL Pattern', placeholder: 'e.g. /auth' },
  { key: 'template_description', label: 'Template Description', placeholder: 'Description shown in gallery' },
] as const;

export const TemplateSettingsDialog: React.FC<Props> = ({ open, onOpenChange, templateName, templateLabel }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSettings(getTemplateSettings(templateName));
    }
  }, [open, templateName]);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveTemplateSettings(templateName, settings);
    toast.success(`${templateLabel} defaults saved`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Defaults — {templateLabel}</DialogTitle>
          <DialogDescription>
            These defaults pre-fill the editor when creating new content with this template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={settings[f.key] || ''}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label>Default Schema Type</Label>
            <Select value={settings.schema_type || ''} onValueChange={(v) => update('schema_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select schema type" />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Defaults</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
