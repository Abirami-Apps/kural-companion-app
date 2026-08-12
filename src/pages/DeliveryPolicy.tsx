import { LegalPage } from "@/pages/LegalPage";

const sections = [
  {
    title: "Digital service only",
    paragraphs: [
      "Kural Companion Plus is a digital service. No physical product is shipped, so shipping addresses, courier delivery and physical delivery charges do not apply.",
    ],
  },
  {
    title: "How access is delivered",
    paragraphs: [
      "Premium access is attached to the signed-in Kural Companion account used during checkout. After a successful payment is verified, access is normally activated within a few moments and is available on supported web devices after sign-in.",
      "An internet connection is required for purchase verification, account synchronization and streaming audio. Some reading and device-local features may continue to work offline after the app has loaded them.",
    ],
  },
  {
    title: "If activation is delayed",
    paragraphs: [
      "First refresh the plan screen while signed in. If access is not active within 15 minutes, email support@abiramiaudio.com with the account email, selected plan and Razorpay payment or order ID. Never send full card or banking credentials.",
    ],
  },
  {
    title: "Future native apps",
    paragraphs: [
      "Availability on iOS, Android or television platforms depends on the release and store approval for each platform. A web purchase does not guarantee that an unreleased platform is available immediately.",
    ],
  },
];

export default function DeliveryPolicy() {
  return (
    <LegalPage
      title="Digital Delivery Policy"
      effectiveDate="8 August 2026"
      introduction="This policy explains how paid Kural Companion access is delivered."
      sections={sections}
    />
  );
}
