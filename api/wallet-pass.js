// /api/wallet-pass.js
// Vercel Serverless Function — runs on the server, never in the browser.
// This is the only place the Google service account's private key is used.
// Required Vercel environment variables (set these in Vercel → Settings → Environment Variables):
//   GOOGLE_WALLET_CLIENT_EMAIL   — from the service account JSON ("client_email")
//   GOOGLE_WALLET_PRIVATE_KEY    — from the service account JSON ("private_key")
//   GOOGLE_WALLET_ISSUER_ID      — your Issuer ID (3388000000023199955)
//   SUPABASE_URL                 — same Supabase project URL already used elsewhere
//   SUPABASE_ANON_KEY            — same public anon key already used elsewhere

import jwt from "jsonwebtoken";

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const CLASS_ID = `${ISSUER_ID}.safety_hub_badge`;
const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const HUB_URL = "https://fcus-safety-hub.vercel.app";

// Vercel env vars get pasted in all sorts of ways — sometimes with the
// surrounding quotes from the JSON file still attached, sometimes with
// literal \n sequences instead of real line breaks. This normalizes
// whatever form it arrives in, and fails with a clear message instead
// of a cryptic crypto error if it's still not a real key afterward.
function getPrivateKey() {
  let key = (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n");
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_WALLET_PRIVATE_KEY doesn't look like a real private key (missing 'BEGIN PRIVATE KEY'). " +
      "Copy the exact 'private_key' value from your service account JSON file, including the BEGIN/END lines, " +
      "and paste it into Vercel with no extra quotes around it."
    );
  }
  return key;
}

async function getAccessToken() {
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: process.env.GOOGLE_WALLET_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    { algorithm: "RS256" }
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function ensureClassExists(accessToken) {
  const getRes = await fetch(`${WALLET_API_BASE}/genericClass/${CLASS_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (getRes.ok) return; // already exists

  const classPayload = {
    id: CLASS_ID,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['employer']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['badge']" }] } },
            },
          },
        ],
      },
    },
  };

  const createRes = await fetch(`${WALLET_API_BASE}/genericClass`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(classPayload),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create class: ${err}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionToken } = req.body || {};
    if (!sessionToken) return res.status(400).json({ error: "Missing sessionToken" });

    // Look up the person via the existing get_session function — same
    // security-definer RPC the app itself already uses to restore sessions.
    const sessionRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/get_session`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: sessionToken }),
    });
    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      return res.status(500).json({ error: `Could not reach Supabase (status ${sessionRes.status}): ${errText}. Check SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.` });
    }
    const person = await sessionRes.json();
    if (!person || !person.id) return res.status(401).json({ error: "Session lookup succeeded but returned no matching person — the badge session itself may actually be expired. Try logging out and back in." });

    const accessToken = await getAccessToken();
    await ensureClassExists(accessToken);

    const objectId = `${ISSUER_ID}.badge_${person.id}`;
    const qualCount = (person.qualifications || []).length;
    const expiredCount = (person.qualifications || []).filter((q) => q.status === "expired").length;

    const genericObject = {
      id: objectId,
      classId: CLASS_ID,
      state: "ACTIVE",
      logo: {
        sourceUri: { uri: `${HUB_URL}/pwa-192x192.png` },
      },
      cardTitle: { defaultValue: { language: "en-US", value: "Safety Hub Badge" } },
      subheader: { defaultValue: { language: "en-US", value: person.name || "" } },
      header: { defaultValue: { language: "en-US", value: person.role || "Crew Member" } },
      textModulesData: [
        { id: "employer", header: "EMPLOYER", body: person.employer || "—" },
        { id: "badge", header: "BADGE #", body: person.badge_number || "—" },
        { id: "quals", header: "DESIGNATIONS", body: `${qualCount} on file${expiredCount ? ` (${expiredCount} expired)` : ""}` },
      ],
      hexBackgroundColor: "#101010",
      ...(person.photo_url ? { heroImage: { sourceUri: { uri: person.photo_url } } } : {}),
      linksModuleData: {
        uris: [
          {
            uri: `${HUB_URL}/?screen=home`,
            description: "Open Safety Hub",
          },
        ],
      },
    };

    // Insert if new, patch if it already exists (person re-adding the pass,
    // or an update after their designations change).
    const insertRes = await fetch(`${WALLET_API_BASE}/genericObject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(genericObject),
    });
    if (!insertRes.ok) {
      const patchRes = await fetch(`${WALLET_API_BASE}/genericObject/${objectId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(genericObject),
      });
      if (!patchRes.ok) {
        const err = await patchRes.text();
        return res.status(500).json({ error: `Could not create or update pass: ${err}` });
      }
    }

    const privateKey = getPrivateKey();
    const saveToken = jwt.sign(
      {
        iss: process.env.GOOGLE_WALLET_CLIENT_EMAIL,
        aud: "google",
        typ: "savetowallet",
        payload: { genericObjects: [{ id: objectId, classId: CLASS_ID }] },
      },
      privateKey,
      { algorithm: "RS256" }
    );

    return res.status(200).json({ saveUrl: `https://pay.google.com/gp/v/save/${saveToken}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
}
