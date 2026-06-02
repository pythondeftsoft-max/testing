import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Search, FileText, Clock, CheckCircle } from 'lucide-react';

const PropertyAssociationStatus = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Search,
      title: 'Browse Properties',
      description: 'Discover available properties in the marketplace',
    },
    {
      icon: FileText,
      title: 'Submit Application',
      description: 'Apply for your preferred property',
    },
    {
      icon: Clock,
      title: 'Wait for Approval',
      description: 'Landlord reviews your application',
    },
    {
      icon: CheckCircle,
      title: 'Start Managing',
      description: 'Submit maintenance requests and more',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Get Started with Property Association</CardTitle>
          <CardDescription className="text-base mt-2">
            Connect with a property to start submitting maintenance requests and managing your tenancy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex gap-4 p-4 rounded-lg border bg-card">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/dashboard?tab=Market')}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Explore Marketplace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyAssociationStatus;
