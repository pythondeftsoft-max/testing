import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PublicWaitlistFormStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const PublicWaitlistFormStep: React.FC<PublicWaitlistFormStepProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
};
