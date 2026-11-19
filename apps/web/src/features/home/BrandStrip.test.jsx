import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BrandStrip, { brands } from './BrandStrip.jsx';
import { BRAND_LOGOS } from './brandLogos.js';

const css = readFileSync(resolve(import.meta.dirname, '../../index.css'), 'utf8');
const strip = () => within(screen.getByRole('region', { name: 'Marcas disponibles' }));

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
    const withoutLogo = brands.filter((name) => !BRAND_LOGOS[name]);
    expect(withoutLogo).toEqual(['Gigabyte', 'Kingston', 'Seasonic']);
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

  it('aclara que las marcas no indican respaldo ni alianza, debajo de la franja', () => {
    render(<BrandStrip />);
    expect(
      screen.getByText(
        'Marcas de fabricantes presentes en el catálogo. No indican respaldo ni alianza.',
      ),
    ).toBeInTheDocument();
  });
});

describe('Franja de marcas: movimiento reducido y pausa', () => {
  it('con movimiento reducido la pista no se anima y se acomoda en filas', () => {
    const { container } = render(<BrandStrip />);
    const track = container.querySelector('.brand-track');
    expect(track.className).toContain('motion-reduce:animate-none');
    expect(track.className).toContain('motion-reduce:flex-wrap');
    expect(container.querySelector('.brand-track > ul[aria-hidden]').className).toContain(
      'motion-reduce:hidden',
    );
  });

  it('no tiene botón de pausa: la pausa es solo con el cursor o el foco', () => {
    render(<BrandStrip />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('la pausa al pasar el cursor y al enfocar está definida en la franja', () => {
    const { container } = render(<BrandStrip />);
    const wrapper = container.querySelector('.group');
    expect(wrapper.className).toContain('hover:[&_.brand-track]:[animation-play-state:paused]');
    expect(wrapper.className).toContain(
      'focus-within:[&_.brand-track]:[animation-play-state:paused]',
    );
  });

  it('la animación está definida en el tema: movimiento de la pista al -50 %', () => {
    expect(css).toContain('--animate-brand-scroll: brand-scroll');
    expect(css).toMatch(/@keyframes brand-scroll[\s\S]*translateX\(-50%\)/);
  });
});
