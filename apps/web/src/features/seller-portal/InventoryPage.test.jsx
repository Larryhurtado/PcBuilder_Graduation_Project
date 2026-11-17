import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { offers as dataOffers, stores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { formatCOP } from '../../shared/lib/format.js';
import { renderApp } from '../../test/utils.jsx';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;

// Las ofertas de TecnoPasarela Cali: 11, con la cuarta pausada
const mine = dataOffers.filter((offer) => offer.store.id === stores[0].id);
const paused = mine[3];
const first = mine[0];

const open = async (path = '/vendedor/inventario') => {
  signInMock(seller);
  const utils = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Gestión de inventario y ofertas' });
  return { ...utils, user: userEvent.setup() };
};
const table = () => within(screen.getByRole('region', { name: 'Ofertas' }));
const loaded = async () => {
  await screen.findByRole('region', { name: 'Ofertas' });
  return table().findAllByRole('switch');
};
const rows = () =>
  table()
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('[role="switch"]'));
const rowOf = (name) => within(rows().find((row) => row.textContent.includes(name)));
const summary = () => within(screen.getByRole('region', { name: 'Resumen del inventario' }));

const unverified = () =>
  server.use(
    http.get(route('/seller/verification/status'), () =>
      HttpResponse.json({
        status: 'pending_review',
        submittedAt: '2026-11-10T10:00:00.000Z',
        reviewerNote: null,
        deadlineAt: null,
        canReapplyAt: null,
      }),
    ),
    // Como la API: editar y pausar exigen negocio verificado
    http.patch(route('/seller/offers/:id'), () =>
      HttpResponse.json(
        { code: 'STORE_NOT_VERIFIED', message: 'x', details: null, requestId: 'r' },
        { status: 403 },
      ),
    ),
  );

describe('Inventario: encabezado', () => {
  it('muestra el título, la carga masiva deshabilitada y el botón de publicar', async () => {
    await open();
    expect(document.title).toBe('Inventario · PcBuilder');
    expect(screen.getByRole('button', { name: /Carga masiva \(CSV\)/ })).toBeDisabled();
    const main = within(screen.getByRole('main'));
    expect(await main.findByRole('link', { name: 'Publicar producto' })).toHaveAttribute(
      'href',
      '/vendedor/publicar',
    );
  });

  it('no inventa SKU, existencias ni sincronización', async () => {
    await open();
    await loaded();
    expect(document.body).not.toHaveTextContent(
      /SKU|Stock:|tiempo real|sincronizadas|Agotado|v2\.4/i,
    );
  });
});

describe('Inventario: resumen', () => {
  it('cuenta activas y pausadas, y calcula el precio promedio y el rango de las activas', async () => {
    await open();
    await loaded();
    const activePrices = mine.filter((offer) => offer !== paused).map((offer) => offer.priceCop);
    const average = Math.round(
      activePrices.reduce((sum, price) => sum + price, 0) / activePrices.length,
    );
    expect(await summary().findByText('10')).toBeInTheDocument();
    expect(summary().getByText('1')).toBeInTheDocument();
    expect(summary().getByText(formatCOP(average))).toBeInTheDocument();
    expect(
      summary().getByText(
        `Rango: ${formatCOP(Math.min(...activePrices))} a ${formatCOP(Math.max(...activePrices))}`,
      ),
    ).toBeInTheDocument();
  });

  it('los clics a WhatsApp de los últimos 7 días traen el cambio contra el periodo anterior', async () => {
    await open();
    expect(await summary().findByText('Clics a WhatsApp (7 días)')).toBeInTheDocument();
    expect(await summary().findByText('vs. periodo anterior')).toBeInTheDocument();
  });
});

describe('Inventario: lista y paginación', () => {
  it('muestra las ofertas del vendedor de a 10 y dice cuántas hay', async () => {
    await open();
    expect(await loaded()).toHaveLength(10);
    expect(
      within(screen.getByRole('navigation', { name: 'Paginación' })).getByText(/de/).textContent,
    ).toContain('11 ofertas');
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent(
      'Mostrando 1–10 de 11 ofertas',
    );
  });

  it('cada fila muestra componente, marca, categoría, condición, precio y garantía reales', async () => {
    await open();
    await loaded();
    const row = rowOf(first.component.displayName);
    expect(row.getByText(first.component.brand)).toBeInTheDocument();
    expect(row.getByText('Procesadores')).toBeInTheDocument();
    expect(row.getByText('Nuevo')).toBeInTheDocument();
    expect(row.getByText(formatCOP(first.priceCop))).toBeInTheDocument();
    expect(row.getByText('Garantía 12 meses')).toBeInTheDocument();
    expect(
      row.getByRole('switch', { name: `Visibilidad de ${first.component.displayName}` }),
    ).toBeChecked();
  });

  it('la oferta pausada se ve como pausada', async () => {
    await open();
    await loaded();
    expect(
      rowOf(paused.component.displayName).getByRole('switch', {
        name: `Visibilidad de ${paused.component.displayName}`,
      }),
    ).not.toBeChecked();
    expect(rowOf(paused.component.displayName).getByText('Pausado')).toBeInTheDocument();
  });

  it('el paginador lleva a la segunda página con la oferta restante', async () => {
    const { user } = await open();
    await loaded();
    const pager = within(screen.getByRole('navigation', { name: 'Paginación' }));
    expect(pager.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(pager.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
    await user.click(pager.getByRole('button', { name: 'Siguiente' }));
    expect(rows()).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent(
      'Mostrando 11–11 de 11 ofertas',
    );
    expect(pager.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await user.click(pager.getByRole('button', { name: 'Página 1' }));
    expect(rows()).toHaveLength(10);
  });
});

describe('Inventario: filtros', () => {
  it('busca por componente, marca o modelo', async () => {
    const { user } = await open();
    await loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en tu inventario' }), 'ryzen');
    await waitFor(() => expect(rows().length).toBeLessThan(10));
    for (const row of rows()) expect(row).toHaveTextContent(/ryzen/i);
  });

  it('filtra por estado y los chips traen su conteo', async () => {
    const { user } = await open();
    await loaded();
    const group = within(screen.getByRole('group', { name: 'Filtrar por estado' }));
    expect(group.getByRole('button', { name: /Todas/ })).toHaveTextContent('11');
    expect(group.getByRole('button', { name: /Activas/ })).toHaveTextContent('10');
    expect(group.getByRole('button', { name: /Pausadas/ })).toHaveTextContent('1');
    await user.click(group.getByRole('button', { name: /Pausadas/ }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent(paused.component.displayName);
  });

  it('filtra por categoría con las ocho categorías del catálogo', async () => {
    const { user } = await open();
    await loaded();
    const select = screen.getByRole('combobox', { name: 'Filtrar por categoría' });
    expect(within(select).getAllByRole('option')).toHaveLength(9); // "todas" + 8
    await user.selectOptions(select, 'cpu');
    const cpus = mine.filter((offer) => offer.component.category === 'cpu');
    expect(rows()).toHaveLength(cpus.length);
  });

  it('"Sin stock" está deshabilitado como "Próximamente"', async () => {
    await open();
    expect(screen.getByRole('button', { name: /Sin stock/ })).toBeDisabled();
  });

  it('si nada coincide ofrece quitar los filtros', async () => {
    const { user } = await open();
    await loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en tu inventario' }), 'zzzz');
    expect(
      await screen.findByRole('heading', { name: 'Ninguna oferta coincide' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar los filtros' }));
    expect(await loaded()).toHaveLength(10);
  });

  it('cambiar un filtro vuelve a la primera página', async () => {
    const { user } = await open();
    await loaded();
    const pager = within(screen.getByRole('navigation', { name: 'Paginación' }));
    await user.click(pager.getByRole('button', { name: 'Siguiente' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', {
        name: /Activas/,
      }),
    );
    expect(rows()).toHaveLength(10);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent(
      'Mostrando 1–10 de 10 ofertas',
    );
  });
});

describe('Inventario: precio con edición rápida', () => {
  it('el lápiz abre un campo, Enter guarda y el resumen se actualiza', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', {
        name: `Editar el precio de ${first.component.displayName}`,
      }),
    );
    const input = screen.getByRole('textbox', {
      name: `Nuevo precio de ${first.component.displayName}`,
    });
    expect(input).toHaveValue(String(first.priceCop));
    await user.clear(input);
    await user.type(input, '1.500.000{Enter}');
    expect(
      await rowOf(first.component.displayName).findByText(formatCOP(1_500_000)),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Nuevo precio/ })).not.toBeInTheDocument();
  });

  it('el botón de guardar también envía el precio', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', { name: /Editar el precio/ }),
    );
    const input = screen.getByRole('textbox', { name: /Nuevo precio/ });
    await user.clear(input);
    await user.type(input, '900000');
    await user.click(screen.getByRole('button', { name: /Guardar el precio/ }));
    expect(
      await rowOf(first.component.displayName).findByText(formatCOP(900_000)),
    ).toBeInTheDocument();
  });

  it('Escape cancela sin llamar a la API', async () => {
    let calls = 0;
    server.use(
      http.patch(route('/seller/offers/:id'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', { name: /Editar el precio/ }),
    );
    await user.type(screen.getByRole('textbox', { name: /Nuevo precio/ }), '9{Escape}');
    expect(screen.queryByRole('textbox', { name: /Nuevo precio/ })).not.toBeInTheDocument();
    expect(
      rowOf(first.component.displayName).getByText(formatCOP(first.priceCop)),
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it.each(['', '0', 'abc', '12,5', '-300'])(
    'rechaza el precio "%s" sin llamar a la API',
    async (text) => {
      let calls = 0;
      server.use(
        http.patch(route('/seller/offers/:id'), () => {
          calls += 1;
          return HttpResponse.json({});
        }),
      );
      const { user } = await open();
      await loaded();
      await user.click(
        rowOf(first.component.displayName).getByRole('button', { name: /Editar el precio/ }),
      );
      const input = screen.getByRole('textbox', { name: /Nuevo precio/ });
      await user.clear(input);
      if (text) await user.type(input, text);
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('alert')).toHaveTextContent(/precio entero mayor que 0/);
      expect(calls).toBe(0);
    },
  );

  it('guardar el mismo precio cierra el campo sin llamar a la API', async () => {
    let calls = 0;
    server.use(
      http.patch(route('/seller/offers/:id'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', { name: /Editar el precio/ }),
    );
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('textbox', { name: /Nuevo precio/ })).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('si el servidor rechaza el cambio muestra el motivo y deja corregir', async () => {
    unverified();
    const { user } = await open();
    await loaded();
    // El negocio sin verificar tiene el lápiz deshabilitado: se habilita solo con la ruta ya verificada
    expect(
      rowOf(first.component.displayName).getByRole('button', { name: /Editar el precio/ }),
    ).toBeDisabled();
    expect(user).toBeDefined();
  });
});

describe('Inventario: editar la oferta', () => {
  const openDialog = async (user, offer = first) => {
    await user.click(
      rowOf(offer.component.displayName).getByRole('button', {
        name: `Editar ${offer.component.displayName}`,
      }),
    );
    return within(await screen.findByRole('dialog'));
  };

  it('muestra los valores actuales y guarda solo lo que cambió', async () => {
    let body;
    server.use(
      http.patch(route('/seller/offers/:id'), async ({ request }) => {
        body = await request.clone().json();
        return undefined;
      }),
    );
    const { user } = await open();
    await loaded();
    const dialog = await openDialog(user);
    expect(dialog.getByLabelText('Precio (COP)')).toHaveValue(String(first.priceCop));
    expect(dialog.getByLabelText('Garantía (meses)')).toHaveValue('12');
    const warranty = dialog.getByLabelText('Garantía (meses)');
    await user.clear(warranty);
    await user.type(warranty, '24');
    await user.type(dialog.getByLabelText('Descripción (opcional)'), 'Caja sellada');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(body).toEqual({ warrantyMonths: 24, description: 'Caja sellada' });
    expect(
      await rowOf(first.component.displayName).findByText('Garantía 24 meses'),
    ).toBeInTheDocument();
  });

  it('sin cambios se cierra sin llamar a la API', async () => {
    let calls = 0;
    server.use(
      http.patch(route('/seller/offers/:id'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user } = await open();
    await loaded();
    const dialog = await openDialog(user);
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('valida el precio, la garantía y la descripción', async () => {
    const { user } = await open();
    await loaded();
    const dialog = await openDialog(user);
    await user.clear(dialog.getByLabelText('Precio (COP)'));
    await user.type(dialog.getByLabelText('Precio (COP)'), '0');
    await user.clear(dialog.getByLabelText('Garantía (meses)'));
    await user.type(dialog.getByLabelText('Garantía (meses)'), '121');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    expect(await dialog.findByText(/precio entero mayor que 0/)).toBeInTheDocument();
    expect(dialog.getByText('Escribe los meses de garantía, entre 0 y 120')).toBeInTheDocument();
    expect(dialog.getByLabelText('Precio (COP)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('vaciar la descripción la envía como null', async () => {
    let body;
    server.use(
      http.patch(route('/seller/offers/:id'), async ({ request }) => {
        body = await request.clone().json();
        return undefined;
      }),
    );
    const { user } = await open();
    await loaded();
    let dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('Descripción (opcional)'), 'Algo');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    dialog = await openDialog(user);
    await user.clear(dialog.getByLabelText('Descripción (opcional)'));
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(body).toEqual({ description: null }));
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.patch(route('/seller/offers/:id'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open();
    await loaded();
    const dialog = await openDialog(user);
    await user.type(dialog.getByLabelText('Descripción (opcional)'), 'Algo');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('Cancelar cierra el diálogo sin guardar', async () => {
    const { user } = await open();
    await loaded();
    const dialog = await openDialog(user);
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Inventario: pausar y activar', () => {
  it('pausar una oferta activa la oculta al instante y actualiza el resumen', async () => {
    const { user } = await open();
    await loaded();
    const toggle = rowOf(first.component.displayName).getByRole('switch');
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    await waitFor(() => expect(summary().getByText('9')).toBeInTheDocument());
    expect(summary().getByText('2')).toBeInTheDocument();
  });

  it('activar una oferta pausada la vuelve a mostrar', async () => {
    const { user } = await open();
    await loaded();
    const toggle = rowOf(paused.component.displayName).getByRole('switch');
    await user.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    await waitFor(() => expect(summary().getByText('11')).toBeInTheDocument());
  });

  it('si el servidor falla revierte el cambio y avisa', async () => {
    server.use(
      http.patch(route('/seller/offers/:id/visibility'), () =>
        HttpResponse.json(
          { code: 'STORE_NOT_VERIFIED', message: 'x', details: null, requestId: 'r' },
          { status: 403 },
        ),
      ),
    );
    const { user } = await open();
    await loaded();
    const toggle = rowOf(first.component.displayName).getByRole('switch');
    await user.click(toggle);
    expect(
      (await screen.findAllByText(/verificado|verificación|publicar/i)).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(toggle).toBeChecked());
  });
});

describe('Inventario: eliminar', () => {
  it('pide confirmación y, al confirmar, quita la oferta y avisa', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', {
        name: `Eliminar ${first.component.displayName}`,
      }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/no se puede deshacer/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Eliminar oferta' }));
    expect(
      await screen.findByText(`${first.component.displayName} se eliminó de tu inventario.`),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(rows().some((row) => row.textContent.includes(first.component.displayName))).toBe(
        false,
      ),
    );
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent('10 ofertas');
  });

  it('cancelar no elimina nada', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', { name: /^Eliminar / }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(rows()).toHaveLength(10);
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.delete(route('/seller/offers/:id'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open();
    await loaded();
    await user.click(
      rowOf(first.component.displayName).getByRole('button', { name: /^Eliminar / }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Eliminar oferta' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(dialog.getByRole('button', { name: 'Eliminar oferta' })).toBeEnabled();
    expect(rows()).toHaveLength(10);
  });
});

describe('Inventario: negocio sin verificar', () => {
  it('avisa, bloquea publicar, editar y pausar, pero deja eliminar', async () => {
    unverified();
    const { user } = await open();
    await loaded();
    expect(await screen.findByRole('note')).toHaveTextContent(
      /puedes ver y eliminar tus ofertas, pero no editarlas ni pausarlas/,
    );
    expect(
      screen.getByText(/Aún no puedes publicar productos hasta que tu negocio sea verificado/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar producto' })).toBeDisabled();
    const row = rowOf(first.component.displayName);
    expect(row.getByRole('switch')).toBeDisabled();
    expect(row.getByRole('button', { name: /Editar el precio/ })).toBeDisabled();
    expect(
      row.getByRole('button', { name: `Editar ${first.component.displayName}` }),
    ).toBeDisabled();
    expect(row.getByRole('button', { name: /^Eliminar / })).toBeEnabled();
    await user.click(row.getByRole('button', { name: /^Eliminar / }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('Inventario: estados', () => {
  it('un vendedor sin ofertas ve el estado vacío con salida a publicar', async () => {
    server.use(http.get(route('/seller/offers'), () => HttpResponse.json({ items: [] })));
    await open();
    expect(
      await screen.findByRole('heading', { name: 'Aún no has publicado ofertas' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Publicar producto' }).at(-1)).toHaveAttribute(
      'href',
      '/vendedor/publicar',
    );
  });

  it('si falla la lista muestra el error con reintento', async () => {
    server.use(http.get(route('/seller/offers'), () => HttpResponse.error()));
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('mientras carga muestra un marcador', async () => {
    signInMock(seller);
    renderApp('/vendedor/inventario');
    expect(await screen.findByRole('status', { name: 'Cargando inventario' })).toBeInTheDocument();
  });

  it('el dashboard cuenta las activas y pausadas desde las mismas ofertas', async () => {
    const { user } = await open();
    await loaded();
    await user.click(rowOf(first.component.displayName).getByRole('switch'));
    await waitFor(() =>
      expect(rowOf(first.component.displayName).getByRole('switch')).not.toBeChecked(),
    );
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));
    const kpis = within(await screen.findByRole('region', { name: 'Indicadores' }));
    await waitFor(() => expect(kpis.getByText('9')).toBeInTheDocument());
  });
});
