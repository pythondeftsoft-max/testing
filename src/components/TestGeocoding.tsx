import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface TestGeocodingProps {
  onSuccess?: () => void;
}

const TestGeocoding: React.FC<TestGeocodingProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runBackfill = async () => {
    try {
      setLoading(true);
      console.log('Starting backfill...');
      
      const { data, error } = await supabase.functions.invoke('backfill-coordinates');
      
      console.log('Backfill response:', { data, error });
      
      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "Success",
        description: `Geocoded ${data?.geocoded || 0} properties`,
      });
      
      // Call the success callback to refresh properties
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to run geocoding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSingleGeocode = async () => {
    try {
      setLoading(true);
      
      // Test with a specific property
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          property_id: '1b29b77f-8022-4221-b752-1fd5f9417fa9',
          address: '456 Elm Street, Springfield, Illinois, 62704'
        }
      });
      
      console.log('Single geocode response:', { data, error });
      
      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "Success",
        description: "Single property geocoded successfully",
      });
    } catch (error) {
      console.error('Single geocode error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to geocode property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test Geocoding Functions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runBackfill} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Running...' : 'Run Backfill Coordinates'}
        </Button>
        
        <Button 
          onClick={testSingleGeocode} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Single Geocode'}
        </Button>
        
        {result && (
          <div className="mt-4">
            <h3 className="font-semibold">Result:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestGeocoding;