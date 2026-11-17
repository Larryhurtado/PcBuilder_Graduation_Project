import { describe, expect, it, vi } from 'vitest';
import { copyText } from '../../shared/lib/clipboard.js';
import { findOffer } from '../../mocks/data.js';
import { useBuildStore } from '../builder/store.js';
import { restoreNotice } from './restore.js';
import { buildShareUrl } from './share.js';
import { buildStatus } from './status.js';

const evaluation = (incompatible, unknown, ok = 4) => ({
  summary: { incompatible, unknown, ok },
});

describe('buildStatus', () => {
  it('un conflicto pesa más que un dato por confirmar', () => {
    expect(buildStatus(evaluation(1, 2))).toBe('fail');
    expect(buildStatus(evaluation(0, 2))).toBe('unknown');
    expect(buildStatus(evaluation(0, 0))).toBe('ok');
  });
});

describe('buildShareUrl', () => {
  it('apunta a la pantalla de armado compartido con el código', () => {
    expect(buildShareUrl('Abc1234567')).toBe(`${window.location.origin}/armado/Abc1234567`);
  });
});

describe('copyText', () => {
  it('devuelve true cuando el portapapeles acepta el texto', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('hola')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hola');
    vi.unstubAllGlobals();
  });

  it('devuelve false si el navegador lo rechaza o no tiene portapapeles', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) },
    });
    await expect(copyText('hola')).resolves.toBe(false);
    vi.stubGlobal('navigator', {});
    await expect(copyText('hola')).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('restoreNotice', () => {
  it('abre sin avisos extra cuando todo se cargó', () => {
    expect(restoreNotice('Mi PC', { unavailable: [], replaced: 0 })).toBe(
      'Abrimos «Mi PC» en el asistente.',
    );
  });

  it('avisa de las ofertas reemplazadas y de las piezas que no se cargaron', () => {
    const text = restoreNotice('Mi PC', { unavailable: ['RTX 4070', 'AK400'], replaced: 1 });
    expect(text).toContain('1 pieza usa la oferta más barata');
    expect(text).toContain('2 piezas no se cargaron por falta de ofertas: RTX 4070, AK400.');
  });
});

describe('store.loadParts', () => {
  it('reemplaza todo el armado y descarta lo que no sirve', () => {
    const cpu = findOffer('AMD Ryzen 5 7600');
    useBuildStore.setState({ parts: { gpu: findOffer('RTX 4070 SUPER') } });
    useBuildStore.getState().loadParts({ cpu, ram: { invalida: true } });
    expect(Object.keys(useBuildStore.getState().parts)).toEqual(['cpu']);
    useBuildStore.setState({ parts: {} });
  });
});
