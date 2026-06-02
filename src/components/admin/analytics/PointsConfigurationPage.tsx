import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Plus, Settings, Trash2, Edit2, Save, X } from 'lucide-react';
import {
  usePointsConfiguration,
  useUpdatePointsConfig,
  useDeletePointsConfig,
  PointsConfig,
} from '@/hooks/usePointsConfiguration';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PointsConfigurationPage: React.FC = () => {
  const { data: configs, isLoading } = usePointsConfiguration();
  const updateConfig = useUpdatePointsConfig();
  const deleteConfig = useDeletePointsConfig();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const handleSavePoints = (id: string) => {
    updateConfig.mutate({ id, updates: { points_value: editValue } });
    setEditingId(null);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateConfig.mutate({ id, updates: { is_active: !isActive } });
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Points Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure point values for worker actions and stage transitions
          </p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Add New Action
        </Button>
      </div>

      {/* Configuration Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !configs || configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No point configurations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action Label</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Stage Transition</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.action_label}</div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.entity_type === 'tenant' ? 'default' : 'secondary'}>
                        {config.entity_type === 'tenant' ? 'Tenant' : 'Property'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.from_stage ? (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-muted-foreground">{config.from_stage}</span>
                          <span>→</span>
                          <span className="font-medium">{config.to_stage}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Any backward move</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === config.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-20 text-right"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSavePoints(config.id)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <span
                            className={`font-semibold ${
                              config.points_value > 0
                                ? 'text-green-600'
                                : config.points_value < 0
                                ? 'text-red-600'
                                : ''
                            }`}
                          >
                            {config.points_value > 0 ? '+' : ''}
                            {config.points_value}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(config.id);
                              setEditValue(config.points_value);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={() => handleToggleActive(config.id, config.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this configuration?')) {
                            deleteConfig.mutate(config.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                How Points Work
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Workers earn points when they move entities through pipeline stages</li>
                <li>• Forward moves (e.g., seeking → applied) award positive points</li>
                <li>• Backward moves (e.g., approved → applied) deduct points</li>
                <li>• Inactive configurations won't award points for new actions</li>
                <li>• Changes apply to all future stage transitions immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
