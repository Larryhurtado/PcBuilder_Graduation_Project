import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { offers } from '../../mocks/data.js';
import { renderWithProviders } from '../../test/utils.jsx';
import OfferCard from './OfferCard.jsx';

const [ryzen, , usedRam] = offers;

afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.sendBeacon;
});

describe('OfferCard', () => {
  it('muestra nombre, datos técnicos, tienda y precio en COP', () => {
    renderWithProviders(<OfferCard offer={ryzen} />);
    expect(screen.getByRole('heading', { name: 'AMD Ryzen 5 7600' })).toBeInTheDocument();
    expect(screen.getByText('AM5 • 3.8/5.1 GHz • 6 núcleos')).toBeInTheDocument();
    expect(screen.getByText('TecnoPasarela Cali • Cali (C.C. Pasarela)')).toBeInTheDocument();
    expect(screen.getByText('$ 849.000 COP')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('lleva a la ficha técnica del componente', () => {
    renderWithProviders(<OfferCard offer={ryzen} />);
    expect(screen.getByRole('link', { name: 'AMD Ryzen 5 7600' })).toHaveAttribute(
      'href',
      `/producto/${ryzen.component.id}`,
    );
  });

  it('distingue la condición usada', () => {
    renderWithProviders(<OfferCard offer={usedRam} />);
    expect(screen.getByText('Usado')).toBeInTheDocument();
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('sin foto muestra el icono de la categoría; con foto, la imagen', () => {
    const { container, unmount } = renderWithProviders(<OfferCard offer={ryzen} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    unmount();

    const withPhoto = { ...ryzen, coverImageUrl: 'https://example.test/cpu.png' };
    const view = renderWithProviders(<OfferCard offer={withPhoto} />);
    expect(view.container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.test/cpu.png',
    );
  });

  it('el botón de WhatsApp abre el chat de la tienda con el producto y el precio', () => {
    renderWithProviders(<OfferCard offer={ryzen} />);
    const link = screen.getByRole('link', { name: 'Contactar por WhatsApp' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));

    const url = new URL(link.getAttribute('href'));
    expect(url.pathname).toBe('/573000000001');
    expect(url.searchParams.get('text')).toContain('AMD Ryzen 5 7600 a 849.000 COP');
  });

  it('registra el clic a WhatsApp con sendBeacon', async () => {
    navigator.sendBeacon = vi.fn(() => true);
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });
    renderWithProviders(<OfferCard offer={ryzen} />);

    await userEvent.click(screen.getByRole('link', { name: 'Contactar por WhatsApp' }));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = navigator.sendBeacon.mock.calls[0];
    expect(url).toBe('/api/v1/events');
    expect(JSON.parse(await body.text())).toEqual({
      offerId: ryzen.offerId,
      type: 'whatsapp_click',
    });
  });

  it('sin número válido deshabilita el botón de WhatsApp', () => {
    const noPhone = { ...ryzen, store: { ...ryzen.store, whatsappE164: null } };
    renderWithProviders(<OfferCard offer={noPhone} />);
    expect(screen.queryByRole('link', { name: 'Contactar por WhatsApp' })).not.toBeInTheDocument();
    expect(
      screen.getByText('WhatsApp no disponible').closest('[aria-disabled="true"]'),
    ).not.toBeNull();
  });

  it('un dato desconocido no se muestra como cero', () => {
    const unknown = {
      ...ryzen,
      component: {
        ...ryzen.component,
        specs: { ...ryzen.component.specs, baseClockGhz: null, cores: null },
      },
    };
    renderWithProviders(<OfferCard offer={unknown} />);
    expect(screen.getByText('AM5')).toBeInTheDocument();
  });
});
