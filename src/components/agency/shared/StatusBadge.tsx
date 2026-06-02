import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'voucher'
  | 'inspection'
  | 'rfta'
  | 'hap'
  | 'lease'
  | 'recert'
  | 'claim'
  | 'generic';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline';

interface Mapping {
  variant: Variant;
  label?: string;
}

const MAPS: Record<StatusType, Record<string, Mapping>> = {
  voucher: {
    active: { variant: 'success' },
    issued: { variant: 'default' },
    searching: { variant: 'warning' },
    leased_up: { variant: 'success', label: 'Leased Up' },
    expired: { variant: 'secondary' },
    pending: { variant: 'warning' },
    terminated: { variant: 'destructive' },
  },
  inspection: {
    scheduled: { variant: 'default' },
    pass: { variant: 'success', label: 'Passed' },
    passed: { variant: 'success' },
    fail: { variant: 'destructive', label: 'Failed' },
    failed: { variant: 'destructive' },
    pending: { variant: 'warning' },
    in_progress: { variant: 'default', label: 'In Progress' },
    cancelled: { variant: 'secondary' },
  },
  rfta: {
    submitted: { variant: 'default' },
    pending: { variant: 'warning' },
    pending_review: { variant: 'warning', label: 'Pending Review' },
    approved: { variant: 'success' },
    rejected: { variant: 'destructive' },
    needs_changes: { variant: 'warning', label: 'Needs Changes' },
  },
  hap: {
    draft: { variant: 'secondary' },
    pending_signature: { variant: 'warning', label: 'Pending Signature' },
    reviewed: { variant: 'default' },
    approved: { variant: 'success' },
    disbursed: { variant: 'success' },
    cancelled: { variant: 'destructive' },
  },
  lease: {
    pending: { variant: 'warning' },
    pending_signature: { variant: 'warning', label: 'Pending Signature' },
    signed: { variant: 'success' },
    active: { variant: 'success' },
    expired: { variant: 'secondary' },
    terminated: { variant: 'destructive' },
  },
  recert: {
    initiated: { variant: 'default' },
    notice_sent: { variant: 'default', label: 'Notice Sent' },
    docs_requested: { variant: 'warning', label: 'Docs Requested' },
    under_review: { variant: 'warning', label: 'Under Review' },
    approved: { variant: 'success' },
    overdue: { variant: 'destructive' },
    pending: { variant: 'warning' },
  },
  claim: {
    submitted: { variant: 'default' },
    under_review: { variant: 'warning', label: 'Under Review' },
    approved: { variant: 'success' },
    paid: { variant: 'success' },
    rejected: { variant: 'destructive' },
  },
  generic: {},
};

export interface StatusBadgeProps {
  status: string | null | undefined;
  type?: StatusType;
  className?: string;
}

const humanize = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Single source of truth for status pills across the agency portal.
 * Maps a status string + type → consistent variant and label.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'generic',
  className,
}) => {
  if (!status) {
    return (
      <Badge variant="secondary" className={cn(className)}>
        Unknown
      </Badge>
    );
  }
  const key = String(status).toLowerCase();
  const mapping = MAPS[type]?.[key];
  const variant: Variant = mapping?.variant ?? 'default';
  const label = mapping?.label ?? humanize(key);

  return (
    <Badge variant={variant as any} className={cn(className)}>
      {label}
    </Badge>
  );
};

export default StatusBadge;
