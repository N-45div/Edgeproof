import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
} from "eve/connections";
import { createHash, randomBytes } from "node:crypto";

const solaMcpUrl = process.env.SOLA_MCP_URL || "https://api.sola.security/mcp";
const bearerToken = process.env.SOLA_MCP_BEARER_TOKEN?.trim();
const authMode = process.env.SOLA_AUTH_MODE || "client_credentials";
const solaClientId = process.env.SOLA_CLIENT_ID;
const solaClientSecret = process.env.SOLA_SECURITY_KEY || process.env.SOLA_CLIENT_SECRET;
const authorizationEndpoint =
  process.env.SOLA_AUTHORIZATION_ENDPOINT || "https://auth.sola.security/oauth/authorize";
const tokenEndpoint = process.env.SOLA_TOKEN_ENDPOINT || "https://auth.sola.security/oauth/token";
const scopes = process.env.SOLA_OAUTH_SCOPES || "openid profile email";
let cachedClientCredentialsToken: { expiresAt: number; token: string } | undefined;

type SolaOAuthResume = {
  verifier: string;
  state: string;
};

function randomBase64Url(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function sha256Base64Url(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

function buildSolaAuth() {
  if (authMode === "bearer" && bearerToken) {
    return {
      getToken: async () => ({ token: bearerToken }),
    };
  }

  if (authMode === "client_credentials") {
    return {
      async getToken() {
        if (cachedClientCredentialsToken && cachedClientCredentialsToken.expiresAt > Date.now() + 60000) {
          return cachedClientCredentialsToken;
        }

        if (!solaClientId || !solaClientSecret) {
          throw new ConnectionAuthorizationFailedError("sola", {
            reason: "missing_client_credentials",
            retryable: false,
            message: "SOLA_CLIENT_ID and SOLA_SECURITY_KEY are required for Sola MCP client credentials.",
          });
        }

        const body = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: solaClientId,
          client_secret: solaClientSecret,
          resource: solaMcpUrl,
          scope: scopes,
        });

        const response = await fetch(tokenEndpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          access_token?: string;
          expires_in?: number;
          error?: string;
          error_description?: string;
        };

        if (!response.ok || !payload.access_token) {
          throw new ConnectionAuthorizationFailedError("sola", {
            reason: payload.error || `http_${response.status}`,
            retryable: response.status >= 500,
            message:
              payload.error_description ||
              `Sola client credentials token request failed with HTTP ${response.status}.`,
          });
        }

        cachedClientCredentialsToken = {
          token: payload.access_token,
          expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
        };
        return cachedClientCredentialsToken;
      },
    };
  }

  return defineInteractiveAuthorization<SolaOAuthResume>({
    async getToken() {
      throw new ConnectionAuthorizationRequiredError("sola", {
        message: "Authorize Sola MCP to inspect your workspace.",
      });
    },
    async startAuthorization({ callbackUrl }) {
      if (!solaClientId) {
        throw new ConnectionAuthorizationFailedError("sola", {
          reason: "missing_client_id",
          retryable: false,
          message: "SOLA_CLIENT_ID is required for Sola MCP OAuth.",
        });
      }

      const verifier = randomBase64Url(48);
      const state = randomBase64Url(24);
      const url = new URL(authorizationEndpoint);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", solaClientId);
      url.searchParams.set("redirect_uri", callbackUrl);
      url.searchParams.set("scope", scopes);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", sha256Base64Url(verifier));
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("resource", solaMcpUrl);

      return {
        challenge: {
          displayName: "Sola",
          instructions: "Authorize Sola MCP, then return to this chat.",
          url: url.toString(),
        },
        resume: { verifier, state },
      };
    },
    async completeAuthorization({ callback, callbackUrl, resume }) {
      if (callback.params.error) {
        throw new ConnectionAuthorizationFailedError("sola", {
          reason: callback.params.error,
          retryable: callback.params.error !== "access_denied",
          message: callback.params.error_description || "Sola MCP authorization failed.",
        });
      }

      if (!resume || callback.params.state !== resume.state) {
        throw new ConnectionAuthorizationFailedError("sola", {
          reason: "invalid_state",
          retryable: false,
          message: "Sola MCP authorization returned an invalid state.",
        });
      }

      const code = callback.params.code;
      if (!code || !solaClientId) {
        throw new ConnectionAuthorizationFailedError("sola", {
          reason: "missing_code",
          retryable: true,
          message: "Sola MCP authorization did not return an authorization code.",
        });
      }

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: solaClientId,
        code_verifier: resume.verifier,
        resource: solaMcpUrl,
      });

      if (solaClientSecret) {
        body.set("client_secret", solaClientSecret);
      }

      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!response.ok || !payload.access_token) {
        throw new ConnectionAuthorizationFailedError("sola", {
          reason: payload.error || `http_${response.status}`,
          retryable: response.status >= 500,
          message: payload.error_description || `Sola token exchange failed with HTTP ${response.status}.`,
        });
      }

      return {
        token: payload.access_token,
        expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
      };
    },
  });
}

export default defineMcpClientConnection({
  url: solaMcpUrl,
  description:
    "Sola Security workspace MCP. Read-only access to projects, connected security data sources, vendor tables, schemas, saved queries, SQL execution, and Sola graph intelligence. Use it for EdgeProof code-to-edge breach path investigations across Cloudflare, GitHub Cloud, and Sola Web Checker.",
  auth: buildSolaAuth(),
  headers: {
    "x-create-resources": "true",
    "x-query-timeout": "600",
    "x-query-rows-limit": "100000",
    "x-query-memory-limit": "10485760"
  }
});
