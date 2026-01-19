import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<HomePage />);
    expect(document.body).toBeInTheDocument();
  });
});
