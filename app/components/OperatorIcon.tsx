'use client';

import r6operators from 'r6operators';
import { useMemo } from 'react';

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

  if (typeof html !== 'string') return <>{children}</>;

  // Render the SVG string.
  return <div dangerouslySetInnerHTML={{ __html: html }} style={{ display: 'contents' }} />;
}
