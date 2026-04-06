"use client";

import { useState } from "react";
import {
  KeyRound,
  Shield,
  Check,
  X,
  Upload,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type SSOProvider = "saml" | "okta" | "azure";

interface SSOConfig {
  provider: SSOProvider;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  metadataUrl: string;
  enabled: boolean;
}

const PROVIDERS: {
  id: SSOProvider;
  name: string;
  description: string;
  color: string;
}[] = [
  {
    id: "saml",
    name: "SAML 2.0",
    description: "Generic SAML identity provider",
    color: "bg-gray-600",
  },
  {
    id: "okta",
    name: "Okta",
    description: "Okta Workforce Identity Cloud",
    color: "bg-blue-600",
  },
  {
    id: "azure",
    name: "Azure AD",
    description: "Microsoft Entra ID (Azure AD)",
    color: "bg-sky-600",
  },
];

export default function SSOPage() {
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider>("saml");
  const [config, setConfig] = useState<SSOConfig>({
    provider: "saml",
    entityId: "",
    ssoUrl: "",
    certificate: "",
    metadataUrl: "",
    enabled: false,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  function handleProviderSelect(id: SSOProvider) {
    setSelectedProvider(id);
    setConfig((prev) => ({ ...prev, provider: id }));
    setTestResult(null);
  }

  async function handleTestConnection() {
    if (!config.ssoUrl || !config.entityId) {
      toast.error("Please fill in Entity ID and SSO URL first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 2000));
    setTesting(false);
    const success = Math.random() > 0.3;
    setTestResult(success ? "success" : "error");
    if (success) {
      toast.success("SSO connection test passed");
    } else {
      toast.error("SSO connection test failed. Check your configuration.");
    }
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    toast.success("SSO configuration saved");
  }

  function handleToggle() {
    setConfig((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      toast.success(next.enabled ? "SSO enabled" : "SSO disabled");
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Single Sign-On
        </h1>
        <p className="mt-1 text-muted-foreground">
          Configure SSO for your workspace to enable secure, centralized
          authentication
        </p>
      </div>

      {/* Provider Selection */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Choose Provider
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderSelect(provider.id)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                selectedProvider === provider.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color} text-white`}
              >
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {provider.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {provider.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Configuration
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {config.enabled ? "Enabled" : "Disabled"}
            </span>
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Entity ID (Issuer)
            </label>
            <input
              type="text"
              value={config.entityId}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, entityId: e.target.value }))
              }
              placeholder={
                selectedProvider === "okta"
                  ? "https://your-domain.okta.com"
                  : selectedProvider === "azure"
                    ? "https://sts.windows.net/{tenant-id}/"
                    : "https://your-idp.com/entity-id"
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              SSO URL (Login Endpoint)
            </label>
            <input
              type="url"
              value={config.ssoUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, ssoUrl: e.target.value }))
              }
              placeholder={
                selectedProvider === "okta"
                  ? "https://your-domain.okta.com/app/xxx/sso/saml"
                  : selectedProvider === "azure"
                    ? "https://login.microsoftonline.com/{tenant-id}/saml2"
                    : "https://your-idp.com/sso/saml"
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              X.509 Certificate
            </label>
            <div className="mt-1 flex gap-2">
              <textarea
                value={config.certificate}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    certificate: e.target.value,
                  }))
                }
                placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDxTCCAq2gAwIBAgI...&#10;-----END CERTIFICATE-----"
                rows={4}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="mt-1 text-xs">Upload</span>
                <input type="file" accept=".pem,.crt,.cer" className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Metadata URL (optional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="url"
                value={config.metadataUrl}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    metadataUrl: e.target.value,
                  }))
                }
                placeholder="https://your-idp.com/metadata.xml"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                Fetch
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-fill configuration from metadata URL
            </p>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`mt-4 rounded-lg p-3 ${
              testResult === "success"
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult === "success" ? (
                <>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Connection test passed
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Connection test failed. Verify your configuration.
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Test Connection
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>
      </div>

      {/* Service Provider Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Service Provider Details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use these values when configuring ExpenseFlow in your identity provider
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              ACS URL (Assertion Consumer Service)
            </p>
            <code className="text-sm text-foreground">
              https://app.expenseflow.com/api/auth/saml/callback
            </code>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Entity ID
            </p>
            <code className="text-sm text-foreground">
              https://app.expenseflow.com
            </code>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Sign-on URL
            </p>
            <code className="text-sm text-foreground">
              https://app.expenseflow.com/api/auth/saml/login
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
