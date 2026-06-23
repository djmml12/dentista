import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-muted text-foreground hover:bg-muted/70',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        // transition-[transform,...] mantiene la animación en el compositor (60FPS).
        // active:scale da el "click" táctil; el press se siente instantáneo.
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-[transform,background-color,box-shadow,color] duration-fast',
        'active:scale-[0.97] motion-reduce:active:scale-100',
        'disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
});
