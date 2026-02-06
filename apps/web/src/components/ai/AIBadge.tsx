import { Sparkles } from 'lucide-react';

interface AIBadgeProps {
  variant: 'suggested' | 'generating' | 'analyzed';
  className?: string;
}

export function AIBadge({ variant, className = '' }: AIBadgeProps) {
  const variants = {
    suggested: {
      bg: 'bg-accent-purple/10',
      text: 'text-accent-purple',
      label: 'AI Suggested',
    },
    generating: {
      bg: 'bg-accent-blue/10',
      text: 'text-accent-blue',
      label: 'Generating...',
    },
    analyzed: {
      bg: 'bg-accent-green/10',
      text: 'text-accent-green',
      label: 'AI Analyzed',
    },
  };

  const { bg, text, label } = variants[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${bg} ${text} ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      {label}
    </span>
  );
}
