import { beforeEach, describe, expect, it } from 'vitest';
import { findOffer } from '../../mocks/data.js';
import { useBuildStore } from './store.js';

const cpu = findOffer('AMD Ryzen 5 7600', 'TecnoPasarela Cali');
const gpu = findOffer('RTX 4060 Ti');

beforeEach(() => {
  useBuildStore.setState({ parts: {} });
  sessionStorage.clear();
});

const saved = () => JSON.parse(sessionStorage.getItem('pcbuilder-armado'));

describe('useBuildStore', () => {
  it('agrega una pieza en la ranura de su categoría', () => {
    useBuildStore.getState().setPart(cpu);
    expect(useBuildStore.getState().parts.cpu).toEqual(cpu);
  });

  it('cambiar una pieza reemplaza la de la misma categoría', () => {
    const other = findOffer('AMD Ryzen 5 7600', 'Unilago Gaming');
    useBuildStore.getState().setPart(cpu);
    useBuildStore.getState().setPart(other);
    expect(Object.keys(useBuildStore.getState().parts)).toEqual(['cpu']);
    expect(useBuildStore.getState().parts.cpu.offerId).toBe(other.offerId);
  });

  it('quita una pieza sin tocar las demás', () => {
    useBuildStore.getState().setPart(cpu);
    useBuildStore.getState().setPart(gpu);
    useBuildStore.getState().removePart('cpu');
    expect(Object.keys(useBuildStore.getState().parts)).toEqual(['gpu']);
  });

  it('restablece todo el armado', () => {
    useBuildStore.getState().setPart(cpu);
    useBuildStore.getState().setPart(gpu);
    useBuildStore.getState().reset();
    expect(useBuildStore.getState().parts).toEqual({});
  });

  it('ignora una oferta sin especificaciones: el motor no podría evaluarla', () => {
    const { specs: _specs, ...withoutSpecs } = cpu.component;
    useBuildStore.getState().setPart({ ...cpu, component: withoutSpecs });
    expect(useBuildStore.getState().parts).toEqual({});
  });

  it('ignora datos que no son una oferta', () => {
    useBuildStore.getState().setPart({ nada: true });
    useBuildStore.getState().setPart(undefined);
    expect(useBuildStore.getState().parts).toEqual({});
  });

  it('guarda el armado en sessionStorage para no perderlo al recargar', () => {
    useBuildStore.getState().setPart(cpu);
    expect(saved().state.parts.cpu.component.displayName).toBe('AMD Ryzen 5 7600');
  });

  it('al recargar recupera lo guardado y descarta lo que ya no cumple el contrato', async () => {
    sessionStorage.setItem(
      'pcbuilder-armado',
      JSON.stringify({
        state: { parts: { cpu, gpu: { roto: true }, ram: cpu } }, // ram trae una CPU: categoría incorrecta
        version: 1,
      }),
    );
    await useBuildStore.persist.rehydrate();
    expect(Object.keys(useBuildStore.getState().parts)).toEqual(['cpu']);
  });
});
