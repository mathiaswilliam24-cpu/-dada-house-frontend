import webPush from "web-push";

let _configured = false;

export function getWebPush() {
  if (!_configured) {
    webPush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || "admin@mydadahouse.com"}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || ""
    );
    _configured = true;
  }
  return webPush;
}
