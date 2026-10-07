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

export function getContactEndpoint(value: string | undefined): string {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && !url.hash
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export const contactEndpoint = getContactEndpoint(import.meta.env.VITE_CONTACT_ENDPOINT);

export async function submitSupportMessage(
  input: SupportMessage & { website: string },
  endpoint = contactEndpoint,
): Promise<void> {
  const url = getContactEndpoint(endpoint);
  if (!url) throw new Error("Direct sending is not configured. Please email support directly.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email.trim(),
        topic: input.topic,
        message: input.message.trim(),
        website: input.website,
      }),
    });
    if (response.status === 429) {
      throw new Error("Too many messages. Please try again later or email support directly.");
    }
    if (!response.ok) throw new Error("Submission could not be confirmed. Please email support directly.");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
      throw new Error("Submission could not be confirmed. Please email support directly.");
    }
  } catch (error) {
    if (error instanceof Error && /^(Too many messages|Submission could not)/.test(error.message)) {
      throw error;
    }
    throw new Error("Submission could not be confirmed. Your draft is kept below; please email support directly.");
  } finally {
    clearTimeout(timeout);
  }
}

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
