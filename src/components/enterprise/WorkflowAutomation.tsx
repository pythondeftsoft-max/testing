import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Plus, Play, Pause, Settings, Clock, CheckCircle, AlertCircle, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTrigger {
  id: string;
  type: 'form_submission' | 'user_signup' | 'payment_success' | 'schedule' | 'webhook';
  name: string;
  description: string;
}

interface WorkflowAction {
  id: string;
  type: 'send_email' | 'create_task' | 'update_database' | 'call_webhook' | 'wait';
  name: string;
  description: string;
  config?: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  status: 'active' | 'paused' | 'draft';
  executions: number;
  lastRun: string;
  successRate: number;
}

const triggers: WorkflowTrigger[] = [
  {
    id: 'form_submit',
    type: 'form_submission',
    name: 'Form Submission',
    description: 'Triggered when a user submits a form'
  },
  {
    id: 'user_signup',
    type: 'user_signup', 
    name: 'User Signup',
    description: 'Triggered when a new user registers'
  },
  {
    id: 'payment_success',
    type: 'payment_success',
    name: 'Payment Success',
    description: 'Triggered when a payment is completed'
  },
  {
    id: 'schedule',
    type: 'schedule',
    name: 'Scheduled',
    description: 'Triggered at specific times or intervals'
  }
];

const actions: WorkflowAction[] = [
  {
    id: 'send_email',
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email to a recipient'
  },
  {
    id: 'create_task',
    type: 'create_task',
    name: 'Create Task',
    description: 'Create a task for team members'
  },
  {
    id: 'update_db',
    type: 'update_database',
    name: 'Update Database',
    description: 'Update records in the database'
  },
  {
    id: 'call_webhook',
    type: 'call_webhook',
    name: 'Call Webhook',
    description: 'Send data to an external service'
  },
  {
    id: 'wait',
    type: 'wait',
    name: 'Wait/Delay',
    description: 'Add a delay before the next action'
  }
];

const mockWorkflows: Workflow[] = [
  {
    id: 'welcome-sequence',
    name: 'Welcome Email Sequence',
    description: 'Send welcome emails to new users over 3 days',
    trigger: triggers[1],
    actions: [actions[0], actions[4], actions[0]],
    status: 'active',
    executions: 1247,
    lastRun: '2 hours ago',
    successRate: 98.5
  },
  {
    id: 'payment-followup',
    name: 'Payment Follow-up',
    description: 'Send receipt and onboarding materials after payment',
    trigger: triggers[2],
    actions: [actions[0], actions[1]],
    status: 'active',
    executions: 523,
    lastRun: '15 minutes ago',
    successRate: 99.2
  },
  {
    id: 'form-processing',
    name: 'Contact Form Processing',
    description: 'Process contact form submissions and create tasks',
    trigger: triggers[0],
    actions: [actions[1], actions[3]],
    status: 'paused',
    executions: 89,
    lastRun: '1 day ago',
    successRate: 96.8
  }
];

export const WorkflowAutomation: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: '',
    actions: [] as string[]
  });
  const { toast } = useToast();

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId 
        ? { ...w, status: w.status === 'active' ? 'paused' : 'active' }
        : w
    ));
    toast({
      title: "Workflow Updated",
      description: "Workflow status has been changed."
    });
  };

  const createWorkflow = () => {
    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: newWorkflow.name,
      description: newWorkflow.description,
      trigger: triggers.find(t => t.id === newWorkflow.trigger)!,
      actions: newWorkflow.actions.map(actionId => actions.find(a => a.id === actionId)!),
      status: 'draft',
      executions: 0,
      lastRun: 'Never',
      successRate: 0
    };

    setWorkflows(prev => [...prev, workflow]);
    setIsCreateModalOpen(false);
    setNewWorkflow({ name: '', description: '', trigger: '', actions: [] });
    
    toast({
      title: "Workflow Created",
      description: "Your new workflow has been created successfully."
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-500" />
            Workflow Automation
          </h2>
          <p className="text-muted-foreground">
            Automate your business processes with custom workflows
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Build an automated workflow to streamline your processes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter workflow name"
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Input
                  id="workflow-description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does"
                />
              </div>
              
              <div>
                <Label>Trigger</Label>
                <Select value={newWorkflow.trigger} onValueChange={(value) => setNewWorkflow(prev => ({ ...prev, trigger: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggers.map(trigger => (
                      <SelectItem key={trigger.id} value={trigger.id}>
                        {trigger.name} - {trigger.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Actions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {actions.map(action => (
                    <Button
                      key={action.id}
                      variant={newWorkflow.actions.includes(action.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (newWorkflow.actions.includes(action.id)) {
                          setNewWorkflow(prev => ({ ...prev, actions: prev.actions.filter(a => a !== action.id) }));
                        } else {
                          setNewWorkflow(prev => ({ ...prev, actions: [...prev.actions, action.id] }));
                        }
                      }}
                    >
                      {action.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createWorkflow} disabled={!newWorkflow.name || !newWorkflow.trigger}>
                  Create Workflow
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map(workflow => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(workflow.status)}
                      <div>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(workflow.status) as any}>
                        {workflow.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWorkflowStatus(workflow.id)}
                      >
                        {workflow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Executions</div>
                      <div className="text-lg font-semibold">{workflow.executions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="text-lg font-semibold">{workflow.successRate}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Run</div>
                      <div className="text-lg font-semibold">{workflow.lastRun}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Actions</div>
                      <div className="text-lg font-semibold">{workflow.actions.length}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Flow:</span>
                      <span className="font-medium">{workflow.trigger.name}</span>
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      {workflow.actions.map((action, index) => (
                        <React.Fragment key={index}>
                          <span className="font-medium">{action.name}</span>
                          {index < workflow.actions.length - 1 && (
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Lead Nurturing</CardTitle>
                <CardDescription>Automatically nurture leads with email sequences</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Customer Onboarding</CardTitle>
                <CardDescription>Guide new customers through your onboarding process</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Support Ticket Routing</CardTitle>
                <CardDescription>Automatically route and assign support tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,859</div>
                <div className="text-sm text-muted-foreground">+12% from last month</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">98.2%</div>
                <div className="text-sm text-muted-foreground">+0.5% from last month</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">247h</div>
                <div className="text-sm text-muted-foreground">This month</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};