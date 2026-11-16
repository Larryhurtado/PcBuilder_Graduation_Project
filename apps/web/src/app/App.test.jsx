import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('muestra el título del proyecto', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Agregador y Validador de Hardware' }),
    ).toBeInTheDocument();
  });
});
