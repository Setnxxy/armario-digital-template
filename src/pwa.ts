export function registerPWA() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let pending: ServiceWorkerRegistration | undefined,
    applying = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (applying) location.reload();
  });
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      pending = reg;
      if (reg.waiting) window.dispatchEvent(new Event("armario-update"));
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            window.dispatchEvent(new Event("armario-update"));
        });
      });
    })
    .catch(() => {
      window.dispatchEvent(new Event("armario-pwa-error"));
    });
  window.addEventListener("armario-apply-update", () => {
    if (pending?.waiting) {
      applying = true;
      pending.waiting.postMessage("SKIP_WAITING");
    }
  });
}
