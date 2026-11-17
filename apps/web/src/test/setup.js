import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockAuth } from '../mocks/auth.js';
import { resetMockBuilds } from '../mocks/builds.js';
import { resetMockSeller } from '../mocks/seller.js';
import { resetMockWishlist } from '../mocks/wishlist.js';
import { server } from '../mocks/node.js';
import { dismissNotice } from '../shared/notices.js';
import { resetSession } from '../shared/session/actions.js';

// jsdom no implementa <dialog>: se simula lo mínimo (open, showModal, close y el evento close).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// Una petición sin handler falla la prueba: obliga a simular cada endpoint que se use.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockAuth();
  resetMockBuilds();
  resetMockWishlist();
  resetMockSeller();
  dismissNotice();
  resetSession();
  cleanup();
  sessionStorage.clear();
});
afterAll(() => server.close());
