import React, { useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bold, 
  Italic, 
  Heading2, 
  Heading3, 
  List, 
  Link, 
  Eye,
  Edit3,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const BlogContentEditor = ({ value, onChange, placeholder }: BlogContentEditorProps) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Convert HTML to markdown (for rich text paste from ChatGPT, etc.)
  const convertHtmlToMarkdown = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = DOMPurify.sanitize(html);
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      const children = Array.from(el.childNodes).map(processNode).join('');
      
      switch (tag) {
        case 'strong':
        case 'b':
          return `**${children}**`;
        case 'em':
        case 'i':
          return `*${children}*`;
        case 'h1':
        case 'h2':
          return `\n## ${children}\n`;
        case 'h3':
        case 'h4':
          return `\n### ${children}\n`;
        case 'li':
          return `- ${children}\n`;
        case 'ul':
        case 'ol':
          return `\n${children}`;
        case 'p':
          return `${children}\n\n`;
        case 'br':
          return '\n';
        case 'a':
          const href = el.getAttribute('href') || '';
          return href ? `[${children}](${href})` : children;
        case 'code':
          return `\`${children}\``;
        case 'pre':
          return `\n\`\`\`\n${children}\n\`\`\`\n`;
        default:
          return children;
      }
    };
    
    // Clean up excessive newlines
    return processNode(temp).trim().replace(/\n{3,}/g, '\n\n');
  };

  const detectAndFormatStructure = (text: string): string => {
    const lines = text.split('\n');
    
    // Check if custom markers are being used in the document
    const hasCustomMarkers = lines.some(line => 
      /^[""]?H[123](_BODY)?[""]?(\s|$)/i.test(line.trim())
    );
    
    const processedLines = lines.map((line, index) => {
      const trimmed = line.trim();
      const nextLine = lines[index + 1]?.trim() || '';
      
      // Skip empty lines
      if (!trimmed) return line;
      
      // Skip already formatted lines (markdown headings)
      if (trimmed.startsWith('#')) return line;
      
      // === CUSTOM MARKER DETECTION (highest priority) ===
      // Match "H1" Title, "H2" Title, "H3" Title patterns (with or without quotes)
      const h1Match = trimmed.match(/^[""]?H1[""]?\s+(.+)$/i);
      if (h1Match) return '# ' + h1Match[1];
      
      const h2Match = trimmed.match(/^[""]?H2[""]?\s+(.+)$/i);
      if (h2Match) return '## ' + h2Match[1];
      
      const h3Match = trimmed.match(/^[""]?H3[""]?\s+(.+)$/i);
      if (h3Match) return '### ' + h3Match[1];
      
      // Remove body markers entirely (they're just indicators, not content)
      if (/^[""]?H[123]_BODY[""]?$/i.test(trimmed)) return '';
      
      // === BULLET POINTS (always convert) ===
      if (/^[•]\s/.test(trimmed)) {
        return '- ' + trimmed.replace(/^[•]\s*/, '');
      }
      if (/^\d+[\.\)]\s/.test(trimmed)) {
        return '- ' + trimmed.replace(/^\d+[\.\)]\s*/, '');
      }
      
      // === SMART HEADING DETECTION ===
      // ONLY run if NO custom markers were found in the document
      // This prevents questions like "Why did my rent change?" from becoming headings
      if (!hasCustomMarkers) {
        const isShort = trimmed.length < 60;
        const endsLikeTitle = /[A-Za-z0-9\?]$/.test(trimmed);
        const nextIsBody = nextLine.length > 80 || nextLine === '';
        
        if (isShort && endsLikeTitle && nextIsBody) {
          return '## ' + trimmed;
        }
      }
      
      return line;
    });
    
    // Filter out empty strings (removed body markers) but keep empty lines from original
    return processedLines.filter((line, i) => line !== '' || lines[i].trim() === '').join('\n');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Try HTML first (preserves rich formatting from ChatGPT, etc.)
    const htmlContent = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text');
    
    let formattedText: string;
    
    if (htmlContent && htmlContent.trim()) {
      // Convert HTML to markdown
      formattedText = convertHtmlToMarkdown(htmlContent);
    } else {
      // Fall back to plain text detection
      formattedText = detectAndFormatStructure(plainText);
    }
    
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + formattedText);
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + formattedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleAutoFormat = () => {
    const formattedText = detectAndFormatStructure(value);
    onChange(formattedText);
  };

  const insertMarkdown = (before: string, after = '', blockLevel = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;

    if (blockLevel && start > 0 && value[start - 1] !== '\n') {
      // For block-level elements (headings), ensure we're on a new line
      newText = value.substring(0, start) + '\n' + before + selectedText + after + value.substring(end);
      newCursorPos = start + 1 + before.length + selectedText.length;
    } else {
      newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
      newCursorPos = start + before.length + selectedText.length;
    }
    
    onChange(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const formatMarkdownToHtml = (text: string): string => {
    if (!text) return '<p class="text-muted-foreground italic">Nothing to preview yet...</p>';
    
    let formatted = text
      // Headings (must be at start of line) - order matters: ### before ## before #
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-primary">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-foreground">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists (simple bullet points)
      .replace(/^[-•] (.+)$/gm, '<li class="ml-4">$1</li>')
      // Wrap consecutive li elements in ul
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-3">$&</ul>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p class="my-3">')
      // Single newlines within paragraphs
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!formatted.startsWith('<h') && !formatted.startsWith('<ul') && !formatted.startsWith('<p')) {
      formatted = '<p class="my-3">' + formatted + '</p>';
    }
    
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'a', 'br', 'ul', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  };

  const toolbarButtons = [
    { icon: Heading2, label: 'Heading 2', action: () => insertMarkdown('## ', '', true) },
    { icon: Heading3, label: 'Heading 3', action: () => insertMarkdown('### ', '', true) },
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: List, label: 'List Item', action: () => insertMarkdown('- ', '', true) },
    { icon: Link, label: 'Link', action: () => insertMarkdown('[', '](url)') },
  ];

  return (
    <div className="space-y-2">
      <Label>Content</Label>
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/30">
          <div className="flex items-center gap-0.5">
            {toolbarButtons.map(({ icon: Icon, label, action }) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="sm"
                onClick={action}
                className="h-8 w-8 p-0"
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAutoFormat}
              className="h-8 px-2 gap-1"
              title="Auto-format content (detect headings and lists)"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">Auto-Format</span>
            </Button>
          </div>
          
          {/* Edit/Preview Toggle */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
            <TabsList className="h-8">
              <TabsTrigger value="edit" className="text-xs px-3 h-7">
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs px-3 h-7">
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Content Area */}
        <div className={cn("min-h-[300px]", activeTab === 'preview' && "p-4")}>
          {activeTab === 'edit' ? (
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder || "Write your blog post content here...\n\nUse the toolbar above to format:\n## For headings\n**For bold text**\n- For bullet points\n\nOr just paste content - headings and lists will be auto-detected!"}
              className="min-h-[300px] border-0 rounded-none focus-visible:ring-0 font-mono text-sm resize-none"
            />
          ) : (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(value) }}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Supports markdown: **bold**, *italic*, ## Heading, - lists, [link](url). Paste content to auto-detect structure, or click ✨ Auto-Format.
      </p>
    </div>
  );
};
