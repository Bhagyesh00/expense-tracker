/**
 * ExpenseFlow — SSO Authentication Edge Function (Phase 13)
 *
 * SAML Assertion Consumer Service (ACS) endpoint.
 * - Validates SAML response signatures against stored certificates
 * - Extracts user attributes (email, name, groups)
 * - Creates or links Supabase auth users
 * - Returns session token
 *
 * POST: receives SAML response (form-encoded SAMLResponse)
 * GET: initiates SSO flow by redirecting to IdP
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SSOConfig {
  id: string;
  workspace_id: string;
  provider: string;
  entity_id: string;
  sso_url: string;
  certificate: string;
  metadata_url: string | null;
  is_active: boolean;
}

interface SAMLAttributes {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  nameId?: string;
}

// ---------------------------------------------------------------------------
// SAML XML parsing helpers
// ---------------------------------------------------------------------------

function decodeBase64(encoded: string): string {
  const decoded = atob(encoded);
  return decoded;
}

function extractXMLElement(xml: string, tagName: string): string | null {
  // Handle namespaced and non-namespaced tags
  const patterns = [
    new RegExp(`<(?:[\\w]+:)?${tagName}[^>]*>([\\s\\S]*?)</(?:[\\w]+:)?${tagName}>`, "i"),
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1]!.trim();
  }
  return null;
}

function extractAttribute(xml: string, attributeName: string): string | null {
  const attrPattern = new RegExp(
    `<(?:[\\w]+:)?Attribute[^>]*Name=["']${attributeName}["'][^>]*>[\\s\\S]*?<(?:[\\w]+:)?AttributeValue[^>]*>([\\s\\S]*?)</(?:[\\w]+:)?AttributeValue>`,
    "i",
  );
  const match = xml.match(attrPattern);
  return match ? match[1]!.trim() : null;
}

function extractNameId(xml: string): string | null {
  return extractXMLElement(xml, "NameID");
}

function extractSAMLAttributes(samlXml: string): SAMLAttributes | null {
  const nameId = extractNameId(samlXml);

  // Try common attribute schemas
  const email =
    extractAttribute(samlXml, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ??
    extractAttribute(samlXml, "email") ??
    extractAttribute(samlXml, "Email") ??
    extractAttribute(samlXml, "http://schemas.xmlsoap.org/claims/EmailAddress") ??
    nameId;

  if (!email) return null;

  const firstName =
    extractAttribute(samlXml, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname") ??
    extractAttribute(samlXml, "firstName") ??
    extractAttribute(samlXml, "FirstName");

  const lastName =
    extractAttribute(samlXml, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname") ??
    extractAttribute(samlXml, "lastName") ??
    extractAttribute(samlXml, "LastName");

  const displayName =
    extractAttribute(samlXml, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name") ??
    extractAttribute(samlXml, "displayName") ??
    (firstName && lastName ? `${firstName} ${lastName}` : firstName ?? undefined);

  // Extract groups
  const groupsRaw = extractAttribute(
    samlXml,
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
  ) ?? extractAttribute(samlXml, "groups");

  const groups = groupsRaw ? groupsRaw.split(",").map((g) => g.trim()) : undefined;

  return {
    email,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    displayName: displayName ?? undefined,
    groups,
    nameId: nameId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// SAML signature validation
// ---------------------------------------------------------------------------

async function validateSAMLSignature(
  samlXml: string,
  certificate: string,
): Promise<boolean> {
  try {
    // Extract the signature value
    const signatureValue = extractXMLElement(samlXml, "SignatureValue");
    const signedInfo = samlXml.match(/<(?:[\w]+:)?SignedInfo[\s\S]*?<\/(?:[\w]+:)?SignedInfo>/i)?.[0];

    if (!signatureValue || !signedInfo) {
      console.warn("SAML response missing signature elements");
      return false;
    }

    // Clean certificate (remove PEM headers, whitespace)
    const cleanCert = certificate
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s/g, "");

    // Import the certificate
    const certBinary = Uint8Array.from(atob(cleanCert), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      certBinary,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Verify signature
    const sigBinary = Uint8Array.from(
      atob(signatureValue.replace(/\s/g, "")),
      (c) => c.charCodeAt(0),
    );

    const encoder = new TextEncoder();
    const signedInfoBytes = encoder.encode(signedInfo);

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      sigBinary,
      signedInfoBytes,
    );

    return isValid;
  } catch (err: unknown) {
    console.error("SAML signature validation error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SAML status check
// ---------------------------------------------------------------------------

function checkSAMLStatus(samlXml: string): boolean {
  // Check for Success status
  return samlXml.includes("urn:oasis:names:tc:SAML:2.0:status:Success");
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  const admin = createServiceClient();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace_id");

  // GET: Initiate SSO flow
  if (req.method === "GET") {
    if (!workspaceId) {
      return errorResponse("Missing workspace_id parameter");
    }

    const { data: ssoConfig, error } = await admin
      .from("sso_configs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (error || !ssoConfig) {
      return errorResponse("SSO not configured for this workspace", 404);
    }

    const config = ssoConfig as unknown as SSOConfig;
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sso-auth?workspace_id=${workspaceId}`;

    // Build SAML AuthnRequest
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    const authnRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        AssertionConsumerServiceURL="${callbackUrl}"
        Destination="${config.sso_url}">
        <saml:Issuer>${config.entity_id}</saml:Issuer>
        <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    const encoded = btoa(authnRequest);
    const redirectUrl = `${config.sso_url}?SAMLRequest=${encodeURIComponent(encoded)}&RelayState=${encodeURIComponent(workspaceId)}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl, ...corsHeaders },
    });
  }

  // POST: SAML Assertion Consumer Service
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const formData = await req.formData();
    const samlResponseEncoded = formData.get("SAMLResponse") as string | null;
    const relayState = formData.get("RelayState") as string | null;

    const effectiveWorkspaceId = workspaceId ?? relayState;

    if (!samlResponseEncoded || !effectiveWorkspaceId) {
      return errorResponse("Missing SAMLResponse or workspace identifier");
    }

    // 1. Decode SAML response
    const samlXml = decodeBase64(samlResponseEncoded);

    // 2. Fetch SSO config
    const { data: ssoConfig, error: configError } = await admin
      .from("sso_configs")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .eq("is_active", true)
      .single();

    if (configError || !ssoConfig) {
      return errorResponse("SSO not configured for this workspace", 404);
    }

    const config = ssoConfig as unknown as SSOConfig;

    // 3. Validate SAML response status
    if (!checkSAMLStatus(samlXml)) {
      return errorResponse("SAML authentication failed: IdP returned non-success status", 401);
    }

    // 4. Validate signature
    const isValid = await validateSAMLSignature(samlXml, config.certificate);
    if (!isValid) {
      console.error("SAML signature validation failed");
      return errorResponse("SAML signature validation failed", 401);
    }

    // 5. Extract user attributes
    const attributes = extractSAMLAttributes(samlXml);
    if (!attributes?.email) {
      return errorResponse("Could not extract email from SAML response", 400);
    }

    // 6. Find or create Supabase user
    // Check if user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === attributes.email.toLowerCase(),
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user via admin API
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: attributes.email,
        email_confirm: true,
        user_metadata: {
          full_name: attributes.displayName ?? attributes.email,
          sso_provider: config.provider,
          sso_workspace_id: effectiveWorkspaceId,
        },
      });

      if (createError || !newUser?.user) {
        return errorResponse(`Failed to create user: ${createError?.message ?? "Unknown error"}`, 500);
      }

      userId = newUser.user.id;

      // Create profile
      await admin.from("profiles").upsert({
        id: userId,
        full_name: attributes.displayName ?? null,
      });
    }

    // 7. Ensure user is a workspace member
    const { data: membership } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", effectiveWorkspaceId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      await admin.from("workspace_members").insert({
        workspace_id: effectiveWorkspaceId,
        user_id: userId,
        role: "member",
      });
    }

    // 8. Generate session
    const { data: session, error: sessionError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: attributes.email,
      });

    if (sessionError) {
      return errorResponse(`Session creation failed: ${sessionError.message}`, 500);
    }

    // Redirect to app with token
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    const redirectUrl = `${appUrl}/api/auth/callback?token_hash=${(session.properties as any)?.hashed_token}&type=magiclink`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl, ...corsHeaders },
    });
  } catch (err: unknown) {
    console.error("sso-auth error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
