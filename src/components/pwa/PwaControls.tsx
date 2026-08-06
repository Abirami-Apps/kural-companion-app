import { useState } from "react";
import { Download, Share, SquarePlus, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwa } from "@/hooks/usePwa";
import { cn } from "@/lib/utils";

export function ConnectivityBadge({ className }: { className?: string }) {
  const { online } = usePwa();
  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-medium",
        online ? "text-muted-foreground" : "bg-amber-500/12 text-amber-700 dark:text-amber-300",
        className,
      )}
      aria-label={online ? "Connection status: online" : "Connection status: offline"}
    >
      {online ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function OfflineBanner() {
  const { online } = usePwa();
  if (online) return null;

  return (
    <div
      className="shrink-0 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-foreground"
      role="status"
    >
      Offline · All 1,330 Kural texts remain available. Audio and account sync resume when you reconnect.
    </div>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const { installAvailable, install } = usePwa();
  const [manualHelp, setManualHelp] = useState(false);
  if (!installAvailable) return null;

  const beginInstall = async () => {
    const result = await install();
    if (result === "manual") setManualHelp(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11 gap-2 rounded-full", className)}
        onClick={() => void beginInstall()}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Install app
      </Button>
      <Dialog open={manualHelp} onOpenChange={setManualHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Kural Companion</DialogTitle>
            <DialogDescription>
              Add the app to your Home Screen for a full-screen experience and offline Kural reading.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              Tap the Share button in Safari.
            </li>
            <li className="flex gap-3">
              <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              Choose “Add to Home Screen”, then confirm Add.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
