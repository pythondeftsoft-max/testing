import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Users } from "lucide-react";
import { PayoutBuilder } from "./PayoutBuilder";
import { SimplifiedBulkPayoutFlow } from "./SimplifiedBulkPayoutFlow";

interface PayoutCreatorProps {
  userId: string;
  portfolioId?: string;
  onComplete?: () => void;
}

type PayoutMode = "single" | "bulk";

export const PayoutCreator = ({ userId, portfolioId, onComplete }: PayoutCreatorProps) => {
  const [mode, setMode] = useState<PayoutMode>("single");

  return (
    <div className="space-y-4">
      <Card className="p-1">
        <div className="flex gap-2">
          <Button
            variant={mode === "single" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("single")}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Single Payout
          </Button>
          <Button
            variant={mode === "bulk" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("bulk")}
          >
            <Users className="mr-2 h-4 w-4" />
            Bulk Payouts
          </Button>
        </div>
      </Card>

      {mode === "single" ? (
        <PayoutBuilder userId={userId} portfolioId={portfolioId} />
      ) : (
        <SimplifiedBulkPayoutFlow userId={userId} portfolioId={portfolioId} onComplete={onComplete} />
      )}
    </div>
  );
};
