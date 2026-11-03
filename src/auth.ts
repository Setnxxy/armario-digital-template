import type { PublicClientApplication } from "@azure/msal-browser";
export const scopes = ["Files.ReadWrite.AppFolder"];
export const clientId =
  import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim() ||
  localStorage.getItem("armario-public-client-id") ||
  "";
let ready: Promise<PublicClientApplication> | undefined;
export async function auth() {
  if (!clientId)
    throw Error(
      "Falta el Application (client) ID. Sigue la guía de configuración.",
    );
  if (!ready)
    ready = (async () => {
      try {
        const { PublicClientApplication } = await import("@azure/msal-browser");
        const p = new PublicClientApplication({
          auth: {
            clientId,
            authority: "https://login.microsoftonline.com/consumers",
            redirectUri:
              import.meta.env.VITE_REDIRECT_URI ||
              location.origin + "/redirect.html",
            postLogoutRedirectUri: location.origin + "/",
          },
          cache: { cacheLocation: "sessionStorage" },
          system: {
            loggerOptions: {
              loggerCallback: () => {},
              piiLoggingEnabled: false,
            },
          },
        });
        await p.initialize();
        const result = await p.handleRedirectPromise();
        if (result?.account) p.setActiveAccount(result.account);
        return p;
      } catch {
        ready = undefined;
        throw Error(
          "Microsoft no pudo inicializar la sesión. Comprueba Client ID, conexión y URI SPA /redirect.html.",
        );
      }
    })();
  return ready;
}
export async function signIn() {
  const p = await auth();
  try {
    await p.loginRedirect({ scopes, prompt: "select_account" });
  } catch {
    throw Error(
      "No se pudo abrir el inicio de sesión Microsoft. Comprueba la configuración y vuelve a intentar.",
    );
  }
}
export async function token() {
  const p = await auth();
  const account = p.getActiveAccount() || p.getAllAccounts()[0];
  if (!account) throw Error("Inicia sesión con tu cuenta Microsoft personal.");
  try {
    return (await p.acquireTokenSilent({ scopes, account })).accessToken;
  } catch {
    throw Error(
      "Tu sesión requiere autorización o conexión. Conserva tu formulario; vuelve a iniciar sesión cuando hayas exportado cualquier propuesta pendiente.",
    );
  }
}
export async function signedIn() {
  if (!clientId) return false;
  const p = await auth();
  return !!(p.getActiveAccount() || p.getAllAccounts()[0]);
}
export async function signOut() {
  const p = await auth();
  await p.logoutRedirect();
}
export async function reauthorize() {
  const p = await auth();
  const account = p.getActiveAccount() || p.getAllAccounts()[0];
  if (!account)
    throw Error("No hay sesión para renovar. Inicia sesión desde Ajustes.");
  try {
    const result = await p.acquireTokenPopup({ scopes, account });
    if (result.account?.homeAccountId !== account.homeAccountId)
      throw Error("account-change");
  } catch {
    throw Error(
      "No se renovó la sesión de la misma cuenta. Conserva el formulario y vuelve a intentar con tu cuenta original.",
    );
  }
}
