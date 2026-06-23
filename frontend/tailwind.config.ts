import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        border: 'hsl(var(--border))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        card: '0 4px 16px -4px rgba(15, 23, 42, 0.08)',
      },
      // Sistema de movimiento: rápido + curva de desaceleración (se siente "eléctrico").
      // Todas las utilidades transition-* heredan estos valores por defecto.
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '110ms',
      },
      transitionTimingFunction: {
        // easeOutQuint: arranque rápido, frenado suave → sensación instantánea.
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Calendario: navegación entre semanas (deslizamiento direccional) y entrada de citas.
        'cal-slide-left': {
          from: { opacity: '0', transform: 'translateX(22px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'cal-slide-right': {
          from: { opacity: '0', transform: 'translateX(-22px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'cal-fade': {
          from: { opacity: '0', transform: 'scale(0.99)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'event-pop': {
          from: { opacity: '0', transform: 'scale(0.94) translateY(3px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'now-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.6)', opacity: '0.45' },
        },
      },
      animation: {
        'overlay-in': 'overlay-in 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'overlay-out': 'overlay-out 120ms ease-in forwards',
        'modal-in': 'modal-in 190ms cubic-bezier(0.22, 1, 0.36, 1)',
        'modal-out': 'modal-out 140ms ease-in forwards',
        'page-in': 'page-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 150ms ease-out',
        shimmer: 'shimmer 1.4s infinite',
        'cal-slide-left': 'cal-slide-left 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'cal-slide-right': 'cal-slide-right 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'cal-fade': 'cal-fade 170ms ease-out',
        'event-pop': 'event-pop 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'now-pulse': 'now-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
