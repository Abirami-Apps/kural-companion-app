import { useEffect, useState } from "react";
import { Bug, X } from "lucide-react";
import { useFitGuard } from "@/hooks/useFitGuard";

/**
 * Toggleable diagnostics overlay: reports the live viewport box, safe-area
 * insets, overflow, the guard's fit scale, and the final computed font sizes.
 * Open with the bug button, Ctrl/Cmd + Alt + D, or `?debug=1`.
 */
export function DebugPanel() {
  const [open, setOpen] = useState(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
  );
  const m = useFitGuard(true, false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows: [string, string][] = [
    ["viewport", `${m.vw} × ${m.vh}`],
    ["visual vh", `${m.dvh}`],
    ["orientation", m.orientation],
    ["overflow y / x", `${m.overflowY} / ${m.overflowX}`],
    ["fit scale", m.fitScale.toFixed(2)],
    ["safe t/r/b/l", `${m.safe.top}/${m.safe.right}/${m.safe.bottom}/${m.safe.left}`],
    ...Object.entries(m.fonts).map(([k, v]) => [k, v] as [string, string]),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-pressed={open}
        aria-label="Toggle layout debug panel"
        className="fixed bottom-2 left-2 z-[60] h-11 w-11 rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur flex items-center justify-center opacity-40 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ marginBottom: "var(--safe-bottom)", marginLeft: "var(--safe-left)" }}
      >
        <Bug className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <aside
          aria-label="Layout diagnostics"
          className="fixed bottom-14 left-2 z-[60] w-[min(17rem,80vw)] rounded-xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur"
          style={{ marginBottom: "var(--safe-bottom)", marginLeft: "var(--safe-left)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider">Layout debug</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close debug panel"
              className="flex h-11 w-11 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] tabular-nums">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="truncate text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p
            className={`mt-2 rounded px-2 py-1 text-[11px] font-medium ${
              m.overflowY > 1 || m.overflowX > 1
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {m.overflowY > 1 || m.overflowX > 1 ? "Overflow detected" : "Fits on one screen"}
          </p>
        </aside>
      )}
    </>
  );
}
