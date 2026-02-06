import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';
import NewClientPage from '@/app/dashboard/clients/new/page';
import { renderWithProviders } from '../utils/test-helpers';

// Mock tRPC for forms that use it
vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      coachDashboard: {
        getClientList: {
          invalidate: vi.fn(),
        },
      },
    }),
    auth: {
      signIn: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
      signUp: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
    coachDashboard: {
      inviteClient: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

describe('Form Submissions', () => {
  describe('Login Form', () => {
    it('accepts email input', () => {
      renderWithProviders(<LoginPage />);
      const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('accepts password input', () => {
      renderWithProviders(<LoginPage />);
      const passwordInput = screen.getByPlaceholderText(/password/i) as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });

    it('has submit button', () => {
      renderWithProviders(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Signup Form', () => {
    it('accepts email input', () => {
      renderWithProviders(<SignupPage />);
      const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      expect(emailInput.value).toBe('new@example.com');
    });

    it('has submit button', () => {
      renderWithProviders(<SignupPage />);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Client Invite Form', () => {
    it('accepts email input', () => {
      renderWithProviders(<NewClientPage />);
      // Need to expand the invite form first
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Get all email inputs and select the first one (invite form)
      const emailInputs = screen.getAllByPlaceholderText(/john@example.com/i);
      const emailInput = emailInputs[0] as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'client@example.com' } });

      expect(emailInput.value).toBe('client@example.com');
    });

    it('has submit button', () => {
      renderWithProviders(<NewClientPage />);
      // Need to expand the invite form first
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});
