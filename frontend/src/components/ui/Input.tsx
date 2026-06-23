import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 transition-colors',
        className,
      )}
      {...rest}
    />
  );
});
