'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  const [currentStep, setCurrentStep] = useState<Step>('info');
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
    // TODO: Submit to API
    console.log('Submitting:', formData);
    router.push('/dashboard/clients');
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

      {/* Step Content */}
      <Card variant="elevated" padding="lg">
        {currentStep === 'info' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
              <p className="text-text-secondary">Enter your client's contact details</p>
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
