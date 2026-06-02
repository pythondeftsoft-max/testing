import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Send, Bell, Mail, Settings, Search } from 'lucide-react';
import { useAgencyMessages } from '@/hooks/useAgencyMessages';
import RecipientPicker from './RecipientPicker';

interface Props {
  agencyId: string;
  staffId: string;
  isAdmin: boolean;
}

const REMINDER_TYPES = [
  { value: 'recertification_90day', label: 'Recertification (90-day)', defaultDays: 90 },
  { value: 'recertification_60day', label: 'Recertification (60-day)', defaultDays: 60 },
  { value: 'recertification_30day', label: 'Recertification (30-day)', defaultDays: 30 },
  { value: 'inspection_upcoming', label: 'Upcoming Inspection', defaultDays: 14 },
  { value: 'lease_expiration', label: 'Lease Expiration', defaultDays: 60 },
  { value: 'hap_contract_expiration', label: 'HAP Contract Expiration', defaultDays: 90 },
];

const AgencyCommunicationCenter: React.FC<Props> = ({ agencyId, staffId, isAdmin }) => {
  const { messages, reminders, loading, unreadCount, sendMessage, markAsRead, upsertReminder } = useAgencyMessages(agencyId);
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [recipientType, setRecipientType] = useState('tenant');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'sent'>('all');

  const handleSend = async () => {
    if (!recipientId.trim() || !subject.trim() || !body.trim()) return;
    const ok = await sendMessage({
      sender_id: staffId,
      recipient_id: recipientId,
      recipient_type: recipientType,
      subject,
      body,
    });
    if (ok) {
      setComposeOpen(false);
      setRecipientId(''); setSubject(''); setBody('');
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filterType === 'unread' && m.is_read) return false;
    if (filterType === 'sent' && m.sender_id !== staffId) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return m.subject.toLowerCase().includes(s) || m.body.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Communication Center
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
        </h2>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-2" /> Compose</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient</Label>
                <RecipientPicker
                  type={recipientType as any}
                  agencyId={agencyId}
                  value={recipientId || null}
                  onChange={(r) => setRecipientId(r?.id || '')}
                  placeholder={`Search ${recipientType}s...`}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Type your message..." />
              </div>
              <Button onClick={handleSend} className="w-full">Send Message</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1">
            <Mail className="h-3.5 w-3.5" /> Inbox
            {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-5 text-[10px]">{unreadCount}</Badge>}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="reminders" className="gap-1">
              <Bell className="h-3.5 w-3.5" /> Auto Reminders
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inbox">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search messages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No messages found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map(msg => (
                <Card
                  key={msg.id}
                  className={`cursor-pointer transition-colors ${!msg.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
                  onClick={() => !msg.is_read && markAsRead(msg.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!msg.is_read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                          <p className="font-medium text-sm truncate">{msg.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{msg.body}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">{msg.recipient_type}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Automated Reminder Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {REMINDER_TYPES.map(rt => {
                    const existing = reminders.find(r => r.reminder_type === rt.value);
                    return (
                      <div key={rt.value} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rt.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Send {existing?.days_before ?? rt.defaultDays} days before due date
                          </p>
                          {existing?.last_run_at && (
                            <p className="text-[10px] text-muted-foreground">
                              Last run: {new Date(existing.last_run_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            className="w-20 h-8 text-sm"
                            defaultValue={existing?.days_before ?? rt.defaultDays}
                            min={1}
                            onBlur={e => {
                              const days = Number(e.target.value);
                              if (days > 0) {
                                upsertReminder({
                                  reminder_type: rt.value,
                                  days_before: days,
                                  is_active: existing?.is_active ?? true,
                                });
                              }
                            }}
                          />
                          <Switch
                            checked={existing?.is_active ?? false}
                            onCheckedChange={checked => {
                              upsertReminder({
                                reminder_type: rt.value,
                                days_before: existing?.days_before ?? rt.defaultDays,
                                is_active: checked,
                              });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AgencyCommunicationCenter;
