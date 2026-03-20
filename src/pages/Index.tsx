import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TOTAL_KURALS } from "@/data/sample-kurals";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, CornerDownLeft, Music } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "GO"];

const Index = () => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleKey = useCallback(
    (key: string) => {
      setError("");
      if (key === "C") {
        setInput("");
      } else if (key === "GO") {
        const num = parseInt(input, 10);
        if (!input || isNaN(num) || num < 1 || num > TOTAL_KURALS) {
          setError(`Enter a number between 1 and ${TOTAL_KURALS}`);
          return;
        }
        navigate(`/kural/${num}`);
      } else {
        if (input.length < 4) {
          setInput((prev) => prev + key);
        }
      }
    },
    [input, navigate]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Music className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            திருக்குறள்
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter a Kural number to listen
        </p>
      </motion.div>

      {/* Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xs mb-6"
      >
        <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
          <div className="text-center">
            <span className="font-tamil text-4xl font-semibold tracking-wider text-foreground min-h-[3rem] block tabular-nums">
              {input || (
                <span className="text-muted-foreground/40 text-2xl font-normal">
                  1 – {TOTAL_KURALS}
                </span>
              )}
            </span>
          </div>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-destructive text-xs text-center mt-2"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Keypad */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-3 gap-3 w-full max-w-xs"
      >
        {KEYS.map((key, i) => {
          const isGo = key === "GO";
          const isClear = key === "C";
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKey(key)}
              className={`
                h-16 rounded-xl text-lg font-medium transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                active:scale-95
                ${
                  isGo
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    : isClear
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-card border border-border text-foreground hover:bg-accent shadow-sm"
                }
              `}
              style={{
                animationDelay: `${i * 30}ms`,
              }}
            >
              {isClear ? (
                <Delete className="w-5 h-5 mx-auto" />
              ) : isGo ? (
                <CornerDownLeft className="w-5 h-5 mx-auto" />
              ) : (
                key
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-10 flex gap-6 text-xs text-muted-foreground"
      >
        <button
          onClick={() => navigate("/subscribe")}
          className="hover:text-foreground transition-colors"
        >
          Subscribe
        </button>
        <button
          onClick={() => navigate("/login")}
          className="hover:text-foreground transition-colors"
        >
          Login
        </button>
      </motion.div>
    </div>
  );
};

export default Index;
