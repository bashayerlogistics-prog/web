import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export default function SSOCallback() {
  return (
    <div className="min-h-[50vh] grid place-items-center p-6">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand/25 border-t-gold rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Completing Google sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
