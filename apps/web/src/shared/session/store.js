import { create } from 'zustand';

const initial = { status: 'loading', user: null, accessToken: null };

/**
 * Sesión del usuario. El token de acceso vive SOLO en memoria (nunca en localStorage ni en
 * sessionStorage): al recargar se recupera con el refresco por cookie (POST /auth/refresh).
 * `status`: 'loading' (aún no sabemos), 'authenticated' o 'guest'.
 */
export const useSessionStore = create(() => initial);

export const getAccessToken = () => useSessionStore.getState().accessToken;

/** @param {{ accessToken: string, user: { id: string, email: string, fullName: string, role: string } }} auth */
export const setAuthenticated = ({ accessToken, user }) =>
  useSessionStore.setState({ status: 'authenticated', user, accessToken });

export const setGuest = () =>
  useSessionStore.setState({ status: 'guest', user: null, accessToken: null });

/** Vuelve al estado inicial (solo para pruebas). */
export const resetSessionStore = () => useSessionStore.setState(initial);
