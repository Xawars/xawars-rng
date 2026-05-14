'use client';

import r6operators from 'r6operators';
import { useMemo } from 'react';

// Custom icon mappings for guest operators not in the r6operators package
const customIcons: Record<string, string> = {
  snake: '/ops/snake_logo.png',
};

interface OperatorIconProps {
  id: string;
  className?: string;
  children?: React.ReactNode;
}

export function OperatorIcon({ id, className, children }: OperatorIconProps) {
  const html = useMemo(() => {
    // Cast to any to access by string index easily, or use keyof typeof r6operators if strict
    const op = (r6operators as any)[id];
    if (!op || typeof op.toSVG !== 'function') return null;
    
    // Pass className to toSVG so it's applied to the SVG element
    return op.toSVG({ class: className });
  }, [id, className]);

  // If r6operators has the icon, render the SVG
  if (typeof html === 'string') {
    return <div dangerouslySetInnerHTML={{ __html: html }} style={{ display: 'contents' }} />;
  }

  // Fall back to custom icon for guest operators
  if (customIcons[id]) {
    return <img src={customIcons[id]} alt={id} className={className} />;
  }

  return <>{children}</>;
}
