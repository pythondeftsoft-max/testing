import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const BackfillLeaseRenewalButton = () => {
  const [loading, setLoading] = useState(false);

  const handleBackfill = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "backfill-lease-renewal-notification",
        {
          body: {
            leaseRenewalId: "751b19b7-03c5-47f5-9c3f-e78c15443ff0",
          },
        }
      );

      if (error) throw error;

      toast.success("Notification and email sent!", {
        description: `Notification ID: ${data.notificationId}`,
      });
    } catch (error: any) {
      toast.error("Failed to send notification", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleBackfill} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Send Backfill Notification
    </Button>
  );
};
