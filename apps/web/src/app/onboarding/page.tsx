'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ClipboardList,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  Mail,
  Phone,
  Globe,
  Upload,
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'business' | 'profile' | 'features' | 'import' | 'complete';

type BusinessInfo = {
  businessName: string;
  businessType: 'individual' | 'studio' | 'gym' | 'online';
  website: string;
  phone: string;
};

type ProfileInfo = {
  displayName: string;
  bio: string;
  specialties: string[];
  certifications: string[];
};

const SPECIALTIES = [
  'Strength Training',
  'Bodybuilding',
  'Powerlifting',
  'Olympic Weightlifting',
  'CrossFit',
  'Running',
  'Endurance',
  'HIIT',
  'Yoga',
  'Mobility',
  'Nutrition',
  'Weight Loss',
  'Sports Performance',
  'Rehabilitation',
];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: '',
    businessType: 'individual',
    website: '',
    phone: '',
  });
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
    displayName: '',
    bio: '',
    specialties: [],
    certifications: [],
  });
  const [newCertification, setNewCertification] = useState('');

  const steps: OnboardingStep[] = ['welcome', 'business', 'profile', 'features', 'import', 'complete'];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex) / (steps.length - 1)) * 100;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    // TODO: Save onboarding data to backend
    router.push('/dashboard');
  };

  const toggleSpecialty = (specialty: string) => {
    setProfileInfo((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setProfileInfo((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    setProfileInfo((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const renderWelcome = () => (
    <div className="text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to VoiceFit Coach
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Let&apos;s set up your coaching dashboard. This will only take a few minutes.
      </p>

      <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Program Builder</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create custom training programs with our AI-assisted builder
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Client Messaging</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Communicate with clients directly through the app
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track client progress and adherence in real-time
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <Users className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Client Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your entire client roster from one place
          </p>
        </div>
      </div>

      <button
        onClick={handleNext}
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center mx-auto"
      >
        Get Started
        <ChevronRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );

  const renderBusiness = () => (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Business Information
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Tell us about your coaching business
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={businessInfo.businessName}
              onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
              placeholder="Your business or coaching name"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'individual', label: 'Individual Coach' },
              { value: 'studio', label: 'Personal Training Studio' },
              { value: 'gym', label: 'Gym / Fitness Center' },
              { value: 'online', label: 'Online Only' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setBusinessInfo({ ...businessInfo, businessType: option.value as any })}
                className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                  businessInfo.businessType === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Website (optional)
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={businessInfo.website}
              onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone (optional)
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={businessInfo.phone}
              onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Coach Profile
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        This information will be visible to your clients
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={profileInfo.displayName}
            onChange={(e) => setProfileInfo({ ...profileInfo, displayName: e.target.value })}
            placeholder="Coach Mike"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <textarea
            value={profileInfo.bio}
            onChange={(e) => setProfileInfo({ ...profileInfo, bio: e.target.value })}
            placeholder="Tell your clients about yourself and your coaching philosophy..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((specialty) => (
              <button
                key={specialty}
                onClick={() => toggleSpecialty(specialty)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  profileInfo.specialties.includes(specialty)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Certifications
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              placeholder="e.g., NASM-CPT, CSCS"
              onKeyDown={(e) => e.key === 'Enter' && addCertification()}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addCertification}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Add
            </button>
          </div>
          {profileInfo.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profileInfo.certifications.map((cert, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm"
                >
                  {cert}
                  <button
                    onClick={() => removeCertification(index)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFeatures = () => (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Dashboard Features
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Here&apos;s what you can do with VoiceFit Coach
      </p>

      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Client Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add clients, view their profiles, track their progress, and manage their programs all in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Program Builder</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create, duplicate, and assign training programs. Use AI assistance to generate programs based on client goals.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Progress Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track client adherence, volume trends, PRs, and readiness scores with beautiful visualizations.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">In-App Messaging</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Send messages, share form feedback, and provide motivation directly through the app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderImport = () => (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Import Existing Clients
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Already have clients? Import them now or skip and add them later.
      </p>

      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => {
            // TODO: Open file picker
          }}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Drop a CSV file here or click to upload
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Supports CSV with columns: name, email, phone (optional)
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500">or</span>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="w-full py-3 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Skip for now, I&apos;ll add clients manually
        </button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center max-w-xl mx-auto">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        You&apos;re All Set!
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Your coaching dashboard is ready. Start adding clients and building programs.
      </p>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8 text-left">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Start Tips:</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">1.</span>
            Add your first client from the Clients page
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">2.</span>
            Create a training program in the Programs section
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">3.</span>
            Assign the program to your client
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">4.</span>
            Monitor their progress from the dashboard
          </li>
        </ul>
      </div>

      <button
        onClick={handleComplete}
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcome();
      case 'business':
        return renderBusiness();
      case 'profile':
        return renderProfile();
      case 'features':
        return renderFeatures();
      case 'import':
        return renderImport();
      case 'complete':
        return renderComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Progress bar */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="min-h-screen flex flex-col justify-center py-12 px-4">
        <div className="w-full max-w-3xl mx-auto">
          {renderStep()}

          {/* Navigation buttons */}
          {step !== 'welcome' && step !== 'complete' && (
            <div className="flex justify-between mt-8 max-w-xl mx-auto">
              <button
                onClick={handleBack}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
