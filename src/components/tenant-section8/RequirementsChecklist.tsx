
import React from 'react';
import { CheckCircle2, Circle, FileText } from 'lucide-react';

interface RequirementItem {
  name: string;
  description?: string;
  is_preset?: boolean;
}

interface RequirementsChecklistProps {
  requirements: RequirementItem[];
  title?: string;
}

const RequirementsChecklist = ({ requirements, title = 'Required Documents' }: RequirementsChecklistProps) => {
  if (!requirements || requirements.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="space-y-1.5">
        {requirements.map((req, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/30">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground">{req.name}</p>
              {req.description && (
                <p className="text-xs text-muted-foreground">{req.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequirementsChecklist;
