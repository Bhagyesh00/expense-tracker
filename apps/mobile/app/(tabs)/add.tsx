import { Redirect } from "expo-router";

// This screen is never shown — the tab button redirects to /expense/new.
// We need this file to exist so expo-router registers the tab route.
export default function AddTabRedirect() {
  return <Redirect href="/expense/new" />;
}
