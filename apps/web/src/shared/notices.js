import { create } from 'zustand';

/**
 * Aviso global breve (un solo aviso a la vez, el más reciente). Lo muestra `NoticeHost`, montado en
 * el layout, para acciones que no pertenecen a una pantalla concreta (por ejemplo los corazones de
 * favoritos, que están en muchas). `action` es opcional: `{ label, to }` para ir a otra página o
 * `{ label, onClick }` para una acción como "Deshacer".
 * @typedef {{ message: string, tone?: 'success' | 'error', action?: { label: string, to?: string, onClick?: () => void } }} Notice
 */
export const useNoticeStore = create(() => ({ notice: null }));

let counter = 0;

/** @param {Notice} notice */
export function notify(notice) {
  counter += 1;
  useNoticeStore.setState({ notice: { ...notice, id: counter } });
}

export function dismissNotice() {
  useNoticeStore.setState({ notice: null });
}
