/**
 * Sign Up Page
 * This file serves as the entry point for the sign-up route.
 * It renders the SignUp component which contains the registration form.
 */

// Import the SignUp component which contains the logic and UI for user registration.
import SignUp from '@/components/auth/sign-up';

/**
 * Page Component
 * The default export for the sign-up page.
 */
export default function Page() {
  // Renders the SignUp component.
  return <SignUp />;
}
