import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import BrandStrip, { BRAND_NOTICE, brands } from './BrandStrip.jsx';
import { BRAND_LOGOS } from './brandLogos.js';

const css = readFileSync(resolve(import.meta.dirname, '../../index.css'), 'utf8');
const strip = () => within(screen.getByRole('region', { name: 'Marcas disponibles' }));
const notice = (container) => container.querySelector('[data-brand-notice]');

describe('Franja de marcas: carrusel', () => {
  it('muestra las nueve marcas una sola vez para los lectores de pantalla', () => {
    render(<BrandStrip />);
    // La copia que cierra el bucle está oculta (aria-hidden): solo cuenta la primera lista
    expect(strip().getAllByRole('listitem')).toHaveLength(9);
    for (const name of ['AMD', 'Intel', 'NVIDIA', 'ASUS', 'MSI', 'Corsair']) {
      expect(strip().getByRole('img', { name })).toBeInTheDocument();
    }
  });

  it('las marcas sin logo se muestran con su nombre', () => {
    const { container } = render(<BrandStrip />);
    const visible = within(container.querySelector('.brand-track > ul'));
    for (const name of ['Gigabyte', 'Kingston', 'Seasonic']) {
      expect(visible.getByText(name)).toBeInTheDocument();
      expect(strip().queryByRole('img', { name })).not.toBeInTheDocument();
    }
    expect(brands.filter((name) => !BRAND_LOGOS[name])).toEqual([
      'Gigabyte',
      'Kingston',
      'Seasonic',
    ]);
  });

  it('repite la lista una vez para que el bucle no tenga saltos', () => {
    const { container } = render(<BrandStrip />);
    const lists = container.querySelectorAll('.brand-track > ul');
    expect(lists).toHaveLength(2);
    expect(lists[0]).not.toHaveAttribute('aria-hidden');
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true');
    expect(lists[1].children).toHaveLength(lists[0].children.length);
    expect(container.querySelector('.brand-track')).toHaveClass('animate-brand-scroll');
  });

  it('todos los logos son de una sola tinta, la del texto', () => {
    const { container } = render(<BrandStrip />);
    const logos = container.querySelectorAll('svg');
    expect(logos.length).toBe(Object.keys(BRAND_LOGOS).length * 2);
    for (const logo of logos) {
      expect(logo).toHaveAttribute('fill', 'currentColor');
      expect(logo.querySelectorAll('[fill], [stroke], [style]')).toHaveLength(0);
    }
  });

  it('cada logo trae su trazo y su recorte', () => {
    for (const [name, logo] of Object.entries(BRAND_LOGOS)) {
      expect(logo.path, name).toMatch(/^M/);
      expect(logo.viewBox.split(' '), name).toHaveLength(4);
    }
  });

  it('no tiene botones: no hay botón de pausa', () => {
    render(<BrandStrip />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Franja de marcas: aviso flotante', () => {
  it('no ocupa lugar: empieza oculto y no recibe el cursor', () => {
    const { container } = render(<BrandStrip />);
    expect(notice(container)).toHaveAttribute('data-visible', 'false');
    expect(notice(container)).toHaveAttribute('aria-hidden', 'true');
    expect(notice(container).className).toContain('pointer-events-none');
    expect(notice(container).className).toContain('absolute');
  });

  it('los lectores de pantalla lo reciben como descripción de la sección', () => {
    render(<BrandStrip />);
    expect(screen.getByRole('region', { name: 'Marcas disponibles' })).toHaveAccessibleDescription(
      BRAND_NOTICE,
    );
  });

  it('aparece tras dejar el cursor quieto un rato sobre la franja', async () => {
    const user = userEvent.setup();
    const { container } = render(<BrandStrip hoverDelay={60} />);
    await user.hover(screen.getByRole('region', { name: 'Marcas disponibles' }));
    expect(notice(container)).toHaveAttribute('data-visible', 'false');
    await waitFor(() => expect(notice(container)).toHaveAttribute('data-visible', 'true'));
    expect(within(notice(container)).getByText(BRAND_NOTICE)).toBeInTheDocument();
  });

  it('se oculta al sacar el cursor', async () => {
    const user = userEvent.setup();
    const { container } = render(<BrandStrip hoverDelay={30} />);
    const region = screen.getByRole('region', { name: 'Marcas disponibles' });
    await user.hover(region);
    await waitFor(() => expect(notice(container)).toHaveAttribute('data-visible', 'true'));
    await user.unhover(region);
    expect(notice(container)).toHaveAttribute('data-visible', 'false');
  });

  it('si el cursor pasa de largo, sin esperar, no aparece', async () => {
    const user = userEvent.setup();
    const { container } = render(<BrandStrip hoverDelay={250} />);
    const region = screen.getByRole('region', { name: 'Marcas disponibles' });
    await user.hover(region);
    await user.unhover(region);
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
    expect(notice(container)).toHaveAttribute('data-visible', 'false');
  });

  it('en pantallas táctiles, un toque lo muestra y otro lo oculta', async () => {
    const user = userEvent.setup();
    const { container } = render(<BrandStrip />);
    const region = screen.getByRole('region', { name: 'Marcas disponibles' });
    await user.pointer({ keys: '[TouchA]', target: region });
    expect(notice(container)).toHaveAttribute('data-visible', 'true');
    await user.pointer({ keys: '[TouchA]', target: region });
    expect(notice(container)).toHaveAttribute('data-visible', 'false');
  });
});

describe('Franja de marcas: movimiento reducido', () => {
  it('con movimiento reducido la pista no se anima y se acomoda en filas', () => {
    const { container } = render(<BrandStrip />);
    const track = container.querySelector('.brand-track');
    expect(track.className).toContain('motion-reduce:animate-none');
    expect(track.className).toContain('motion-reduce:flex-wrap');
    expect(container.querySelector('.brand-track > ul[aria-hidden]').className).toContain(
      'motion-reduce:hidden',
    );
    expect(notice(container).className).toContain('motion-reduce:transition-none');
  });

  it('se pausa al pasar el cursor', () => {
    const { container } = render(<BrandStrip />);
    expect(container.querySelector('.group').className).toContain(
      'hover:[&_.brand-track]:[animation-play-state:paused]',
    );
  });

  it('la animación está definida en el tema: movimiento de la pista al -50 %', () => {
    expect(css).toContain('--animate-brand-scroll: brand-scroll');
    expect(css).toMatch(/@keyframes brand-scroll[\s\S]*translateX\(-50%\)/);
  });
});
