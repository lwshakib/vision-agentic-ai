/**
 * Sign In Page
 * This file serves as the entry point for the sign-in route.
 * It simply renders the reusable LoginPage component.
 */

// Import the reusable LoginPage component that contains the actual sign-in form logic.
import LoginPage from '@/components/login';

/**
 * SignIn Component
 * The default export for the sign-in page.
 */
export default function SignIn() {
  // Renders the LoginPage component.
  return <LoginPage />;
}
