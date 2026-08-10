import { LegalPage } from "@/pages/LegalPage";

const sections = [
  {
    title: "Cancelling a recurring plan",
    paragraphs: [
      "Monthly and yearly Kural Companion Plus plans renew automatically until cancelled. While signed in, open the Kural Companion plan screen and choose Cancel renewal. You may also email support@abiramiaudio.com from the account used for purchase. Cancellation stops future renewals, and premium access normally continues until the end of the current paid billing period.",
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
      "For a web purchase, email support@abiramiaudio.com with the purchase email address, plan name, Razorpay payment or order ID, purchase date and a short explanation. Never send a full card number, CVV, UPI PIN, banking password or account password.",
      "We review refund requests based on the purchase circumstances, service delivery, applicable consumer law and this policy. Approval is not automatic except where required by law. If approved, we initiate the refund through Razorpay to the original payment method.",
    ],
  },
  {
    title: "Access and processing time",
    paragraphs: [
      "When a full refund is completed, the related premium entitlement may end immediately. After we initiate an approved refund, the bank, card network or payment method determines when the money appears in the customer account. We will provide the available refund reference on request.",
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
      effectiveDate="8 August 2026"
      introduction="This policy explains how to cancel a Kural Companion plan and how refund requests are handled."
      sections={sections}
    />
  );
}
