import { describe, expect, it } from 'vitest';
import {
  draftFromStore,
  identityLocked,
  missingForVerification,
  toPatch,
  validateDraft,
} from './settings.js';

const store = {
  id: 's1',
  legalName: 'Tecno SAS',
  tradeName: 'Tecno',
  nit: '900542189-1',
  description: null,
  whatsappE164: '+573001112233',
  department: 'Valle del Cauca',
  city: 'Cali',
  address: 'Local 5',
  commercialCenter: 'C.C. Pasarela',
};
const open = { lockedIdentity: false };
const locked = { lockedIdentity: true };

describe('identityLocked', () => {
  it('bloquea razón social y NIT con la verificación en curso, aprobada o suspendida', () => {
    for (const status of ['pending_review', 'approved', 'suspended']) {
      expect(identityLocked(status)).toBe(true);
    }
  });

  it('los deja editar sin enviar, con corrección o rechazado', () => {
    for (const status of ['not_submitted', 'correction_requested', 'rejected', undefined]) {
      expect(identityLocked(status)).toBe(false);
    }
  });
});

describe('draftFromStore', () => {
  it('reconoce la ubicación del selector y quita el +57 del celular', () => {
    expect(draftFromStore(store)).toMatchObject({
      tradeName: 'Tecno',
      nit: '900542189-1',
      whatsapp: '3001112233',
      location: 'cali-pasarela',
      otherCity: '',
      description: '',
    });
  });

  it('una ciudad fuera de la lista pasa a "otra ubicación"', () => {
    const draft = draftFromStore({
      ...store,
      city: 'Pereira',
      department: 'Risaralda',
      commercialCenter: null,
    });
    expect(draft).toMatchObject({
      location: 'other',
      otherCity: 'Pereira',
      otherDepartment: 'Risaralda',
    });
  });

  it('una tienda sin datos queda en blanco', () => {
    const draft = draftFromStore({
      ...store,
      nit: null,
      whatsappE164: null,
      city: null,
      department: null,
      address: null,
      commercialCenter: null,
    });
    expect(draft).toMatchObject({ nit: '', whatsapp: '', location: '', address: '' });
  });
});

describe('validateDraft', () => {
  const ok = draftFromStore(store);

  it('un borrador igual a lo guardado es válido', () => {
    expect(validateDraft(ok, open)).toEqual({});
  });

  it('valida el nombre comercial', () => {
    expect(validateDraft({ ...ok, tradeName: ' a ' }, open).tradeName).toMatch(/nombre comercial/);
    expect(validateDraft({ ...ok, tradeName: 'x'.repeat(121) }, open).tradeName).toMatch(/120/);
  });

  it('valida razón social y NIT solo si la identidad está abierta', () => {
    const bad = { ...ok, legalName: '', nit: '12' };
    expect(Object.keys(validateDraft(bad, open))).toEqual(['legalName', 'nit']);
    expect(validateDraft(bad, locked)).toEqual({});
  });

  it('el NIT acepta puntos y espacios', () => {
    expect(validateDraft({ ...ok, nit: '900.542.189-1' }, open)).toEqual({});
    expect(validateDraft({ ...ok, nit: '900 542 189-1' }, open)).toEqual({});
  });

  it('valida el celular colombiano', () => {
    expect(validateDraft({ ...ok, whatsapp: '300 111-2233' }, open)).toEqual({});
    expect(validateDraft({ ...ok, whatsapp: '2001112233' }, open).whatsapp).toBeTruthy();
    expect(validateDraft({ ...ok, whatsapp: '30011' }, open).whatsapp).toBeTruthy();
  });

  it('limita descripción y dirección, y pide ciudad y departamento de "otra ubicación"', () => {
    expect(validateDraft({ ...ok, description: 'x'.repeat(1001) }, open).description).toBeTruthy();
    expect(validateDraft({ ...ok, address: 'ab' }, open).address).toBeTruthy();
    const other = validateDraft(
      { ...ok, location: 'other', otherCity: '', otherDepartment: '' },
      open,
    );
    expect(Object.keys(other)).toEqual(['otherCity', 'otherDepartment']);
  });

  it('los datos de verificación pueden seguir en blanco mientras no se escriban', () => {
    const blank = { ...ok, nit: '', whatsapp: '', address: '' };
    expect(validateDraft(blank, open)).toEqual({});
  });
});

describe('toPatch', () => {
  const base = draftFromStore(store);

  it('sin cambios no envía nada', () => {
    expect(toPatch(base, store, open)).toEqual({});
  });

  it('envía solo lo que cambió', () => {
    expect(toPatch({ ...base, tradeName: ' Nuevo ' }, store, open)).toEqual({ tradeName: 'Nuevo' });
    expect(toPatch({ ...base, address: 'Local 9' }, store, open)).toEqual({ address: 'Local 9' });
  });

  it('normaliza NIT y celular', () => {
    expect(toPatch({ ...base, nit: '900.111.222-3' }, store, open)).toEqual({ nit: '900111222-3' });
    expect(toPatch({ ...base, whatsapp: '310 845-9201' }, store, open)).toEqual({
      whatsappE164: '+573108459201',
    });
  });

  it('la descripción vacía va como null', () => {
    expect(toPatch({ ...base, description: 'Hola' }, store, open)).toEqual({ description: 'Hola' });
    const withText = { ...store, description: 'Hola' };
    expect(toPatch({ ...draftFromStore(withText), description: '  ' }, withText, open)).toEqual({
      description: null,
    });
  });

  it('con la identidad bloqueada ignora razón social y NIT', () => {
    expect(toPatch({ ...base, legalName: 'Otra SAS', nit: '900111222-3' }, store, locked)).toEqual(
      {},
    );
  });

  it('cambiar la ubicación envía ciudad, departamento y centro comercial', () => {
    expect(toPatch({ ...base, location: 'bogota-unilago' }, store, open)).toEqual({
      city: 'Bogotá',
      department: 'Bogotá D.C.',
      commercialCenter: 'C.C. Unilago',
    });
    expect(
      toPatch(
        { ...base, location: 'other', otherCity: 'Pereira', otherDepartment: 'Risaralda' },
        store,
        open,
      ),
    ).toEqual({ city: 'Pereira', department: 'Risaralda', commercialCenter: null });
  });

  it('no envía datos en blanco que la API no acepta vacíos', () => {
    const empty = { ...store, nit: null, whatsappE164: null, address: null };
    const blank = { ...draftFromStore(empty) };
    expect(toPatch(blank, empty, open)).toEqual({});
  });
});

describe('missingForVerification', () => {
  it('lista los datos que faltan', () => {
    expect(missingForVerification(store)).toEqual([]);
    expect(
      missingForVerification({
        ...store,
        nit: null,
        whatsappE164: null,
        city: null,
        address: null,
      }),
    ).toEqual(['NIT', 'WhatsApp de ventas', 'Ciudad y departamento', 'Dirección']);
  });
});
