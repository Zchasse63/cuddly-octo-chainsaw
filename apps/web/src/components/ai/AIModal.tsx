import { X, Loader } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AIModalStep {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: AIModalStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AIModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSubmit,
  isLoading = false,
  submitLabel = 'Generate with AI',
}: AIModalProps) {
  if (!isOpen) return null;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <FocusTrap
      active={isOpen}
      focusTrapOptions={{
        escapeDeactivates: true,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: true,
        allowOutsideClick: true,
      }}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card variant="elevated" padding="none" className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-background-tertiary">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-background-tertiary">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`flex-1 h-1.5 rounded-full ${
                    i <= currentStep ? 'bg-accent-purple' : 'bg-background-tertiary'
                  }`}
                />
                {i < steps.length - 1 && <div className="w-2" />}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-text-secondary">
            Step {currentStep + 1} of {steps.length}: {step.title}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step.component}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-background-tertiary">
          <Button
            variant="ghost"
            onClick={isFirstStep ? onClose : onPrevious}
            disabled={isLoading}
          >
            {isFirstStep ? 'Cancel' : 'Previous'}
          </Button>

          {isLastStep ? (
            <Button onClick={onSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          ) : (
            <Button onClick={onNext} disabled={isLoading}>
              Next
            </Button>
          )}
        </div>
        </Card>
      </div>
    </FocusTrap>
  );
}
