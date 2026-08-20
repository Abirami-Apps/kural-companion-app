import { describe, expect, it } from "vitest";
import {
  HOURLY_NATIVE_NOTIFICATION_ID,
  mapNativeNotificationPermission,
  scheduleNativeHourlyNotification,
} from "@/lib/native-notifications";

describe("native notification helpers", () => {
  it("normalizes native permission states for the shared hourly UI", () => {
    expect(mapNativeNotificationPermission("granted")).toBe("granted");
    expect(mapNativeNotificationPermission("limited")).toBe("granted");
    expect(mapNativeNotificationPermission("denied")).toBe("denied");
    expect(mapNativeNotificationPermission("prompt")).toBe("default");
    expect(mapNativeNotificationPermission("prompt-with-rationale")).toBe("default");
  });

  it("does not call native scheduling from a browser test environment", async () => {
    await expect(
      scheduleNativeHourlyNotification({
        title: "Hourly Kural",
        body: "Kural 1",
        number: 1,
      }),
    ).resolves.toBe(false);
    expect(HOURLY_NATIVE_NOTIFICATION_ID).toBeGreaterThan(0);
  });
});
