// Push notification handlers (loaded by the app's service worker)
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "Safety Hub", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Safety Hub", {
    body: [d.project, d.body].filter(Boolean).join(" - "),
    icon: "/icon-192.png", badge: "/icon-192.png",
    tag: d.screen ? `${d.slug || ""}-${d.screen}` : undefined, renotify: true,
    data: { slug: d.slug, screen: d.screen },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = `/?${d.slug ? `project=${d.slug}` : ""}${d.screen ? `&screen=${d.screen}` : ""}`;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
