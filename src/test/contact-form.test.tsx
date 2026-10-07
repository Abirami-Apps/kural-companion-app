import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Contact from "@/pages/Contact";

const mocks = vi.hoisted(() => ({ endpoint: "https://api.abirami.app/contact.php", submit: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "reader@example.com" } }) }));
vi.mock("@/lib/contact", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/contact")>(),
  get contactEndpoint() { return mocks.endpoint; },
  submitSupportMessage: mocks.submit,
}));

describe("contact form delivery", () => {
  beforeEach(() => { mocks.endpoint = "https://api.abirami.app/contact.php"; mocks.submit.mockReset(); });
  afterEach(() => cleanup());
  const open = () => render(<MemoryRouter><Contact /></MemoryRouter>);
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Please help with audio playback." } });
    return screen.getByRole("button", { name: "Send message" }).closest("form")!;
  };

  it("blocks duplicate submissions and clears the draft only after confirmation", async () => {
    let complete!: () => void;
    mocks.submit.mockReturnValue(new Promise<void>((resolve) => { complete = resolve; }));
    open();
    const form = fill();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    complete();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Message submitted"));
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.getByLabelText("Reply email")).toHaveValue("reader@example.com");
  });

  it("keeps the draft and offers direct email when sending fails", async () => {
    mocks.submit.mockRejectedValue(new Error("Submission could not be confirmed. Please email support directly."));
    open();
    fireEvent.submit(fill());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be confirmed"));
    expect(screen.getByLabelText("Message")).toHaveValue("Please help with audio playback.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support@abiramiaudio.com" })).toHaveAttribute("href", "mailto:support@abiramiaudio.com");
  });

  it("keeps the existing email-app flow until SMTP is activated", () => {
    mocks.endpoint = "";
    open();
    expect(screen.getByRole("button", { name: "Continue in email app" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
  });
});
