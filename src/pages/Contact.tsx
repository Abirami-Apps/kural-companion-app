import { FormEvent } from "react";
import { ArrowLeft, LifeBuoy, Mail, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  buildSupportMailto,
  CONTACT_TOPICS,
  type ContactTopic,
  SUPPORT_EMAIL,
} from "@/lib/contact";

export default function Contact() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    window.location.href = buildSupportMailto({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      topic: String(form.get("topic") ?? CONTACT_TOPICS[0]) as ContactTopic,
      message: String(form.get("message") ?? ""),
    });
  };

  return (
    <article className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6" lang="en">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <header className="mt-6 border-b border-border pb-6">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Contact support</h1>
        <p className="mt-5 max-w-2xl leading-7 text-foreground/85">
          Contact Kural Companion for account, purchase, privacy or technical support.
        </p>
      </header>

      <div className="space-y-8 py-8">
        <section aria-labelledby="send-message">
          <h2 id="send-message" className="text-xl font-semibold text-foreground">Send us a message</h2>
          <p className="mt-3 leading-7 text-foreground/80">
            Fill in the details below. We will open your email app with the message ready for you to review and send.
          </p>

          <form className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" onSubmit={sendMessage}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email-address">Reply email</Label>
                <Input
                  id="contact-email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={user?.email ?? ""}
                  maxLength={254}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-topic">What can we help with?</Label>
              <select
                id="contact-topic"
                name="topic"
                defaultValue={CONTACT_TOPICS[0]}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
              >
                {CONTACT_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                name="message"
                className="min-h-36 resize-y text-base md:text-sm"
                minLength={10}
                maxLength={3000}
                placeholder="Tell us how we can help. For purchase support, include the plan and Razorpay payment or order ID."
                aria-describedby="contact-message-help"
                required
              />
              <p id="contact-message-help" className="text-xs leading-5 text-muted-foreground">
                Never include your password, full card number, CVV, UPI PIN or banking password.
              </p>
            </div>

            <Button type="submit" className="min-h-11 w-full rounded-xl sm:w-auto">
              <Send className="h-4 w-4" aria-hidden="true" />
              Continue in email app
            </Button>
          </form>
        </section>

        <section aria-labelledby="contact-email">
          <h2 id="contact-email" className="text-xl font-semibold text-foreground">Email directly</h2>
          <p className="mt-3 leading-7 text-foreground/80">
            If the form does not open an email app, write to us directly. Use the email address connected to your Kural Companion account when your request concerns account data or a purchase.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section aria-labelledby="purchase-help">
          <h2 id="purchase-help" className="text-xl font-semibold text-foreground">Purchase help</h2>
          <p className="mt-3 leading-7 text-foreground/80">
            Include the plan name and Razorpay payment or order ID. Never email your password, full card number, CVV, UPI PIN or banking password.
          </p>
        </section>

        <section aria-labelledby="technical-help">
          <h2 id="technical-help" className="text-xl font-semibold text-foreground">Technical help</h2>
          <p className="mt-3 leading-7 text-foreground/80">
            Tell us the Kural number, device, browser or app version, and what happened. A screenshot is helpful when it does not contain private information.
          </p>
        </section>
      </div>
    </article>
  );
}
