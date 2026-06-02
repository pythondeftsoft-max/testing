import React from 'react';
import { AgentActivity, agentDefinitions } from './agentDefinitions';
import { cn } from '@/lib/utils';

interface AgentCommsThreadProps {
  communications: AgentActivity[];
  currentAgentId: string;
}

export const AgentCommsThread = ({ communications, currentAgentId }: AgentCommsThreadProps) => {
  if (communications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No inter-agent communications yet
      </div>
    );
  }

  const currentAgent = agentDefinitions.find(a => a.id === currentAgentId);

  return (
    <div className="space-y-3">
      {communications.map((msg) => {
        const isFromCurrent = !msg.relatedAgent || msg.action === 'Sent';
        const senderAgent = isFromCurrent
          ? currentAgent
          : agentDefinitions.find(a => a.name === msg.relatedAgent);
        const SenderIcon = senderAgent?.icon;

        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2.5',
              isFromCurrent ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', senderAgent?.bgClass || 'bg-muted')}>
              {SenderIcon && <SenderIcon className={cn('h-3.5 w-3.5', senderAgent?.colorClass)} />}
            </div>
            <div className={cn(
              'max-w-[75%] rounded-xl px-3 py-2',
              isFromCurrent
                ? 'bg-primary/10 rounded-tr-sm'
                : 'bg-muted rounded-tl-sm'
            )}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold text-foreground">
                  {senderAgent?.name || 'Unknown'}
                </span>
                {msg.relatedAgent && !isFromCurrent && (
                  <span className="text-[10px] text-muted-foreground">→ {currentAgent?.name}</span>
                )}
              </div>
              <p className="text-sm text-foreground">{msg.detail}</p>
              <span className="text-[10px] text-muted-foreground/60 block mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
