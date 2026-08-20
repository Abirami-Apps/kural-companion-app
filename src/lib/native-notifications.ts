import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/native";

export type NativeNotificationPermission = "granted" | "denied" | "default" | "unsupported";

export const HOURLY_NATIVE_NOTIFICATION_ID = 910001;
export const HOURLY_NATIVE_CHANNEL_ID = "hourly-kural";

export interface NativeHourlyNotificationContent {
  title: string;
  body: string;
  number: number;
}

/** Keep Capacitor's platform-specific permission states aligned with the web UI. */
export function mapNativeNotificationPermission(
  state: string,
): Exclude<NativeNotificationPermission, "unsupported"> {
  if (state === "granted" || state === "limited") return "granted";
  if (state === "denied") return "denied";
  return "default";
}

export async function checkNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!isNativeApp) return "unsupported";
  try {
    const result = await LocalNotifications.checkPermissions();
    return mapNativeNotificationPermission(result.display);
  } catch {
    return "unsupported";
  }
}

export async function requestNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!isNativeApp) return "unsupported";
  try {
    const result = await LocalNotifications.requestPermissions();
    return mapNativeNotificationPermission(result.display);
  } catch {
    return "unsupported";
  }
}

/** Schedule a short-lived native reminder for the test button or next app wake-up. */
export async function scheduleNativeHourlyNotification(
  content: NativeHourlyNotificationContent,
): Promise<boolean> {
  if (!isNativeApp) return false;

  try {
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: HOURLY_NATIVE_CHANNEL_ID,
        name: "Hourly Kural reminders",
        description: "Reminders for the Kural Companion hourly player",
        importance: 4,
        visibility: 1,
      });
    }

    await LocalNotifications.cancel({
      notifications: [{ id: HOURLY_NATIVE_NOTIFICATION_ID }],
    });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: HOURLY_NATIVE_NOTIFICATION_ID,
          title: content.title,
          body: content.body,
          extra: {
            url: `kuralcompanion://kural/${content.number}?autoplay=1`,
          },
          channelId: HOURLY_NATIVE_CHANNEL_ID,
          threadIdentifier: HOURLY_NATIVE_CHANNEL_ID,
          foreground: true,
          schedule: {
            at: new Date(Date.now() + 1_000),
          },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
