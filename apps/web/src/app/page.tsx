'use client';

import Link from 'next/link';
import {
  Dumbbell,
  Users,
  BarChart3,
  Mic,
  Brain,
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Mic,
      title: 'Voice-First Logging',
      description: 'Natural language workout tracking with 95%+ accuracy',
    },
    {
      icon: Brain,
      title: 'AI-Powered Coaching',
      description: 'Personalized programs and real-time form guidance',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Track progress, PRs, and training load metrics',
    },
    {
      icon: Shield,
      title: 'Injury Prevention',
      description: 'Intelligent detection and recovery protocols',
    },
  ];

  const coachFeatures = [
    'Manage unlimited clients',
    'Create custom programs',
    'Real-time workout monitoring',
    'Automated progress reports',
    'Client communication tools',
    'Revenue tracking dashboard',
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background-primary/80 backdrop-blur-lg border-b border-background-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-8 h-8 text-accent-blue" />
              <span className="text-xl font-bold">VoiceFit</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">
                Features
              </Link>
              <Link href="#coaches" className="text-text-secondary hover:text-text-primary transition-colors">
                For Coaches
              </Link>
              <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-accent-blue text-white rounded-lg font-medium hover:bg-opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            Voice-First
            <span className="text-accent-blue"> Fitness Tracking</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8 animate-slide-up">
            Log workouts naturally with your voice. Get AI-powered coaching,
            injury prevention, and comprehensive analytics.
          </p>
          <div className="flex items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-6 py-3 bg-accent-blue text-white rounded-xl font-medium hover:bg-opacity-90 transition-opacity"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 border border-background-tertiary rounded-xl font-medium hover:bg-background-secondary transition-colors"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Train Smarter
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-background-primary rounded-2xl card-shadow card-shadow-hover transition-shadow"
              >
                <feature.icon className="w-12 h-12 text-accent-blue mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach Platform Section */}
      <section id="coaches" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-purple/10 text-accent-purple rounded-full text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                For Coaches
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Professional Coaching Platform
              </h2>
              <p className="text-text-secondary mb-8">
                Manage your entire coaching business from one dashboard.
                Scale your impact while maintaining personalized attention.
              </p>
              <ul className="space-y-3 mb-8">
                {coachFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/coaches"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-xl font-medium hover:bg-opacity-90 transition-opacity"
              >
                Learn More
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="bg-background-secondary rounded-2xl p-8 card-shadow">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background-primary p-4 rounded-xl">
                  <p className="text-text-secondary text-sm">Active Clients</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
                <div className="bg-background-primary p-4 rounded-xl">
                  <p className="text-text-secondary text-sm">This Month</p>
                  <p className="text-2xl font-bold text-accent-green">$12,450</p>
                </div>
                <div className="bg-background-primary p-4 rounded-xl">
                  <p className="text-text-secondary text-sm">Workouts Logged</p>
                  <p className="text-2xl font-bold">1,892</p>
                </div>
                <div className="bg-background-primary p-4 rounded-xl">
                  <p className="text-text-secondary text-sm">Avg Rating</p>
                  <p className="text-2xl font-bold">4.9 ⭐</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-accent-blue">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Training?
          </h2>
          <p className="text-white/80 mb-8">
            Join thousands of athletes and coaches using VoiceFit to achieve their goals.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-accent-blue rounded-xl font-semibold hover:bg-opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="w-6 h-6 text-accent-blue" />
                <span className="text-lg font-bold">VoiceFit</span>
              </div>
              <p className="text-text-secondary text-sm">
                Voice-first fitness tracking for athletes and coaches.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><Link href="/features" className="hover:text-text-primary">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-text-primary">Pricing</Link></li>
                <li><Link href="/coaches" className="hover:text-text-primary">For Coaches</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><Link href="/docs" className="hover:text-text-primary">Documentation</Link></li>
                <li><Link href="/support" className="hover:text-text-primary">Support</Link></li>
                <li><Link href="/blog" className="hover:text-text-primary">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li><Link href="/privacy" className="hover:text-text-primary">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-background-tertiary text-center text-text-secondary text-sm">
            © 2024 VoiceFit. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
