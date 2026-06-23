import { AlertTriangle } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from './ui/Button';

interface Props {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export function ErrorState({ error, title = 'No se pudo cargar', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="text-danger mb-3">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{messageFor(error)}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
