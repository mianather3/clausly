import { useState, useCallback, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clausly_upl_ack";

function hasAcknowledged(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markAcknowledged() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — just means more
    // prompts, never fewer. Safe fallback.
  }
}

/**
 * Gates an action (download, share-link generation) behind an active
 * click-through UPL disclaimer. Acknowledged once per browser session.
 *
 *   const { requireAcknowledgment, AcknowledgmentModal } = useUplAcknowledgment();
 *   <Button onClick={() => requireAcknowledgment(handleDownload)}>Download</Button>
 *   return <div>{AcknowledgmentModal}...</div>
 */
export function useUplAcknowledgment() {
  const [isOpen, setIsOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const requireAcknowledgment = useCallback((action: () => void) => {
    if (hasAcknowledged()) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    markAcknowledged();
    setIsOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) action();
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    pendingActionRef.current = null;
  }, []);

  const AcknowledgmentModal = isOpen ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <CardTitle className="text-white text-base font-semibold">Before you continue</CardTitle>
          </div>
          <button onClick={handleCancel} className="text-muted-foreground hover:text-white mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Clausly generates documents and contract analysis for informational purposes only. Nothing on this platform constitutes legal advice, and using it does not create an attorney-client relationship. Always consult a licensed attorney before executing any legal document or relying on this analysis.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex-1">
              I Understand, Continue
            </Button>
            <Button variant="outline" onClick={handleCancel} className="border-border text-white hover:bg-secondary">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

  return { requireAcknowledgment, AcknowledgmentModal };
}
