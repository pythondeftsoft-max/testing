import React, { useState } from 'react';
import { AgentDoc } from './agentDefinitions';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface AgentDocsPanelProps {
  docs: AgentDoc[];
}

const renderMarkdown = (md: string) => {
  const lines = md.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-foreground mb-2">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.slice(3)}</h2>;
    if (line.startsWith('- ')) {
      const content = sanitizeHtml(line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
      return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="text-sm text-muted-foreground italic">{line.replace(/\*/g, '')}</p>;
    if (line.match(/^\d+\./)) {
      const content = sanitizeHtml(line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
      return <li key={i} className="text-sm text-muted-foreground ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    if (line.trim() === '') return <div key={i} className="h-1" />;
    const content = sanitizeHtml(line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
    return <p key={i} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: content }} />;
  });
};

export const AgentDocsPanel = ({ docs }: AgentDocsPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (docs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No documents saved yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => {
        const isExpanded = expandedId === doc.id;
        const snippet = doc.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ').slice(0, 100);
        return (
          <div key={doc.id} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : doc.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                {!isExpanded && (
                  <p className="text-xs text-muted-foreground truncate">{snippet}...</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(doc.updatedAt).toLocaleDateString()}
              </span>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20">
                {renderMarkdown(doc.content)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
