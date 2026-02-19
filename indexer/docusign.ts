/**
 * DocuSign sandbox: OAuth token exchange, create envelope, recipient view.
 * Requires DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_SECRET_KEY, and redirect URI in app.
 */

const DOCUSIGN_OAUTH_BASE = "https://account-d.docusign.com";
const DOCUSIGN_TOKEN_URL = `${DOCUSIGN_OAUTH_BASE}/oauth/token`;
const DOCUSIGN_USERINFO_URL = `${DOCUSIGN_OAUTH_BASE}/oauth/userinfo`;

export async function exchangeCodeForTokens(
  integrationKey: string,
  secretKey: string,
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const basic = Buffer.from(`${integrationKey}:${secretKey}`).toString("base64");
  const res = await fetch(DOCUSIGN_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign token exchange failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return data;
}

export async function getUserInfo(accessToken: string): Promise<{ account_id: string; base_uri: string }> {
  const res = await fetch(DOCUSIGN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`DocuSign userinfo failed: ${res.status}`);
  const data = (await res.json()) as { accounts?: Array<{ account_id: string; base_uri: string }> };
  const acc = data.accounts?.[0];
  if (!acc) throw new Error("DocuSign userinfo: no account");
  return { account_id: acc.account_id, base_uri: acc.base_uri ?? "https://demo.docusign.net" };
}

export async function getAccessTokenFromRefresh(
  integrationKey: string,
  secretKey: string,
  refreshToken: string
): Promise<string> {
  const basic = Buffer.from(`${integrationKey}:${secretKey}`).toString("base64");
  const res = await fetch(DOCUSIGN_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign refresh failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createEnvelope(
  baseUri: string,
  accountId: string,
  accessToken: string,
  signerEmail: string,
  signerName: string,
  returnUrl: string
): Promise<{ envelopeId: string; signingUrl: string }> {
  const html = `
<!DOCTYPE html><html><body>
<h2>Employment Agreement</h2>
<p>This document is for signature as part of confidential payroll onboarding.</p>
<p>Signer: ${signerName} (${signerEmail})</p>
<p><strong>Please sign below.</strong></p>
</body></html>`;
  const documentBase64 = Buffer.from(html).toString("base64");

  const envelope = {
    status: "sent",
    emailSubject: "Employment agreement – please sign",
    documents: [
      {
        documentBase64,
        name: "Employment Agreement",
        fileExtension: "html",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: signerEmail,
          name: signerName || signerEmail,
          recipientId: "1",
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: "400",
                tabLabel: "Signature",
              },
            ],
          },
        },
      ],
    },
  };

  const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(envelope),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign create envelope failed: ${res.status} ${err}`);
  }
  const created = (await res.json()) as { envelopeId: string };
  const returnUrlWithId = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}envelope_id=${encodeURIComponent(created.envelopeId)}`;
  const signingUrl = await createRecipientView(baseUri, accountId, accessToken, created.envelopeId, signerEmail, signerName, returnUrlWithId);
  return { envelopeId: created.envelopeId, signingUrl };
}

export async function getEnvelopeStatus(
  baseUri: string,
  accountId: string,
  accessToken: string,
  envelopeId: string
): Promise<string> {
  const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign get envelope failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { status: string };
  return data.status;
}

export async function createRecipientView(
  baseUri: string,
  accountId: string,
  accessToken: string,
  envelopeId: string,
  signerEmail: string,
  signerName: string,
  returnUrl: string
): Promise<string> {
  const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      returnUrl,
      authenticationMethod: "none",
      email: signerEmail,
      userName: signerName || signerEmail,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign recipient view failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function getAuthUrl(integrationKey: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    scope: "signature impersonation",
    client_id: integrationKey,
    redirect_uri: redirectUri,
    state,
  });
  return `${DOCUSIGN_OAUTH_BASE}/oauth/auth?${params.toString()}`;
}
