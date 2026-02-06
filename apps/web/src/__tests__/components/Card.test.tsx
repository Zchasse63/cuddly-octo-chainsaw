import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '@/components/ui/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default variant correctly', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-background-primary', 'card-shadow');
  });

  it('applies bordered variant correctly', () => {
    render(
      <Card variant="bordered" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border', 'border-background-tertiary');
  });

  it('applies elevated variant correctly', () => {
    render(
      <Card variant="elevated" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('card-shadow', 'card-shadow-hover');
  });

  it('applies no padding when padding="none"', () => {
    render(
      <Card padding="none" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).not.toHaveClass('p-4', 'p-6', 'p-8');
  });

  it('applies sm padding correctly', () => {
    render(
      <Card padding="sm" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-4');
  });

  it('applies md padding by default', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
  });

  it('applies lg padding correctly', () => {
    render(
      <Card padding="lg" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-8');
  });

  it('applies base styles', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-2xl', 'transition-all');
  });

  it('accepts additional className', () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through additional props', () => {
    render(
      <Card data-testid="card" aria-label="Test card">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('aria-label', 'Test card');
  });
});
