import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 active:shadow-none',
        secondary:
          'bg-stone-100 text-stone-900 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
        outline:
          'border border-stone-200 bg-transparent text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800/60',
        ghost:
          'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60',
        danger:
          'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 active:shadow-none',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 active:shadow-none',
        link: 'text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400 p-0 h-auto font-normal',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-12 px-6 text-base rounded-2xl',
        icon: 'h-10 w-10 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps & HTMLMotionProps<'button'>
>(({ className, variant, size, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: props.disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(props as HTMLMotionProps<'button'>)}
    />
  );
});
Button.displayName = 'Button';
