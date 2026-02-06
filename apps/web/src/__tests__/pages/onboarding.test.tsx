import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/page';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    coachDashboard: {
      updateProfile: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('OnboardingPage', () => {
  it('renders onboarding content', () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('renders continue button', () => {
    render(<OnboardingPage />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
