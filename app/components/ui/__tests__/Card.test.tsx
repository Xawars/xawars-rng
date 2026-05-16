import { render } from '@testing-library/react';
import React from 'react';
import { Card } from '../Card';

describe('Card component', () => {
  it('renders children content', () => {
    const { getByText } = render(<Card>Card content</Card>);
    expect(getByText('Card content')).toBeInTheDocument();
  });

  it('applies base rounded-xl class', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
  });

  describe('variant styles', () => {
    it('applies default variant styles', () => {
      const { container } = render(<Card variant="default">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-zinc-900');
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-zinc-700');
      expect(card.className).toContain('shadow-md');
    });

    it('applies elevated variant styles', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-zinc-800');
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-zinc-700');
      expect(card.className).toContain('shadow-lg');
    });

    it('applies interactive variant styles with hover and transition', () => {
      const { container } = render(<Card variant="interactive">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-zinc-900');
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-zinc-700');
      expect(card.className).toContain('shadow-md');
      expect(card.className).toContain('hover:border-zinc-500');
      expect(card.className).toContain('transition-all');
      expect(card.className).toContain('duration-200');
      expect(card.className).toContain('cursor-pointer');
    });

    it('defaults to default variant when no variant is specified', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-zinc-900');
      expect(card.className).toContain('shadow-md');
    });
  });

  describe('padding styles', () => {
    it('applies sm padding (p-4)', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
    });

    it('applies md padding (p-5)', () => {
      const { container } = render(<Card padding="md">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-5');
    });

    it('applies lg padding (p-6)', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });

    it('defaults to md padding when no padding is specified', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-5');
    });
  });

  describe('className prop', () => {
    it('accepts and applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('preserves base styles when className is provided', () => {
      const { container } = render(<Card className="mt-4">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('bg-zinc-900');
      expect(card.className).toContain('mt-4');
    });
  });
});
