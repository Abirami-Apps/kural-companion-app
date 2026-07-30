import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: [string, string][] = [
  ["0 – 9", "Enter a kural number"],
  ["Enter", "Play the entered number now"],
  ["Backspace", "Delete last digit"],
  ["Esc", "Clear entry"],
  ["Space", "Play / pause"],
  ["↑ / ↓", "Previous / next kural"],
  ["← / →", "Seek 5 seconds"],
  ["?", "Show this help"],
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Every player control is reachable from the keyboard.</DialogDescription>
        </DialogHeader>
        <dl className="mt-2 space-y-2">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between gap-4 text-sm">
              <dt className="font-mono text-xs rounded-md border border-border px-2 py-1 text-foreground">
                {key}
              </dt>
              <dd className="text-muted-foreground text-right">{desc}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
