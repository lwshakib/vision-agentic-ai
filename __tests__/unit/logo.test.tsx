import { render, screen } from '@testing-library/react'
import { Logo } from '@/components/logo'

describe('Logo Component', () => {
  it('renders the SVG logo correctly', () => {
    render(<Logo data-testid="logo-svg" />)
    const logoElement = screen.getByTestId('logo-svg')
    expect(logoElement).toBeInTheDocument()
    expect(logoElement).toHaveClass('text-primary')
  })

  it('matches snapshot', () => {
    const { asFragment } = render(<Logo />)
    expect(asFragment()).toMatchSnapshot()
  })
})
