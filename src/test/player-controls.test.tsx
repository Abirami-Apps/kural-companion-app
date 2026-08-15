import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Keypad } from "@/components/player/Keypad";
import { Transport } from "@/components/player/Transport";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const noop = vi.fn();

describe("player controls", () => {
  it("provides accessible labels and 44px keypad targets", () => {
    render(
      <ThemeProvider>
        <Keypad onDigit={noop} onClear={noop} onSubmit={noop} />
      </ThemeProvider>,
    );
    const keys = screen.getAllByRole("button");
    expect(keys).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Digit 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear entry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to entered kural" })).toBeInTheDocument();
    keys.forEach((key) => expect(key.className).toContain("min-h-11"));
  });

  it("exposes boundary and locked transport states", () => {
    render(
      <Transport
        isPlaying={false}
        audioState="idle"
        canPrev={false}
        canNext
        loopOne={false}
        disabled
        onPrev={noop}
        onNext={noop}
        onToggle={noop}
        onToggleLoopOne={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Previous kural" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next kural" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlock premium playback" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loop current kural" })).toBeDisabled();
  });
});
