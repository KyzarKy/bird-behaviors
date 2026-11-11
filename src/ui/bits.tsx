/**
 * The two pieces this app needs that @kyzarky/ui does not have yet: a navigation row and a
 * tag. Both are built from the design system's tokens, so they follow its light and dark
 * themes. If a second app needs them, they move into the package.
 */
import type { ComponentProps, ReactNode } from 'react';

/** One row of a navigation list. Taller on touch screens, where it has to be hit with a thumb. */
export function NavLink({ current, className = '', ...props }: ComponentProps<'a'> & { current?: boolean }) {
  return (
    <a
      aria-current={current ? 'page' : undefined}
      className={`flex min-h-9 items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 pointer-coarse:min-h-11 ${
        current ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-muted'
      } ${className}`}
      {...props}
    />
  );
}

const TONES = { primary: 'bg-primary/15 text-primary', warning: 'bg-warning/15 text-warning' };

export function Tag({ tone = 'primary', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 font-medium text-xs ${TONES[tone]}`}>{children}</span>;
}
