import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Phone, Mail, User, Star, StickyNote, Calendar, Edit2, Trash2, PhoneCall, MailIcon, Users2, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface AgencyCRMPanelProps {
  agencyId: string;
  agencyName: string;
}

const CONTACT_TYPE_ICONS: Record<string, any> = {
  call: PhoneCall,
  email: MailIcon,
  meeting: Users2,
  internal: Lock,
};

const CONTACT_TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700',
  email: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
  internal: 'bg-gray-100 text-gray-700',
};

export const AgencyCRMPanel = ({ agencyId, agencyName }: AgencyCRMPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', phone: '', is_primary: false, role_description: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ note: '', contact_type: 'internal', follow_up_date: '' });

  const { data: contacts = [] } = useQuery({
    queryKey: ['agency-crm-contacts', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_crm_contacts')
        .select('*')
        .eq('agency_id', agencyId)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['agency-crm-notes', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_crm_notes')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const upsertContact = useMutation({
    mutationFn: async () => {
      if (editingContact) {
        const { error } = await supabase.from('agency_crm_contacts').update(contactForm).eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agency_crm_contacts').insert({ ...contactForm, agency_id: agencyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingContact ? 'Contact updated' : 'Contact added');
      queryClient.invalidateQueries({ queryKey: ['agency-crm-contacts', agencyId] });
      setShowAddContact(false);
      setEditingContact(null);
      setContactForm({ name: '', title: '', email: '', phone: '', is_primary: false, role_description: '', notes: '' });
    },
    onError: (e: any) => toast.error('Failed to save contact', { description: e.message })
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agency_crm_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contact deleted');
      queryClient.invalidateQueries({ queryKey: ['agency-crm-contacts', agencyId] });
    }
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('agency_crm_notes').insert({
        agency_id: agencyId,
        author_id: user.id,
        note: noteForm.note,
        contact_type: noteForm.contact_type,
        follow_up_date: noteForm.follow_up_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['agency-crm-notes', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-crm-notes-counts'] });
      setShowAddNote(false);
      setNoteForm({ note: '', contact_type: 'internal', follow_up_date: '' });
    },
    onError: (e: any) => toast.error('Failed to add note', { description: e.message })
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agency_crm_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['agency-crm-notes', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['agency-crm-notes-counts'] });
    }
  });

  const overdueFollowUps = notes.filter(n => n.follow_up_date && new Date(n.follow_up_date) <= new Date());

  const openEditContact = (contact: any) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      is_primary: contact.is_primary,
      role_description: contact.role_description || '',
      notes: contact.notes || '',
    });
    setShowAddContact(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> CRM — {agencyName}
            </CardTitle>
            <CardDescription>
              {contacts.length} contacts • {notes.length} notes
              {overdueFollowUps.length > 0 && (
                <Badge variant="warning" className="ml-2 text-xs">{overdueFollowUps.length} overdue follow-up{overdueFollowUps.length > 1 ? 's' : ''}</Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contacts">
          <TabsList className="w-full">
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="notes">
              Notes ({notes.length})
              {overdueFollowUps.length > 0 && <span className="ml-1 w-2 h-2 rounded-full bg-destructive inline-block" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts">
            <div className="space-y-3">
              <Dialog open={showAddContact} onOpenChange={(open) => { setShowAddContact(open); if (!open) { setEditingContact(null); setContactForm({ name: '', title: '', email: '', phone: '', is_primary: false, role_description: '', notes: '' }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Contact</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Name *</Label><Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Title</Label><Input value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} placeholder="Executive Director" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1"><Label>Role Description</Label><Input value={contactForm.role_description} onChange={e => setContactForm({ ...contactForm, role_description: e.target.value })} placeholder="Decision-maker for IT contracts" /></div>
                    <div className="space-y-1"><Label>Notes</Label><Textarea value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} rows={2} /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={contactForm.is_primary} onCheckedChange={v => setContactForm({ ...contactForm, is_primary: v })} />
                      <Label>Primary Contact</Label>
                    </div>
                    <Button onClick={() => upsertContact.mutate()} disabled={!contactForm.name || upsertContact.isPending} className="w-full">
                      {upsertContact.isPending ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No contacts added yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-1.5">
                            {c.is_primary && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                            {c.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.title || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditContact(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteContact.mutate(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="space-y-3">
              <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Note</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add CRM Note</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select value={noteForm.contact_type} onValueChange={v => setNoteForm({ ...noteForm, contact_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Phone Call</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="meeting">🤝 Meeting</SelectItem>
                          <SelectItem value="internal">🔒 Internal Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Note *</Label><Textarea value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} rows={4} placeholder="Called Director Smith, discussed pricing..." /></div>
                    <div className="space-y-1"><Label>Follow-up Date (optional)</Label><Input type="date" value={noteForm.follow_up_date} onChange={e => setNoteForm({ ...noteForm, follow_up_date: e.target.value })} /></div>
                    <Button onClick={() => addNote.mutate()} disabled={!noteForm.note || addNote.isPending} className="w-full">
                      {addNote.isPending ? 'Saving...' : 'Add Note'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No notes yet — log your first interaction</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-auto">
                  {notes.map((n: any) => {
                    const Icon = CONTACT_TYPE_ICONS[n.contact_type] || StickyNote;
                    const isOverdue = n.follow_up_date && new Date(n.follow_up_date) <= new Date();
                    return (
                      <div key={n.id} className={`border rounded-lg p-3 ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className={`p-1.5 rounded ${CONTACT_TYPE_COLORS[n.contact_type] || ''}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-foreground whitespace-pre-wrap">{n.note}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}</span>
                                {n.follow_up_date && (
                                  <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Follow-up: {format(new Date(n.follow_up_date), 'MMM d, yyyy')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteNote.mutate(n.id)} className="shrink-0">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Hook to get CRM note counts per agency (for health table badges)
export const useAgencyCRMNoteCounts = () => {
  return useQuery({
    queryKey: ['agency-crm-notes-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_crm_notes')
        .select('agency_id, follow_up_date');
      if (error) throw error;
      const counts = new Map<string, { total: number; overdue: number }>();
      const now = new Date();
      (data || []).forEach(n => {
        const entry = counts.get(n.agency_id) || { total: 0, overdue: 0 };
        entry.total++;
        if (n.follow_up_date && new Date(n.follow_up_date) <= now) entry.overdue++;
        counts.set(n.agency_id, entry);
      });
      return counts;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export default AgencyCRMPanel;
