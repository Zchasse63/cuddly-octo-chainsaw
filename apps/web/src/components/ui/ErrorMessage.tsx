import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { TRPCClientError } from '@trpc/client';

interface ErrorMessageProps {
  error: Error | string | { message: string };
  retry?: () => void;
}

function parseTRPCError(error: any): { message: string; fieldErrors?: Record<string, string[]> } {
  // Check if it's a TRPCClientError
  if (error && typeof error === 'object' && 'data' in error) {
    const code = error.data?.code;

    // Map common error codes to user-friendly messages
    const errorCodeMessages: Record<string, string> = {
      UNAUTHORIZED: 'Please log in to continue',
      NOT_FOUND: 'The requested item was not found',
      FORBIDDEN: 'You do not have permission to do this',
    };

    if (code && errorCodeMessages[code]) {
      return { message: errorCodeMessages[code] };
    }

    // For BAD_REQUEST, extract field-specific errors
    if (code === 'BAD_REQUEST' && error.data?.zodError?.fieldErrors) {
      return {
        message: 'Please check the following fields:',
        fieldErrors: error.data.zodError.fieldErrors,
      };
    }
  }

  // Fallback to generic message
  const message = typeof error === 'string' ? error : (error as { message: string }).message;
  return { message };
}

export function ErrorMessage({ error, retry }: ErrorMessageProps) {
  const { message, fieldErrors } = parseTRPCError(error);

  return (
    <div className="p-6 bg-accent-red/5 border border-accent-red/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-accent-red">Error</h3>
          <p className="text-sm text-accent-red/80 mt-1">{message}</p>

          {fieldErrors && (
            <ul className="mt-2 ml-4 list-disc text-sm text-accent-red/80">
              {Object.entries(fieldErrors).map(([field, errors]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {errors.join(', ')}
                </li>
              ))}
            </ul>
          )}

          {retry && (
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="mt-3 border-accent-red text-accent-red hover:bg-accent-red/10"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
