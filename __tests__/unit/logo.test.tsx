/**
 * Logo Component Unit Tests
 * Verifies that the branding logo renders correctly and maintains CSS class consistency.
 * Includes a snapshot test to catch unexpected UI changes.
 */

import { render, screen } from '@testing-library/react';
import { Logo } from '@/components/logo';

describe('Logo Component', () => {
  /**
   * Test: Visibility and Styling
   * Ensures the SVG is present in the DOM and has the correct theme colors.
   */
  it('renders the SVG logo correctly', () => {
    // Render the component with a test ID for easy selection.
    render(<Logo data-testid="logo-svg" />);

    // Find the element in the virtual DOM.
    const logoElement = screen.getByTestId('logo-svg');

    // Assertions.
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toHaveClass('text-primary'); // Check for primary branding color.
  });

  /**
   * Test: Snapshot Consistency
   * Compares the current render output with a stored baseline.
   */
  it('matches snapshot', () => {
    const { asFragment } = render(<Logo />);
    expect(asFragment()).toMatchSnapshot();
  });
});
