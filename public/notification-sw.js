/* global self */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawPath = event.notification.data?.url;
  const target = new URL(typeof rawPath === "string" ? rawPath : "/", self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const current = windows.find((client) => new URL(client.url).origin === target.origin);
        if (current) {
          await current.navigate(target.href);
          return current.focus();
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
