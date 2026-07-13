import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;

export const initMixpanel = () => {
  if (typeof window === "undefined") return;
  if (!MIXPANEL_TOKEN) {
    console.warn("⚠️ [Mixpanel] Project Token is missing. Network tracking is disabled, but local logs will still be shown below.");
    return;
  }
  if (!isInitialized) {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === "development",
      track_pageview: false,
      persistence: "localStorage",
    });
    isInitialized = true;
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  
  // Console logger for developer debugging
  console.log(`📊 [Mixpanel Event] ${eventName}`, properties || {});
  
  initMixpanel();
  if (isInitialized) {
    mixpanel.track(eventName, properties);
  }
};

export const identifyUser = (token: string, nickname: string) => {
  if (typeof window === "undefined") return;
  
  console.log(`👤 [Mixpanel Identify] ${nickname}`);
  
  initMixpanel();
  if (isInitialized) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      const userId = payload.sub || nickname;

      mixpanel.identify(userId);
      mixpanel.people.set({
        $name: nickname,
        nickname: nickname,
      });
    } catch {
      mixpanel.identify(nickname);
      mixpanel.people.set({
        $name: nickname,
        nickname: nickname,
      });
    }
  }
};

export const resetUser = () => {
  if (typeof window === "undefined") return;
  
  console.log("👤 [Mixpanel Reset]");
  
  initMixpanel();
  if (isInitialized) {
    mixpanel.reset();
  }
};
