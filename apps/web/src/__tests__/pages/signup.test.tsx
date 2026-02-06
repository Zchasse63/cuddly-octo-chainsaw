import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignupPage from '@/app/(auth)/signup/page';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      signUp: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('SignupPage', () => {
  it('renders signup form', () => {
    render(<SignupPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders email input', () => {
    render(<SignupPage />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(<SignupPage />);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toBeInTheDocument();
  });
});
