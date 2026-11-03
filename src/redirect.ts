import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";
// Dedicated MSAL v5 bridge: no React initialization, no Graph calls, no auth logs.
void broadcastResponseToMainFrame().catch(() => {
  history.replaceState(null, "", location.pathname);
  document.getElementById("status")!.textContent =
    "No se pudo completar el inicio de sesión. Vuelve a la aplicación e inténtalo de nuevo.";
  const a = document.createElement("a");
  a.href = "/";
  a.textContent = "Volver a Armario Digital";
  document.body.append(a);
});
