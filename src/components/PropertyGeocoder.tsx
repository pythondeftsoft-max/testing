import React, { useState } from 'react';
import { usePropertyGeocoding } from '@/hooks/usePropertyGeocoding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PropertyGeocoder: React.FC = () => {
  const { backfillCoordinates, loading } = usePropertyGeocoding();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const handleBackfillCoordinates = async () => {
    try {
      setIsRunning(true);
      console.log('Starting property geocoding backfill...');
      
      await backfillCoordinates();
      
      toast({
        title: "Success",
        description: "Property geocoding completed successfully",
      });
      
      // Reload the page to refresh the map with new coordinates
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Geocoding backfill failed:', error);
      toast({
        title: "Error",
        description: "Failed to complete geocoding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Property Map Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run this to add map coordinates to all properties so they appear on the interactive map.
          </p>
          
          <Button 
            onClick={handleBackfillCoordinates}
            disabled={loading || isRunning}
            className="w-full"
          >
            {(loading || isRunning) ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Geocoding Properties...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Add Map Coordinates
              </>
            )}
          </Button>
          
          {(loading || isRunning) && (
            <p className="text-xs text-muted-foreground text-center">
              This may take a few minutes depending on the number of properties...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyGeocoder;