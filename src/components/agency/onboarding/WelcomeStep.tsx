import React from 'react';

interface Props {
  agency: any;
}

export const WelcomeStep: React.FC<Props> = ({ agency }) => (
  <div className="space-y-3">
    <p>Welcome to OpenKey, <strong>{agency.name}</strong>!</p>
    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-md">
      <div><span className="text-muted-foreground">Agency:</span> <strong>{agency.name}</strong></div>
      <div><span className="text-muted-foreground">Slug:</span> <strong>{agency.slug}</strong></div>
      <div><span className="text-muted-foreground">State:</span> <strong>{agency.state || '—'}</strong></div>
      <div><span className="text-muted-foreground">City:</span> <strong>{agency.city || '—'}</strong></div>
    </div>
    <p className="text-sm text-muted-foreground">
      If anything looks wrong, you can update agency details later in Settings.
    </p>
  </div>
);

export default WelcomeStep;
