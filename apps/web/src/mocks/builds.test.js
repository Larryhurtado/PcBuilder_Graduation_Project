import { afterEach, describe, expect, it, vi } from 'vitest';
import { components } from './data.js';
import { resetMockBuilds } from './builds.js';

const api = (path) => `${window.location.origin}/api/v1${path}`;
const STORAGE_KEY = 'pcbuilder-mock-builds';

/** Carga el módulo de cero, como si la página se hubiera recargado. */
async function reload() {
  vi.resetModules();
  return import('./builds.js');
}

const cpu = components.find((item) => item.category === 'cpu');

const createBuild = (name) =>
  fetch(api('/builds'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, items: [{ category: cpu.category, componentId: cpu.id }] }),
  }).then((response) => response.json());

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('armados simulados: persistencia en localStorage', () => {
  it('un armado creado queda guardado en localStorage', async () => {
    const { build } = await createBuild('Mi prueba');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.map((entry) => entry.build.shareCode)).toContain(build.shareCode);
  });

  it('sobrevive a una recarga: el enlace compartido abre el mismo armado', async () => {
    const { build } = await createBuild('Sobrevive');
    await reload();
    const response = await fetch(api(`/builds/${build.shareCode}`));
    expect(response.status).toBe(200);
    expect((await response.json()).build.name).toBe('Sobrevive');
  });

  it('si lo guardado no sirve, arranca con los armados de ejemplo', async () => {
    localStorage.setItem(STORAGE_KEY, '{no es json');
    await reload();
    const response = await fetch(api('/builds/GAMEam5Set'));
    expect(response.status).toBe(200);
  });

  it('resetMockBuilds borra lo creado y vuelve a los ejemplos', async () => {
    const { build } = await createBuild('Temporal');
    // MSW usa la instancia cargada al arrancar: se resetea esa misma
    resetMockBuilds();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    const gone = await fetch(api(`/builds/${build.shareCode}`));
    expect(gone.status).toBe(404);
    const example = await fetch(api('/builds/GAMEam5Set'));
    expect(example.status).toBe(200);
  });
});
