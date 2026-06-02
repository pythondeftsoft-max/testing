import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, ClipboardList, Loader2 } from 'lucide-react';
import { useHqsChecklist, HQS_CATEGORIES } from '@/hooks/useHqsChecklist';
import HqsPhotoUpload from './HqsPhotoUpload';

interface Props {
  inspectionId: string;
}

const HqsChecklist: React.FC<Props> = ({ inspectionId }) => {
  const { items, loading, initializeChecklist, updateItem } = useHqsChecklist(inspectionId);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No HQS checklist items yet.</p>
          <Button onClick={() => initializeChecklist(inspectionId)}>
            Initialize 13-Category HQS Checklist
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = HQS_CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.key),
  }));

  const totalItems = items.length;
  const passedItems = items.filter(i => i.passed === true).length;
  const failedItems = items.filter(i => i.passed === false).length;
  const pendingItems = items.filter(i => i.passed === null).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Badge variant="success">{passedItems} Pass</Badge>
        <Badge variant="destructive">{failedItems} Fail</Badge>
        <Badge variant="secondary">{pendingItems} Pending</Badge>
        <span className="text-muted-foreground">({totalItems} total items)</span>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {grouped.map(cat => {
          const catPass = cat.items.filter(i => i.passed === true).length;
          const catFail = cat.items.filter(i => i.passed === false).length;
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  <span className="font-medium">{cat.label}</span>
                  <div className="flex gap-1 ml-auto mr-4">
                    {catFail > 0 && <Badge variant="destructive" className="text-xs">{catFail} fail</Badge>}
                    {catPass > 0 && <Badge variant="success" className="text-xs">{catPass} pass</Badge>}
                    {cat.items.length - catPass - catFail > 0 && (
                      <Badge variant="secondary" className="text-xs">{cat.items.length - catPass - catFail} pending</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-2">
                  {cat.items.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-2 rounded-md border">
                      <div className="flex gap-1 mt-0.5">
                        <Button
                          size="sm"
                          variant={item.passed === true ? 'default' : 'outline'}
                          className="h-7 w-7 p-0"
                          onClick={() => updateItem(item.id, { passed: true })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={item.passed === false ? 'destructive' : 'outline'}
                          className="h-7 w-7 p-0"
                          onClick={() => updateItem(item.id, { passed: false })}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.item_name}</p>
                        {item.passed === false && (
                          <Textarea
                            className="mt-2 text-xs"
                            placeholder="Deficiency notes..."
                            rows={2}
                            value={editingNotes[item.id] ?? item.deficiency_notes ?? ''}
                            onChange={e => setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={() => {
                              if (editingNotes[item.id] !== undefined) {
                                updateItem(item.id, { deficiency_notes: editingNotes[item.id] });
                              }
                            }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <HqsPhotoUpload
                          itemId={item.id}
                          currentUrl={item.photo_url}
                          onUploaded={(url) => updateItem(item.id, { photo_url: url || null })}
                        />
                        {item.photo_required && (
                          <Badge variant="secondary" className="text-xs">Photo Req.</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default HqsChecklist;
