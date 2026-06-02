import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Building2, 
  Check, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign,
  Bed,
  Calendar,
  MessageSquare,
  Send,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';
import type { CommandMatch } from '@/hooks/useMatchCommandCenter';
import { format } from 'date-fns';

interface MatchNote {
  id: string;
  text: string;
  timestamp: Date;
}

interface MatchDetailDrawerProps {
  match: CommandMatch | null;
  open: boolean;
  onClose: () => void;
  onApprove: (match: CommandMatch) => void;
  onReject: (match: CommandMatch) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export const MatchDetailDrawer = ({
  match,
  open,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: MatchDetailDrawerProps) => {
  const [notes, setNotes] = useState<MatchNote[]>([]);
  const [noteText, setNoteText] = useState('');

  if (!match) return null;

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      timestamp: new Date(),
    }]);
    setNoteText('');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            Match Details
          </SheetTitle>
          <SheetDescription>
            {match.tenant_name} ↔ {match.property_address}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="score">Score</TabsTrigger>
            <TabsTrigger value="notes">Notes {notes.length > 0 && `(${notes.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(match)}
                disabled={isApproving}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onReject(match)}
                disabled={isRejecting}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>

            {/* Tenant Card */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{match.tenant_name}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {match.tenant_voucher && (
                        <Badge variant="secondary" className="text-xs">Voucher Holder</Badge>
                      )}
                    </div>
                    
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>Budget: {match.tenant_budget ? formatCurrency(match.tenant_budget) : 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Bed className="w-4 h-4" />
                        <span>Needs: {match.tenant_bedrooms?.join(', ') || 'Any'} BR</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{match.tenant_city || 'Any city'}, {match.tenant_state || 'Any state'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Move-in: {match.tenant_move_in || 'Flexible'}</span>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-xs">
                      {match.tenant_email && (
                        <a href={`mailto:${match.tenant_email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="w-3 h-3" />
                          {match.tenant_email}
                        </a>
                      )}
                      {match.tenant_phone && (
                        <a href={`tel:${match.tenant_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="w-3 h-3" />
                          {match.tenant_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Card */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {match.property_address}
                      {match.property_unit_number && ` #${match.property_unit_number}`}
                    </div>
                    
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>Rent: {match.property_rent ? formatCurrency(match.property_rent) : 'Not set'}/mo</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Bed className="w-4 h-4" />
                        <span>{match.property_bedrooms || '?'} Bedrooms</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{match.property_city}, {match.property_state}</span>
                      </div>
                    </div>

                    {/* Photos Preview */}
                    {match.property_photos?.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {match.property_photos.slice(0, 4).map((photo: string, i: number) => (
                          <img 
                            key={i} 
                            src={photo} 
                            alt={`Property ${i + 1}`}
                            className="w-16 h-16 rounded object-cover flex-shrink-0"
                          />
                        ))}
                        {match.property_photos.length > 4 && (
                          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                            +{match.property_photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="score" className="mt-4">
            <ScoreBreakdownPanel match={match} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            {/* Add note */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note about this match..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[60px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                }}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()} className="self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No notes yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <Card key={note.id}>
                    <CardContent className="p-3">
                      <p className="text-sm">{note.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(note.timestamp, 'MMM d, yyyy h:mm a')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
