'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trpc } from '@/lib/trpc';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  const signUp = trpc.auth.signUp.useMutation({
    onSuccess: () => {
      // Account created - redirect to onboarding page
      router.push('/onboarding');
    },
    onError: (err) => {
      setError(err.message || 'Failed to create account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    signUp.mutate({ email, password, name });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-accent-purple items-center justify-center p-8">
        <div className="text-white text-center max-w-md">
          <Dumbbell className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">
            Start Coaching Today
          </h2>
          <p className="text-white/80">
            Join thousands of coaches using VoiceFit to transform
            their clients&apos; fitness journeys.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Dumbbell className="w-8 h-8 text-accent-blue" />
            <span className="text-xl font-bold">VoiceFit</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary mb-8">
            Start your 14-day free trial
          </p>

          {error && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <Input
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12"
                minLength={8}
                required
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-1 rounded border-background-tertiary text-accent-blue focus:ring-accent-blue"
                required
              />
              <span className="text-sm text-text-secondary">
                I agree to the{' '}
                <Link href="/terms" className="text-accent-blue hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-accent-blue hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={signUp.isPending}
            >
              Create Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <p className="mt-8 text-center text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
