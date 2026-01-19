import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-background-tertiary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-tertiary" />
      </div>
      <p className="text-text-secondary mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
