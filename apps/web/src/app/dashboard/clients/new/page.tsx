'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Target,
  Dumbbell,
  Upload,
  Check,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';

type Step = 'info' | 'goals' | 'program' | 'review';

const GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Increase Strength',
  'Improve Endurance',
  'General Fitness',
  'Sports Performance',
  'Flexibility',
  'Injury Recovery',
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Less than 1 year training' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years training' },
  { id: 'advanced', label: 'Advanced', description: '3+ years training' },
];

const PROGRAMS = [
  { id: 'strength', name: 'Strength Builder', duration: '12 weeks', sessions: 4 },
  { id: 'hypertrophy', name: 'Hypertrophy Focus', duration: '8 weeks', sessions: 5 },
  { id: 'transformation', name: '12-Week Transformation', duration: '12 weeks', sessions: 5 },
  { id: 'marathon', name: 'Marathon Prep', duration: '16 weeks', sessions: 5 },
  { id: 'hybrid', name: 'Hybrid Athlete', duration: '10 weeks', sessions: 6 },
  { id: 'custom', name: 'Custom Program', duration: 'Variable', sessions: 'TBD' },
];

export default function NewClientPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const utils = trpc.useUtils();
  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    goals: [] as string[],
    experienceLevel: '',
    programId: '',
    notes: '',
  });

  const inviteClientMutation = trpc.coachDashboard.inviteClient.useMutation({
    onMutate: async (newClient) => {
      // Cancel outgoing refetches
      await utils.coachDashboard.getClientList.cancel();

      // Snapshot previous value
      const previousClients = utils.coachDashboard.getClientList.getData();

      // Optimistically update cache with proper structure
      utils.coachDashboard.getClientList.setData({ status: 'all', search: '', limit: 20, offset: 0 }, (old: any) => {
        if (!old) return old;

        const tempClient = {
          relationshipId: `temp-rel-${Date.now()}`,
          clientId: `temp-${Date.now()}`,
          status: 'pending' as const,
          assignedAt: new Date(),
          acceptedAt: null,
          name: newClient.name,
          experienceLevel: 'beginner' as const,
          tier: 'free' as const,
        };

        return {
          ...old,
          clients: [tempClient, ...old.clients],
          totalCount: old.totalCount + 1,
        };
      });

      return { previousClients };
    },
    onSuccess: (data) => {
      const email = inviteEmail || formData.email;
      setSuccessMessage(`Invitation sent successfully to ${email}!`);
      showToast('Client invitation sent!', 'success');
      setInviteEmail('');
      setInviteName('');
      setInviteMessage('');
      setShowInviteForm(false);

      // Redirect to clients page after brief delay
      setTimeout(() => {
        router.push('/dashboard/clients');
      }, 1500);
    },
    onError: (error: any, newClient: any, context: any) => {
      // Rollback on error
      if (context?.previousClients) {
        utils.coachDashboard.getClientList.setData({ status: 'all', search: '', limit: 20, offset: 0 }, context.previousClients);
      }

      setErrorMessage(error.message || 'Failed to send invitation. Please try again.');
      showToast('Failed to send invitation', 'error');
      setTimeout(() => setErrorMessage(''), 5000);
    },
    onSettled: () => {
      // Sync with server state
      utils.coachDashboard.getClientList.invalidate();
    },
  });

  const steps: Step[] = ['info', 'goals', 'program', 'review'];
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleSubmit = async () => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const message = formData.notes || undefined;

    inviteClientMutation.mutate({
      email: formData.email,
      name: fullName,
      message: message,
    });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail || !inviteName) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    inviteClientMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      message: inviteMessage || undefined,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return formData.firstName && formData.lastName && formData.email;
      case 'goals':
        return formData.goals.length > 0 && formData.experienceLevel;
      case 'program':
        return formData.programId;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={goBack}
          className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Add New Client</h1>
          <p className="text-text-secondary">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-blue transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Quick Invite Form */}
      <Card variant="elevated" padding="lg" className="bg-background-secondary/50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Direct Invite
              </h3>
              <p className="text-sm text-text-secondary">
                Invite a client directly via email without going through the full onboarding
              </p>
            </div>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              {showInviteForm ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showInviteForm && (
            <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4 border-t border-background-tertiary">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    disabled={inviteClientMutation.isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="john@example.com"
                    disabled={inviteClientMutation.isPending}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message (optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to include with the invitation..."
                  rows={2}
                  disabled={inviteClientMutation.isPending}
                  className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                    setInviteName('');
                    setInviteMessage('');
                  }}
                  disabled={inviteClientMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  disabled={inviteClientMutation.isPending || !inviteEmail || !inviteName}
                  className="flex items-center gap-2"
                >
                  {inviteClientMutation.isPending && (
                    <Loader className="w-4 h-4 animate-spin" />
                  )}
                  {inviteClientMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Step Content */}
      <Card variant="elevated" padding="lg">
        {currentStep === 'info' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
              <p className="text-text-secondary">Enter your client&apos;s contact details</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'goals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Goals & Experience</h2>
              <p className="text-text-secondary">What does your client want to achieve?</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Primary Goals *</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => {
                  const isSelected = formData.goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-accent-blue text-white'
                          : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
                      }`}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Experience Level *</label>
              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map((level) => {
                  const isSelected = formData.experienceLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => setFormData({ ...formData, experienceLevel: level.id })}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-accent-blue/10 border-2 border-accent-blue'
                          : 'bg-background-secondary border-2 border-transparent hover:bg-background-tertiary'
                      }`}
                    >
                      <p className="font-medium">{level.label}</p>
                      <p className="text-sm text-text-secondary">{level.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentStep === 'program' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Assign Program</h2>
              <p className="text-text-secondary">Choose a training program for your client</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {PROGRAMS.map((program) => {
                const isSelected = formData.programId === program.id;
                return (
                  <button
                    key={program.id}
                    onClick={() => setFormData({ ...formData, programId: program.id })}
                    className={`p-4 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-accent-blue/10 border-2 border-accent-blue'
                        : 'bg-background-secondary border-2 border-transparent hover:bg-background-tertiary'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-blue' : 'bg-background-tertiary'}`}>
                          <Dumbbell className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-text-secondary'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-sm text-text-secondary">
                            {program.duration} • {program.sessions} sessions/week
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-accent-blue" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this client..."
                rows={3}
                className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
              />
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Review & Confirm</h2>
              <p className="text-text-secondary">Verify the client information before creating</p>
            </div>

            <div className="space-y-4">
              <ReviewSection title="Basic Information">
                <ReviewItem label="Name" value={`${formData.firstName} ${formData.lastName}`} />
                <ReviewItem label="Email" value={formData.email} />
                {formData.phone && <ReviewItem label="Phone" value={formData.phone} />}
              </ReviewSection>

              <ReviewSection title="Goals & Experience">
                <ReviewItem label="Goals" value={formData.goals.join(', ')} />
                <ReviewItem
                  label="Experience"
                  value={EXPERIENCE_LEVELS.find((l) => l.id === formData.experienceLevel)?.label || ''}
                />
              </ReviewSection>

              <ReviewSection title="Program">
                <ReviewItem
                  label="Assigned Program"
                  value={PROGRAMS.find((p) => p.id === formData.programId)?.name || ''}
                />
                {formData.notes && <ReviewItem label="Notes" value={formData.notes} />}
              </ReviewSection>
            </div>

            <div className="p-4 bg-accent-blue/10 rounded-xl">
              <p className="text-sm text-accent-blue">
                An invitation email will be sent to {formData.email} with instructions to set up their account.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          {currentIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        {currentStep === 'review' ? (
          <Button onClick={handleSubmit}>
            Create Client & Send Invite
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed()}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-background-secondary rounded-xl">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
