import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useSendAdminEmail } from '@/hooks/useSendAdminEmail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WhiteLabelEmailTemplate from '@/components/WhiteLabelEmailTemplate';
import { z } from 'zod';

interface SendEmailDialogProps {
  template: {
    id: string;
    name: string;
    slug: string;
    subject_template: string;
    html_template: string;
    preheader?: string;
    cta_text?: string;
  };
}

// Helper function to extract template variables
const extractTemplateVariables = (text: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
};

const emailSchema = z.string().email('Invalid email address');

export const SendEmailDialog: React.FC<SendEmailDialogProps> = ({ template }) => {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [emailError, setEmailError] = useState('');
  
  const sendEmail = useSendAdminEmail();

  // Extract all variables from subject and HTML
  const templateVariables = useMemo(() => {
    const subjectVars = extractTemplateVariables(template.subject_template || '');
    const htmlVars = extractTemplateVariables(template.html_template || '');
    return [...new Set([...subjectVars, ...htmlVars])];
  }, [template.subject_template, template.html_template]);

  const handleSendEmail = async () => {
    // Validate email
    const emailValidation = emailSchema.safeParse(recipientEmail);
    if (!emailValidation.success) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');

    // Check if all variables are filled
    const missingVars = templateVariables.filter(v => !variables[v]);
    if (missingVars.length > 0) {
      setEmailError(`Please fill in all required variables: ${missingVars.join(', ')}`);
      return;
    }

    try {
      await sendEmail.mutateAsync({
        templateSlug: template.slug,
        recipientEmail,
        contextVariables: variables
      });
      
      // Reset form and close dialog on success
      setRecipientEmail('');
      setVariables({});
      setOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Generate preview content with replaced variables
  const getPreviewContent = () => {
    let content = template.html_template || '';
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    return content;
  };

  const getPreviewSubject = () => {
    let subject = template.subject_template || '';
    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    return subject;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Send email">
          <Mail className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email: {template.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* Recipient Email */}
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="john.smith@example.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setEmailError('');
                }}
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            {/* Template Variables */}
            {templateVariables.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Template Variables *</Label>
                <div className="grid gap-3 p-4 bg-muted/30 rounded-lg border">
                  {templateVariables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={`var-${variable}`} className="text-sm capitalize">
                        {variable.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={`var-${variable}`}
                        placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                        value={variables[variable] || ''}
                        onChange={(e) => setVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={sendEmail.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sendEmail.isPending || !recipientEmail}
              >
                {sendEmail.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <WhiteLabelEmailTemplate
                subject={getPreviewSubject()}
                preheader={template.preheader}
                content={getPreviewContent()}
                ctaText={template.cta_text || 'View Details'}
                ctaUrl="#preview-link"
                recipientName={variables.userName || 'Recipient'}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-900">
              <strong>Preview:</strong> This shows how the email will appear with your entered variables and white-label branding. Unfilled variables will show as placeholders.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
