'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Save, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { AIModal } from '@/components/ai/AIModal';
import { useToast } from '@/hooks/useToast';

type ProgramType = 'strength' | 'running' | 'hybrid' | 'crossfit' | 'custom';

interface FormErrors {
  name?: string;
  description?: string;
  programType?: string;
  durationWeeks?: string;
  daysPerWeek?: string;
}

export default function NewProgramPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    programType: 'strength' as ProgramType,
    durationWeeks: 4,
    daysPerWeek: 3,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalStep, setAIModalStep] = useState(0);
  const [aiFormData, setAIFormData] = useState({
    clientGoals: [] as string[],
    fitnessLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    equipment: [] as string[],
    sessionsPerWeek: 3,
    minutesPerSession: 60,
  });

  const createMutation = trpc.coachDashboard.createProgramTemplate.useMutation({
    onSuccess: (data) => {
      showToast('Program created', 'success');
      router.push('/dashboard/programs');
    },
    onError: (error) => {
      setSubmitError(error.message || 'Failed to create program template');
      showToast('Failed to create program', 'error');
    },
  });

  const aiGenerateMutation = trpc.coachDashboard.generateProgramWithAI.useMutation({
    onSuccess: (result) => {
      setFormData({
        name: result.program.name,
        description: result.program.description,
        programType: result.program.programType,
        durationWeeks: result.program.durationWeeks,
        daysPerWeek: result.program.daysPerWeek,
      });
      setShowAIModal(false);
      setAIModalStep(0);
    },
  });

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Program name is required';
    }

    if (formData.durationWeeks < 1) {
      errors.durationWeeks = 'Duration must be at least 1 week';
    }

    if (formData.daysPerWeek < 1 || formData.daysPerWeek > 7) {
      errors.daysPerWeek = 'Days per week must be between 1 and 7';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitError(null);
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      programType: formData.programType,
      durationWeeks: formData.durationWeeks,
      daysPerWeek: formData.daysPerWeek,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleAIGenerate = async () => {
    await aiGenerateMutation.mutateAsync({
      clientGoals: aiFormData.clientGoals,
      fitnessLevel: aiFormData.fitnessLevel,
      equipment: aiFormData.equipment,
      timeConstraints: {
        sessionsPerWeek: aiFormData.sessionsPerWeek,
        minutesPerSession: aiFormData.minutesPerSession,
      },
    });
  };

  const toggleGoal = (goal: string) => {
    setAIFormData((prev) => ({
      ...prev,
      clientGoals: prev.clientGoals.includes(goal)
        ? prev.clientGoals.filter((g) => g !== goal)
        : [...prev.clientGoals, goal],
    }));
  };

  const toggleEquipment = (item: string) => {
    setAIFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  };

  const aiModalSteps = [
    {
      id: 'goals',
      title: 'Client Goals',
      component: (
        <div className="space-y-4">
          <p className="text-text-secondary mb-4">Select the primary goals for this program:</p>
          <div className="grid grid-cols-2 gap-3">
            {['strength', 'muscle building', 'endurance', 'weight loss', 'athletic performance', 'general fitness'].map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                className={`p-4 rounded-lg border-2 transition-all text-left capitalize ${
                  aiFormData.clientGoals.includes(goal)
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-background-tertiary hover:border-background-tertiary/80'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'fitness-level',
      title: 'Fitness Level',
      component: (
        <div className="space-y-4">
          <p className="text-text-secondary mb-4">What is the client&apos;s fitness level?</p>
          <div className="space-y-3">
            {[
              { value: 'beginner', label: 'Beginner', description: 'New to structured training' },
              { value: 'intermediate', label: 'Intermediate', description: '6+ months of consistent training' },
              { value: 'advanced', label: 'Advanced', description: '2+ years of structured training' },
            ].map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setAIFormData((prev) => ({ ...prev, fitnessLevel: level.value as any }))}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  aiFormData.fitnessLevel === level.value
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-background-tertiary hover:border-background-tertiary/80'
                }`}
              >
                <div className="font-medium">{level.label}</div>
                <div className="text-sm text-text-secondary mt-1">{level.description}</div>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'equipment',
      title: 'Available Equipment',
      component: (
        <div className="space-y-4">
          <p className="text-text-secondary mb-4">Select all available equipment:</p>
          <div className="grid grid-cols-2 gap-3">
            {['barbell', 'dumbbells', 'kettlebells', 'bands', 'bodyweight', 'bench', 'rack', 'pull-up bar'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={`p-4 rounded-lg border-2 transition-all text-left capitalize ${
                  aiFormData.equipment.includes(item)
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-background-tertiary hover:border-background-tertiary/80'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'time',
      title: 'Time Constraints',
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Sessions per week</label>
            <Input
              type="number"
              min="1"
              max="7"
              value={aiFormData.sessionsPerWeek}
              onChange={(e) =>
                setAIFormData((prev) => ({ ...prev, sessionsPerWeek: parseInt(e.target.value) || 1 }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minutes per session</label>
            <Input
              type="number"
              min="15"
              max="180"
              step="15"
              value={aiFormData.minutesPerSession}
              onChange={(e) =>
                setAIFormData((prev) => ({ ...prev, minutesPerSession: parseInt(e.target.value) || 30 }))
              }
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Create Program Template</h1>
            <p className="text-text-secondary">Create a new training program template</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAIModal(true)}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </div>

      {/* Form */}
      <Card variant="bordered" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {submitError && (
            <div className="p-4 bg-accent-red/10 border border-accent-red rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-accent-red">Error</p>
                <p className="text-sm text-text-secondary mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {/* Program Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Program Name <span className="text-accent-red">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., 12-Week Strength Builder"
              className={formErrors.name ? 'border-accent-red' : ''}
            />
            {formErrors.name && (
              <p className="text-sm text-accent-red mt-1">{formErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the program goals and structure..."
              rows={3}
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
            />
          </div>

          {/* Program Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Program Type <span className="text-accent-red">*</span>
            </label>
            <select
              value={formData.programType}
              onChange={(e) => handleInputChange('programType', e.target.value as ProgramType)}
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="strength">Strength</option>
              <option value="running">Running</option>
              <option value="hybrid">Hybrid</option>
              <option value="crossfit">CrossFit</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Duration and Days Per Week */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (weeks) <span className="text-accent-red">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="52"
                value={formData.durationWeeks}
                onChange={(e) => handleInputChange('durationWeeks', parseInt(e.target.value) || 1)}
                className={formErrors.durationWeeks ? 'border-accent-red' : ''}
              />
              {formErrors.durationWeeks && (
                <p className="text-sm text-accent-red mt-1">{formErrors.durationWeeks}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Days per week <span className="text-accent-red">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="7"
                value={formData.daysPerWeek}
                onChange={(e) => handleInputChange('daysPerWeek', parseInt(e.target.value) || 1)}
                className={formErrors.daysPerWeek ? 'border-accent-red' : ''}
              />
              {formErrors.daysPerWeek && (
                <p className="text-sm text-accent-red mt-1">{formErrors.daysPerWeek}</p>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
            >
              {createMutation.isPending && (
                <Loader className="w-4 h-4 animate-spin" />
              )}
              <Save className="w-4 h-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Card>

      {/* AI Modal */}
      <AIModal
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAIModalStep(0);
        }}
        title="Generate Program with AI"
        steps={aiModalSteps}
        currentStep={aiModalStep}
        onNext={() => setAIModalStep((prev) => Math.min(prev + 1, aiModalSteps.length - 1))}
        onPrevious={() => setAIModalStep((prev) => Math.max(prev - 1, 0))}
        onSubmit={handleAIGenerate}
        isLoading={aiGenerateMutation.isPending}
        submitLabel="Generate Program"
      />
    </div>
  );
}
