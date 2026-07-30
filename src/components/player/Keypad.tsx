import { motion, useReducedMotion } from "framer-motion";
import { Shuffle } from "lucide-react";

interface KeypadProps {
  onDigit: (d: string) => void;
  onClear: () => void;
  onShuffle: () => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad({ onDigit, onClear, onShuffle }: KeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-[320px] mx-auto">
      {DIGITS.map((d) => (
        <Key key={d} label={d} onClick={() => onDigit(d)} />
      ))}
      <Key label="C" onClick={onClear} variant="ghost" ariaLabel="Clear entry" />
      <Key label="0" onClick={() => onDigit("0")} />
      <Key
        label={<Shuffle className="w-5 h-5 mx-auto" />}
        onClick={onShuffle}
        variant="accent"
        ariaLabel="Random kural"
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
  const reduce = useReducedMotion();
  const styles = {
    solid:
      "bg-secondary-foreground/[0.07] text-secondary-foreground border-secondary-foreground/10 hover:bg-secondary-foreground/[0.13]",
    ghost:
      "bg-transparent text-secondary-foreground/55 border-secondary-foreground/10 hover:bg-secondary-foreground/[0.08]",
    accent:
      "bg-primary/12 text-primary border-primary/25 hover:bg-primary/20",
  }[variant];

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={onClick}
      className={`h-[clamp(46px,6.5vh,56px)] rounded-2xl text-xl font-semibold tabular-nums border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${styles}`}
    >
      {label}
    </motion.button>
  );
}
