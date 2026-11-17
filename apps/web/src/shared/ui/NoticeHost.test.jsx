import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { dismissNotice, notify } from '../notices.js';
import { renderWithProviders } from '../../test/utils.jsx';
import Icon from './Icon.jsx';
import NoticeHost from './NoticeHost.jsx';

describe('NoticeHost', () => {
  it('no muestra nada mientras no haya aviso', () => {
    renderWithProviders(<NoticeHost />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra el aviso y se cierra con el botón', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoticeHost />);
    act(() => notify({ message: 'Todo listo.' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Todo listo.');
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un aviso nuevo reemplaza al anterior', () => {
    renderWithProviders(<NoticeHost />);
    act(() => notify({ message: 'Primero' }));
    act(() => notify({ message: 'Segundo', tone: 'error' }));
    expect(screen.getByRole('status')).toHaveTextContent('Segundo');
    expect(screen.queryByText('Primero')).not.toBeInTheDocument();
  });

  it('la acción con onClick la ejecuta y cierra el aviso', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<NoticeHost />);
    act(() => notify({ message: 'Quitado', action: { label: 'Deshacer', onClick } }));
    await user.click(await screen.findByRole('button', { name: 'Deshacer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('la acción con "to" es un enlace y cierra el aviso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoticeHost />);
    act(() => notify({ message: 'Guardado', action: { label: 'Ver lista', to: '/lista' } }));
    const link = await screen.findByRole('link', { name: 'Ver lista' });
    expect(link).toHaveAttribute('href', '/lista');
    await user.click(link);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismissNotice sin aviso no hace nada', () => {
    expect(() => dismissNotice()).not.toThrow();
  });
});

describe('Icon', () => {
  it('con filled usa la versión rellena del icono', () => {
    const { container } = renderWithProviders(
      <>
        <Icon name="favorite" filled />
        <Icon name="favorite" />
      </>,
    );
    const [filled, outline] = container.querySelectorAll('.material-symbols-outlined');
    expect(filled.style.fontVariationSettings).toContain('FILL');
    expect(outline.style.fontVariationSettings).toBe('');
  });
});
