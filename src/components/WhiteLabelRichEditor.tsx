import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bold, Italic, Link, Image, Code, Eye } from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const WhiteLabelRichEditor = ({ value, onChange, placeholder, rows = 8 }: RichEditorProps) => {
  const [activeTab, setActiveTab] = useState('edit');

  const insertMarkdown = (before: string, after = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const formatPreview = (text: string) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['strong', 'em', 'code', 'a', 'br'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Content Editor</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertMarkdown('**', '**')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertMarkdown('*', '*')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertMarkdown('`', '`')}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertMarkdown('[Link Text](', ')')}
              title="Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insertMarkdown('![Alt Text](', ')')}
              title="Image"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="mt-4">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="font-mono text-sm"
            />
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div 
              className="min-h-32 p-4 border rounded-md bg-background prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatPreview(value || 'Nothing to preview yet...') 
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WhiteLabelRichEditor;