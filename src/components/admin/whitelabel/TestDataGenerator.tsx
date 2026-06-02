import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestDataGeneratorProps {
  configs: Array<{ id: string; company_name: string }>;
  onDataGenerated: () => void;
}

export const TestDataGenerator = ({ configs, onDataGenerated }: TestDataGeneratorProps) => {
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTestData = async () => {
    if (!selectedConfig) {
      toast.error("Please select a configuration");
      return;
    }

    setIsGenerating(true);

    try {
      const events: Array<{
        config_id: string;
        event_type: string;
        page_path: string;
        session_id: string;
        user_id: string | null;
        user_agent: string;
        ip_address: string;
        metadata: any;
      }> = [];

      const pages = ['/home', '/properties', '/about', '/contact', '/listings', '/search'];
      const eventTypes = ['page_view', 'click', 'form_submit', 'search'];
      
      // Generate 50 test events across different sessions
      const numSessions = 10;
      const eventsPerSession = 5;

      for (let i = 0; i < numSessions; i++) {
        const sessionId = `test_session_${Date.now()}_${i}`;
        const userId = Math.random() > 0.5 ? `user_${i}` : null;
        
        for (let j = 0; j < eventsPerSession; j++) {
          const randomPage = pages[Math.floor(Math.random() * pages.length)];
          const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          
          events.push({
            config_id: selectedConfig,
            event_type: randomEvent,
            page_path: randomPage,
            session_id: sessionId,
            user_id: userId,
            user_agent: 'Test User Agent',
            ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
            metadata: {
              loadTime: Math.floor(Math.random() * 3000) + 500,
              sessionDuration: (j + 1) * 30,
              test_data: true
            }
          });
        }
      }

      // Insert events in batches
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const { error } = await supabase
          .from('white_label_analytics')
          .insert(batch);

        if (error) {
          throw error;
        }
      }

      // Generate performance metrics
      const performanceMetrics: Array<{
        config_id: string;
        metric_type: string;
        metric_value: number;
        metadata: any;
      }> = [];

      for (let i = 0; i < 20; i++) {
        performanceMetrics.push({
          config_id: selectedConfig,
          metric_type: 'page_load_time',
          metric_value: Math.floor(Math.random() * 3000) + 500,
          metadata: { page: pages[Math.floor(Math.random() * pages.length)] }
        });
      }

      const { error: perfError } = await supabase
        .from('white_label_performance')
        .insert(performanceMetrics);

      if (perfError) {
        throw perfError;
      }

      toast.success(`Generated ${events.length} test events and ${performanceMetrics.length} performance metrics`);
      onDataGenerated();
    } catch (error) {
      console.error('Error generating test data:', error);
      toast.error('Failed to generate test data');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Test Data Generator</CardTitle>
        </div>
        <CardDescription>
          Generate sample analytics data to preview the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Configuration</label>
          <Select value={selectedConfig} onValueChange={setSelectedConfig}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a white label config" />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.company_name || 'Unnamed Config'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={generateTestData} 
          disabled={isGenerating || !selectedConfig}
          className="w-full"
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Test Data
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Generates 50 test events across 10 sessions</p>
          <p>• Includes page views, clicks, and performance metrics</p>
          <p>• Test data is marked in metadata for easy identification</p>
        </div>
      </CardContent>
    </Card>
  );
};
