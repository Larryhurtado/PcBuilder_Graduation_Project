import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Dialog from './Dialog.jsx';

const content = (
  <>
    <h2 id="titulo">Selector</h2>
    <button type="button">Dentro</button>
  </>
);

describe('Dialog', () => {
  it('cerrado no muestra su contenido', () => {
    render(
      <Dialog open={false} onClose={() => {}} labelledBy="titulo">
        {content}
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Dentro')).not.toBeInTheDocument();
  });

  it('abierto es un diálogo con nombre accesible', () => {
    render(
      <Dialog open onClose={() => {}} labelledBy="titulo">
        {content}
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Selector' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dentro' })).toBeInTheDocument();
  });

  it('bloquea el desplazamiento del fondo mientras está abierto y lo restaura al cerrar', () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} labelledBy="titulo">
        {content}
      </Dialog>,
    );
    expect(document.documentElement.style.overflow).toBe('hidden');
    rerender(
      <Dialog open={false} onClose={() => {}} labelledBy="titulo">
        {content}
      </Dialog>,
    );
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('un clic fuera del panel lo cierra, pero uno dentro no', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} labelledBy="titulo">
        {content}
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dentro' }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
