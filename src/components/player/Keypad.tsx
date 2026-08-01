import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";

interface KeypadProps {
  onDigit: (d: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad({ onDigit, onClear, onSubmit }: KeypadProps) {
  return (
    <div
      className="grid w-full grid-cols-3 gap-2.5"
      role="group"
      aria-label="Kural number keypad"
    >

      {DIGITS.map((d) => (
        <Key key={d} label={d} onClick={() => onDigit(d)} ariaLabel={`Digit ${d}`} />
      ))}
      <Key label="C" onClick={onClear} variant="ghost" ariaLabel="Clear entry" />
      <Key label="0" onClick={() => onDigit("0")} ariaLabel="Digit 0" />
      <Key
        label="Go"
        onClick={onSubmit}
        variant="accent"
        ariaLabel="Go to entered kural"
      />
    </div>
  );
}

function Key({
  label,
  onClick,
  variant = "solid",
  ariaLabel,
}: {
  label: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "ghost" | "accent";
  ariaLabel?: string;
}) {
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
  const styles = {
    solid:
      "bg-secondary-foreground/[0.07] text-secondary-foreground border-secondary-foreground/10 hover:bg-secondary-foreground/[0.13]",
    ghost:
      "bg-transparent text-secondary-foreground/70 border-secondary-foreground/10 hover:bg-secondary-foreground/[0.08]",
    accent:
      "bg-gold-light/10 text-gold-light border-gold-light/30 hover:bg-gold-light/20",
  }[variant];

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={onClick}
      className={`min-h-11 h-[clamp(48px,5.7vh,54px)] rounded-2xl text-base font-semibold tabular-nums border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${styles}`}
    >
      {label}
    </motion.button>
  );
}
