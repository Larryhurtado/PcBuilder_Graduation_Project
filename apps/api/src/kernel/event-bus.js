/**
 * Bus de eventos de dominio en memoria (ADR-07). Los módulos publican hechos
 * (por ejemplo `verification.approved`) y otros módulos reaccionan sin acoplarse.
 * Un fallo en un manejador no interrumpe a los demás ni al publicador.
 */
export function createEventBus({ onError = defaultOnError } = {}) {
  /** @type {Map<string, Set<(payload: unknown) => unknown>>} */
  const handlers = new Map();

  return {
    /** Suscribe un manejador. Devuelve una función para cancelar la suscripción. */
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    },

    /** Publica un evento y espera a que terminen todos los manejadores. */
    async emit(event, payload) {
      for (const handler of [...(handlers.get(event) ?? [])]) {
        try {
          await handler(payload);
        } catch (error) {
          onError(event, error);
        }
      }
    },
  };
}

function defaultOnError(event, error) {
  console.error(`Error en un manejador del evento "${event}":`, error);
}
