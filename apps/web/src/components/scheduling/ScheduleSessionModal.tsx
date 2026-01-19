'use client';

import { useState } from 'react';
import { X, Loader, Calendar, Clock } from 'lucide-react';
import FocusTrap from 'focus-trap-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScheduleSessionModal({ isOpen, onClose, onSuccess }: ScheduleSessionModalProps) {
  const [clientId, setClientId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [sessionType, setSessionType] = useState<'check-in' | 'workout-review' | 'planning' | 'other'>('check-in');
  const [notes, setNotes] = useState('');

  const { showToast } = useToast();
  const utils = trpc.useUtils();

  const { data: clientsData, isLoading: isLoadingClients } = trpc.coachDashboard.getClientList.useQuery({
    status: 'active',
    limit: 100,
  });

  const scheduleSessionMutation = trpc.coachDashboard.scheduleSession.useMutation({
    onSuccess: () => {
      showToast('Session scheduled successfully', 'success');
      utils.coachDashboard.getDashboardSummary.invalidate();
      utils.coachDashboard.getUpcomingSessions.invalidate();
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      showToast(error.message || 'Failed to schedule session', 'error');
    },
  });

  const resetForm = () => {
    setClientId('');
    setScheduledAt('');
    setDurationMinutes(60);
    setSessionType('check-in');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId || !scheduledAt) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    scheduleSessionMutation.mutate({
      clientId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes,
      sessionType,
      notes: notes || undefined,
    });
  };

  if (!isOpen) return null;

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <Card variant="elevated" padding="none" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background-primary p-6 border-b border-background-tertiary flex items-center justify-between">
          <h2 className="text-xl font-bold">Schedule New Session</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Client *
            </label>
            {isLoadingClients ? (
              <div className="h-10 bg-background-tertiary rounded animate-pulse" />
            ) : (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
              >
                <option value="">Select a client</option>
                {clientsData?.clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as any)}
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="check-in">Check-in</option>
              <option value="workout-review">Workout Review</option>
              <option value="planning">Planning</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this session..."
              className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={scheduleSessionMutation.isPending}
              className="flex-1"
            >
              {scheduleSessionMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Session'
              )}
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </FocusTrap>
  );
}
