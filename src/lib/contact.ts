export const SUPPORT_EMAIL = "support@abiramiaudio.com";

export const CONTACT_TOPICS = [
  "General question",
  "Purchase or subscription",
  "Account access",
  "Technical problem",
  "Privacy or account data",
] as const;

export type ContactTopic = typeof CONTACT_TOPICS[number];

export type SupportMessage = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
};

const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export function buildSupportMailto(input: SupportMessage): string {
  const name = singleLine(input.name) || "Not provided";
  const email = singleLine(input.email);
  const topic = CONTACT_TOPICS.includes(input.topic)
    ? input.topic
    : CONTACT_TOPICS[0];
  const message = input.message.trim();
  const subject = `Kural Companion support: ${topic}`;
  const body = [
    `Name: ${name}`,
    `Reply email: ${email}`,
    `Topic: ${topic}`,
    "",
    "Message:",
    message,
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
