import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { findOffer } from '../../mocks/data.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from './store.js';

const tecno = 'TecnoPasarela Cali';

const setParts = (parts) => useBuildStore.setState({ parts });

// Armado A del Diseño (CP-01)
const compatible = () => ({
  cpu: findOffer('AMD Ryzen 5 7600', tecno),
  motherboard: findOffer('MSI PRO B650M-P'),
  ram: findOffer('DDR5-6200'),
  gpu: findOffer('RTX 4060 Ti'),
  psu: findOffer('Corsair RM750'),
  case: findOffer('Corsair 4000D'),
  cooler: findOffer('AK400'),
  storage: findOffer('Kingston NV3'),
});

const slot = (title) => screen.getByRole('article', { name: new RegExp(title) });

beforeEach(() => setParts({}));

describe('Asistente de ensamblaje: armado vacío', () => {
  it('invita a empezar por el procesador o la placa y muestra las 8 ranuras vacías', () => {
    renderApp('/armador');
    expect(screen.getByRole('heading', { level: 1, name: 'Arma tu PC' })).toBeInTheDocument();
    expect(screen.getByText(/Empieza por el procesador o la placa base/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Elegir componente/ })).toHaveLength(8);
    expect(screen.getByText('0 de 8 configuradas')).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay reglas que verificar/)).toBeInTheDocument();
  });

  it('las funciones que llegan después se ven deshabilitadas con "Próximamente"', () => {
    renderApp('/armador');
    for (const name of [/Exportar ID/, /Descargar cotización/, /Copiar enlace/]) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Próximamente');
    }
  });

  it('el aviso de transparencia no promete pagos ni ofertas garantizadas', () => {
    renderApp('/armador');
    expect(screen.getByText(/no almacena inventario ni procesa pagos/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/IVA/);
    expect(document.body).not.toHaveTextContent(/Medellín|Monterrey/);
  });
});

describe('Asistente de ensamblaje: elegir piezas', () => {
  it('elige una pieza del selector y la ranura, el resumen y el total se actualizan', async () => {
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(within(slot('Procesador')).getByRole('button', { name: /Elegir componente/ }));
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir procesador' }));
    expect(await picker.findByText('AMD Ryzen 7 7800X3D')).toBeInTheDocument();

    await user.click(picker.getAllByRole('button', { name: 'Agregar AMD Ryzen 5 7600' })[0]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(slot('Procesador')).getByRole('heading', { name: 'AMD Ryzen 5 7600' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 de 8 configuradas')).toBeInTheDocument();
    expect(screen.getByText('Configuración: 1/8 piezas')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('AMD Ryzen 5 7600 se agregó a tu armado.');
    expect(screen.getByText('Subtotal componentes (1)')).toBeInTheDocument();
  });

  it('CP-06: con una CPU AM5 elegida, el selector de placas muestra solo socket AM5', async () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno) });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(within(slot('Placa Base')).getByRole('button', { name: /Elegir componente/ }));
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir placa base' }));

    expect(await picker.findByText('MSI PRO B650M-P')).toBeInTheDocument();
    expect(picker.getByText(/MSI B650 GAMING PLUS/)).toBeInTheDocument();
    expect(picker.queryByText(/B550-A PRO/)).not.toBeInTheDocument(); // AM4
    expect(picker.queryByText(/ASUS B760M/)).not.toBeInTheDocument(); // LGA 1700
    expect(picker.getByRole('list', { name: 'Filtros aplicados' })).toHaveTextContent('Socket AM5');
  });

  it('las piezas de datos incompletos no se ocultan: salen como "No verificable"', async () => {
    setParts({ cooler: findOffer('AK400'), gpu: findOffer('RTX 4060 Ti') });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(within(slot('Chasis')).getByRole('button', { name: /Elegir componente/ }));
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir gabinete' }));

    expect(await picker.findByText(/Corsair 4000D/)).toBeInTheDocument();
    const h510 = picker.getByText(/NZXT H510/).closest('li');
    expect(within(h510).getByText(/No verificable/)).toBeInTheDocument();
    // la NR200P no admite una GPU de 338 mm: queda oculta
    expect(picker.queryByText(/NR200P/)).not.toBeInTheDocument();
  });

  it('el selector ordena y filtra por estado', async () => {
    const user = userEvent.setup();
    renderApp('/armador');
    await user.click(
      within(slot('Memoria RAM')).getByRole('button', { name: /Elegir componente/ }),
    );
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir memoria RAM' }));
    await picker.findByText(/Kingston HyperX/);

    const names = () => picker.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names()[0]).toMatch(/Kingston HyperX/); // menor precio primero ($189.000)

    await user.selectOptions(picker.getByLabelText('Ordenar por'), 'price_desc');
    await picker.findByText(/G\.Skill Trident/);
    expect(names()[0]).toMatch(/G\.Skill Trident/); // $499.000

    await user.selectOptions(picker.getByLabelText('Estado'), 'used');
    await picker.findByText(/Kingston HyperX/);
    expect(names()).toHaveLength(1);
  });

  it('cambiar una pieza reemplaza la anterior', async () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno) });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(within(slot('Procesador')).getByRole('button', { name: 'Cambiar' }));
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir procesador' }));
    await user.click(await picker.findByRole('button', { name: 'Agregar AMD Ryzen 7 7800X3D' }));

    expect(
      within(slot('Procesador')).getByRole('heading', { name: 'AMD Ryzen 7 7800X3D' }),
    ).toBeInTheDocument();
  });

  it('muestra el error del selector con reintento cuando falla la red', async () => {
    const { server } = await import('../../mocks/node.js');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/v1/offers', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(within(slot('Procesador')).getByRole('button', { name: /Elegir componente/ }));
    const picker = within(await screen.findByRole('dialog'));
    expect(await picker.findByRole('alert')).toHaveTextContent('Revisa tu conexión');

    server.resetHandlers();
    await user.click(picker.getByRole('button', { name: 'Reintentar' }));
    expect(await picker.findByText('AMD Ryzen 7 7800X3D')).toBeInTheDocument();
  });
});

describe('Asistente de ensamblaje: validación', () => {
  it('un armado compatible muestra consumo, fuente recomendada y carga', () => {
    setParts(compatible());
    renderApp('/armador');

    expect(screen.getByText('300 W')).toBeInTheDocument();
    expect(screen.getByText('400 W')).toBeInTheDocument(); // fuente recomendada
    const meter = screen.getByRole('meter', { name: 'Carga de la fuente' });
    expect(meter).toHaveAttribute('aria-valuenow', '40');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/VERIFICADO • RC-01/)).toBeInTheDocument();
    expect(screen.getByText('8 de 8 configuradas')).toBeInTheDocument();
  });

  it('una GPU que no cabe en la caja muestra el conflicto con las medidas y cómo resolverlo', async () => {
    setParts({ gpu: findOffer('RTX 4060 Ti'), case: findOffer('NR200P') });
    const user = userEvent.setup();
    renderApp('/armador');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('ALERTA FÍSICA • RC-05');
    expect(alert).toHaveTextContent('La GPU mide 338 mm y la caja admite 330 mm');
    expect(screen.getByText('1 Incompatible')).toBeInTheDocument();
    expect(screen.getByText('1 Conflicto')).toBeInTheDocument();
    // estado con icono y texto, no solo color
    expect(
      within(slot('Tarjeta Gráfica')).getByText(/Incompatible: La GPU mide 338 mm/),
    ).toBeInTheDocument();
    expect(within(slot('Chasis')).getByRole('button', { name: 'Reemplazar' })).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Ver gabinetes compatibles' }));
    const picker = within(await screen.findByRole('dialog', { name: 'Elegir gabinete' }));
    expect(await picker.findByText(/Corsair 4000D/)).toBeInTheDocument();
    expect(picker.getByRole('list', { name: 'Filtros aplicados' })).toHaveTextContent(
      'Cabe GPU de 338 mm',
    );
  });

  it('al quitar la pieza en conflicto el aviso desaparece', async () => {
    setParts({ gpu: findOffer('RTX 4060 Ti'), case: findOffer('NR200P') });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(screen.getByRole('button', { name: /Quitar .*NR200P/ }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('se quitó de tu armado');
    expect(within(slot('Chasis')).getByText('Ranura vacía')).toBeInTheDocument();
  });

  it('un dato faltante se explica como "No verificable", no como compatible', () => {
    setParts({ case: findOffer('NZXT H510'), cooler: findOffer('AK400') });
    renderApp('/armador');

    const alerts = within(screen.getByRole('region', { name: 'Avisos de reglas' }));
    expect(alerts.getByText('INFORMACIÓN • RC-06')).toBeInTheDocument();
    expect(
      alerts.getByText(/No verificable: falta .*confírmalo con la tienda/),
    ).toBeInTheDocument();
    expect(screen.getByText('1 No verificable')).toBeInTheDocument();
    // las dos piezas involucradas lo muestran en su ranura
    for (const title of ['Chasis', 'Refrigeración']) {
      expect(within(slot(title)).getByText(/No verificable: falta/)).toBeInTheDocument();
      expect(within(slot(title)).queryByText(/Compatible/)).not.toBeInTheDocument();
    }
    expect(alerts.queryByText(/VERIFICADO/)).not.toBeInTheDocument();
  });

  it('la ranura de cooler vacía informa la altura máxima de la caja', () => {
    setParts({ case: findOffer('Corsair 4000D') });
    renderApp('/armador');
    expect(
      within(slot('Refrigeración')).getByText(/admite disipadores de hasta 170 mm/),
    ).toBeInTheDocument();
  });

  it('el armado se conserva al recargar la pantalla', () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno) });
    const { unmount } = renderApp('/armador');
    unmount();
    renderApp('/armador');
    expect(
      within(slot('Procesador')).getByRole('heading', { name: 'AMD Ryzen 5 7600' }),
    ).toBeInTheDocument();
  });
});

describe('Asistente de ensamblaje: Tu armado', () => {
  it('lista las piezas con su precio y un botón de WhatsApp por pieza', () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno), ram: findOffer('DDR5-6200') });
    renderApp('/armador');

    const sidebar = within(screen.getByRole('region', { name: 'Tu armado' }));
    expect(sidebar.getByText('$ 849.000')).toBeInTheDocument();
    expect(sidebar.getByText('$ 469.000')).toBeInTheDocument();
    expect(sidebar.getByText('$ 1.318.000 COP')).toBeInTheDocument(); // subtotal
    const whatsapp = sidebar.getByRole('link', { name: 'Cotizar AMD Ryzen 5 7600 por WhatsApp' });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/573000000001\?text=/);
    expect(sidebar.getAllByText('Pendiente de selección')).toHaveLength(6);
  });

  it('restablecer pide confirmación antes de borrar el armado', async () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno) });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(screen.getByRole('button', { name: 'Restablecer todo' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(useBuildStore.getState().parts.cpu).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Restablecer todo' }));
    await user.click(screen.getByRole('button', { name: 'Sí, restablecer' }));
    expect(useBuildStore.getState().parts).toEqual({});
    expect(screen.getByText('0 de 8 configuradas')).toBeInTheDocument();
  });

  it('con piezas elegidas ofrece la barra inferior para móvil con el total', () => {
    setParts({ cpu: findOffer('AMD Ryzen 5 7600', tecno) });
    renderApp('/armador');
    expect(screen.getByRole('link', { name: 'Ver armado' })).toHaveAttribute('href', '#tu-armado');
    const bar = screen.getByRole('link', { name: 'Ver armado' }).parentElement;
    expect(within(bar).getByText('Sin conflictos · 1/8')).toBeInTheDocument();
    expect(within(bar).getByText('$ 849.000 COP')).toBeInTheDocument();
  });
});

describe('Asistente de ensamblaje: cotización formal', () => {
  it('muestra la vista previa con piezas, comercios y total, sin IVA', async () => {
    setParts({ gpu: findOffer('RTX 4060 Ti'), case: findOffer('NR200P') });
    const user = userEvent.setup();
    renderApp('/armador');

    await user.click(screen.getByRole('button', { name: 'Vista cotización formal' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: /Previsualización de cotización/ }),
    );

    const table = dialog.getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(8); // encabezado + 8 ranuras + total
    expect(within(table).getByText(/NR200P/)).toBeInTheDocument();
    expect(within(table).getByText('$ 2.539.000 COP')).toBeInTheDocument();
    expect(dialog.getByText(/ADVERTENCIA TÉCNICA/)).toBeInTheDocument();
    expect(dialog.getByText(/La GPU mide 338 mm y la caja admite 330 mm/)).toBeInTheDocument();
    expect(dialog.queryByText(/IVA/)).not.toBeInTheDocument();
    // imprimir y guardar PDF llegan después
    expect(dialog.getByRole('button', { name: /Imprimir cotización/ })).toBeDisabled();
    expect(dialog.getByRole('button', { name: /Guardar PDF/ })).toBeDisabled();

    await user.click(dialog.getByRole('button', { name: 'Cerrar cotización' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
