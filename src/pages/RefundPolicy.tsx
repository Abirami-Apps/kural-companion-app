import { LegalPage } from "@/pages/LegalPage";

const sections = [
  {
    title: "Cancelling a recurring plan",
    paragraphs: [
      "Monthly and yearly Kural Companion Plus plans renew automatically until cancelled. You can cancel using the subscription-management link in the purchase receipt sent by Paddle. Cancellation stops future renewals, and premium access normally continues until the end of the current paid billing period.",
      "If you cannot locate the management link, contact support@abiramiaudio.com from the email address used for the purchase.",
    ],
  },
  {
    title: "Lifetime purchases",
    paragraphs: [
      "The lifetime plan is a one-time purchase and does not renew. It provides access to the supported Kural Companion service for as long as that service is operated, subject to the Terms and Conditions.",
    ],
  },
  {
    title: "Requesting a refund",
    paragraphs: [
      "For a web purchase, email support@abiramiaudio.com with the purchase email address, plan name, Paddle receipt or transaction reference, and a short explanation of the request. Never send a full payment-card number or password.",
      "Paddle processes web payments as merchant of record and handles approved refunds. Eligibility depends on the purchase circumstances, applicable consumer law and Paddle's processes. This policy does not limit any mandatory consumer right.",
    ],
  },
  {
    title: "Access after a refund",
    paragraphs: [
      "When a full refund is completed, the related premium entitlement may end immediately. Partial refunds, credits and processing times are determined by Paddle and the payment method used.",
    ],
  },
  {
    title: "Future App Store and Google Play purchases",
    paragraphs: [
      "Purchases made through Apple or Google are cancelled and refunded under the relevant store's rules and tools. Kural Companion cannot directly issue a refund for a transaction controlled by an app store.",
    ],
  },
];

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      effectiveDate="4 August 2026"
      introduction="This policy explains how to cancel a Kural Companion plan and how refund requests are handled."
      sections={sections}
    />
  );
}
