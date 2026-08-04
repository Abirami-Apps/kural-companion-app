import { ArrowLeft, LifeBuoy, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "support@abiramiaudio.com";

export default function Contact() {
  const navigate = useNavigate();

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
        <section aria-labelledby="contact-email">
          <h2 id="contact-email" className="text-xl font-semibold text-foreground">Email</h2>
          <p className="mt-3 leading-7 text-foreground/80">
            Use the email address connected to your Kural Companion account when your request concerns account data or a purchase.
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
            Include the plan name and Paddle receipt or transaction reference. Never email your password or full payment-card number.
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
