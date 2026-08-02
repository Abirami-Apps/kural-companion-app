import { AArrowDown, AArrowUp, Contrast, Palette, Settings2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FONT_STEPS, THEMES, useTheme } from "./ThemeProvider";

export function ThemeSwatches({ compact: _compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Colour theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          aria-label={`${t.label} theme`}
          title={t.label}
          onClick={() => setTheme(t.id)}
          className={`relative h-11 w-11 rounded-full border-2 overflow-hidden transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            theme === t.id ? "border-primary scale-110" : "border-border hover:border-primary/50"
          }`}
        >
          <span className="absolute inset-0 flex">
            {t.swatch.map((c) => (
              <span key={c} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

export function FontStepper({ compact: _compact = false }: { compact?: boolean }) {
  const { fontStep, increaseFont, decreaseFont } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        onClick={decreaseFont}
        disabled={fontStep === 0}
        aria-label="Decrease text size"
      >
        <AArrowDown className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[5.5rem] text-center" aria-live="polite">
        {FONT_STEPS[fontStep].label}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11"
        onClick={increaseFont}
        disabled={fontStep === FONT_STEPS.length - 1}
        aria-label="Increase text size"
      >
        <AArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AppearancePanel({ trigger }: { trigger?: React.ReactNode }) {
  const { highContrast, setHighContrast, reducedMotion, setReducedMotion } = useTheme();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Appearance settings">
            <Settings2 className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Appearance</SheetTitle>
          <SheetDescription>Colours, text size and motion — saved on this device.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-7">
          <section className="space-y-3">
            <Label className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" aria-hidden="true" /> Colour theme
            </Label>
            <ThemeSwatches />
          </section>

          <section className="space-y-3">
            <Label className="text-sm">Text size</Label>
            <FontStepper />
          </section>

          <section className="flex items-center justify-between gap-4">
            <Label htmlFor="high-contrast" className="flex items-center gap-2 text-sm">
              <Contrast className="h-4 w-4" aria-hidden="true" /> High contrast
            </Label>
            <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
          </section>

          <section className="flex items-center justify-between gap-4">
            <Label htmlFor="reduced-motion" className="flex items-center gap-2 text-sm">
              <Waves className="h-4 w-4" aria-hidden="true" /> Reduce motion
            </Label>
            <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
