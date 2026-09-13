const BACKEND_APIs_URL = "https://edu2030-vibe-hackathon.onrender.com";
const ALLOWED_ENDPOINTS = new Set([
  "/api/profile",
  "/api/careers",
  "/api/opportunities",
  "/api/quiz"
]);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || message.type !== "VERITY_API_REQUEST") {
    return false;
  }

  (async function () {
    try {
      if (!BACKEND_API_URL || BACKEND_API_URL.includes("REPLACE_WITH_RENDER_API_URL")) {
        throw new Error("Backend URL is not configured. Replace REPLACE_WITH_RENDER_API_URL in background.js.");
      }
      if (!ALLOWED_ENDPOINTS.has(message.endpoint)) {
        throw new Error("Unsupported backend endpoint.");
      }

      const baseUrl = BACKEND_API_URL.replace(/\/+$/, "");
      const controller = new AbortController();
      const timeoutId = setTimeout(function () { controller.abort(); }, 60000);
      let response;
      try {
        response = await fetch(baseUrl + message.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.payload || {}),
          signal: controller.signal
        });
      } catch (fetchError) {
        if (fetchError && fetchError.name === "AbortError") {
          throw new Error("The backend request timed out after 60 seconds.");
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
      const responseText = await response.text();
      let data = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error("The backend returned invalid JSON.");
      }

      if (!response.ok) {
        const detail = data && data.detail ? data.detail : "The backend request failed.";
        sendResponse({ ok: false, error: String(detail) });
        return;
      }
      sendResponse({ ok: true, data: data });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "The backend request failed." });
    }
  })();

  return true;
});
