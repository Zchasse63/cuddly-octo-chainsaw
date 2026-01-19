import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '@/components/ui/Input';

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Input placeholder="No label" />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('renders hint text when provided', () => {
    render(<Input hint="This is a hint" />);
    expect(screen.getByText('This is a hint')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows error instead of hint when both are provided', () => {
    render(<Input hint="Helpful hint" error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
  });

  it('applies error styling when error is provided', () => {
    render(<Input error="Error" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-accent-red');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('accepts controlled value', () => {
    render(<Input value="controlled" onChange={() => {}} placeholder="Input" />);
    expect(screen.getByPlaceholderText('Input')).toHaveValue('controlled');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts additional className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-class');
  });

  it('passes through type prop', () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
      'type',
      'password'
    );
  });

  it('passes through disabled prop', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('passes through required prop', () => {
    render(<Input required placeholder="Required" />);
    expect(screen.getByPlaceholderText('Required')).toBeRequired();
  });

  it('applies base styling classes', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('w-full', 'px-4', 'py-3', 'rounded-xl');
  });

  it('applies focus ring styling', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('focus:ring-2');
  });

  it('renders label with correct styling', () => {
    render(<Input label="Username" />);
    const label = screen.getByText('Username');
    expect(label).toHaveClass('text-sm', 'font-medium', 'mb-2');
  });

  it('renders error message with correct styling', () => {
    render(<Input error="Error text" />);
    const error = screen.getByText('Error text');
    expect(error).toHaveClass('text-sm', 'text-accent-red');
  });

  it('renders hint with correct styling', () => {
    render(<Input hint="Hint text" />);
    const hint = screen.getByText('Hint text');
    expect(hint).toHaveClass('text-sm', 'text-text-secondary');
  });
});
