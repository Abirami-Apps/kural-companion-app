import { LegalPage } from "@/pages/LegalPage";

const sections = [
  {
    title: "Using Kural Companion",
    paragraphs: [
      "Kural Companion provides Tirukkural reading, meaning, audio, favourites, accessibility preferences and optional scheduled Hourly Kural features. You may use the service only lawfully and must not disrupt it, bypass access controls, or redistribute protected application assets without permission.",
      "Tamil text, meanings and audio may include material from identified source collections. Availability, wording and audio coverage can change when corrections or licensing requirements apply.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "You are responsible for the accuracy of your account information and for keeping your sign-in credentials secure. Contact support promptly if you believe your account has been accessed without permission.",
      "An account may be suspended when reasonably necessary to protect users, comply with law, investigate abuse, or prevent fraud. We will restore access when the underlying issue is resolved where appropriate.",
    ],
  },
  {
    title: "Subscriptions and lifetime access",
    paragraphs: [
      "Monthly and yearly plans renew automatically until cancelled. The price, billing interval, included taxes and renewal terms are shown before purchase. Paddle processes web purchases as merchant of record; future native-app purchases may instead be processed by Apple or Google under their store terms.",
      "You can cancel a recurring web plan using the subscription-management link supplied by Paddle. Cancellation stops future renewals and access normally continues through the paid period. A lifetime purchase is a one-time entitlement to the supported Kural Companion service for as long as that service is operated; it is not a promise that every future product, third-party service or platform will be included forever.",
    ],
  },
  {
    title: "Refunds",
    paragraphs: [
      "Refund requests for web purchases are handled through Paddle and remain subject to applicable consumer law. Purchases through Apple or Google are handled under the relevant store's refund process. Nothing in these terms limits a mandatory consumer right.",
    ],
  },
  {
    title: "Availability and liability",
    paragraphs: [
      "We work to keep the service accurate and available, but internet, browser, device, speech, notification and third-party payment services may occasionally fail or change. Scheduled web playback works only while browser and operating-system restrictions allow it.",
      "To the maximum extent permitted by law, Kural Companion is provided without a guarantee of uninterrupted availability and is not intended as legal, medical, financial or other professional advice.",
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may update these terms when the service, law or billing model changes. Material changes will be identified by a new effective date and communicated through the service when appropriate. Continued use after the effective date means the updated terms apply.",
    ],
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms and Conditions"
      effectiveDate="4 August 2026"
      introduction="These terms govern your use of Kural Companion and its optional paid plans. Please read them before purchasing or using the service."
      sections={sections}
    />
  );
}
