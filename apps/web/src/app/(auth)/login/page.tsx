'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trpc } from '@/lib/trpc';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: (data) => {
      // Store the access token from the Supabase session
      if (data.session?.access_token) {
        localStorage.setItem('token', data.session.access_token);
      }
      router.push('/dashboard');
    },
    onError: (err) => {
      setError(err.message || 'Invalid credentials');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    signIn.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Dumbbell className="w-8 h-8 text-accent-blue" />
            <span className="text-xl font-bold">VoiceFit</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-text-secondary mb-8">
            Sign in to your coach dashboard
          </p>

          {error && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-background-tertiary text-accent-blue focus:ring-accent-blue"
                />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-accent-blue hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={signIn.isPending}
            >
              Sign In
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <p className="mt-8 text-center text-text-secondary">
            Don't have an account?{' '}
            <Link href="/signup" className="text-accent-blue hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-accent-blue items-center justify-center p-8">
        <div className="text-white text-center max-w-md">
          <Dumbbell className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">
            Coach Platform
          </h2>
          <p className="text-white/80">
            Manage your clients, create programs, and track progress
            all from one powerful dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
