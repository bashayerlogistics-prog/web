import { ClerkProvider } from '@clerk/clerk-react';
import CustomerAuthProvider from './CustomerAuthProvider';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/** Isolated so Clerk JS stays out of the public homepage chunk. */
export default function ClerkAuthTree({ children }) {
  return (
    <ClerkProvider publishableKey={clerkPubKey} afterSignOutUrl="/">
      <CustomerAuthProvider>{children}</CustomerAuthProvider>
    </ClerkProvider>
  );
}
