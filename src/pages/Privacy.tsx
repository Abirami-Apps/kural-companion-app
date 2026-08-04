import { LegalPage } from "@/pages/LegalPage";

const sections = [
  {
    title: "Information we process",
    paragraphs: [
      "When you create an account, we process your email address, account identifier and authentication events. We also store the favourites, appearance preferences and Hourly Kural settings that you choose to synchronize. Recent playback state can remain only on your device.",
      "For paid plans, we receive limited purchase and entitlement information such as plan, status, dates and payment provider. Kural Companion does not receive or store your full payment-card number. Paddle, Apple or Google processes payment information under its own privacy terms.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use this information to authenticate you, synchronize your choices, provide purchased features, prevent abuse, support your account, maintain security and comply with legal obligations. We do not sell your personal information.",
    ],
  },
  {
    title: "Service providers",
    paragraphs: [
      "Supabase provides account and synchronized-data infrastructure. RevenueCat resolves subscription entitlements across platforms. Paddle acts as merchant of record for web purchases. Hosting, email, Apple and Google services may also process the minimum information needed for their functions.",
    ],
  },
  {
    title: "Retention and security",
    paragraphs: [
      "Account and synchronized information is retained while your account is active and for a reasonable period needed for recovery, fraud prevention, accounting and legal compliance. Access is restricted using account authentication, row-level database policies and server-only billing credentials.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You may use the reading experience without an account where the release permits it, change synchronized settings, cancel a subscription, or request account-data access or deletion. Some transaction records may need to be retained by the merchant of record or app store for legal and accounting reasons.",
    ],
  },
  {
    title: "Updates",
    paragraphs: [
      "We may update this notice as the service and applicable requirements change. The effective date above identifies the current version. Material changes will be communicated through the service when appropriate.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Privacy, account-data and deletion requests can be sent to support@abiramiaudio.com. Contact us from the email address associated with your Kural Companion account when the request concerns account-specific information.",
    ],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="4 August 2026"
      introduction="This notice explains the information Kural Companion processes, why it is needed and the choices available to you."
      sections={sections}
    />
  );
}
