import { describe, expect, it, vi } from 'vitest';
import { createConsoleEmail, createMemoryEmail } from './email.js';

describe('adaptadores de correo', () => {
  it('el de memoria guarda los mensajes', async () => {
    const email = createMemoryEmail();
    await email.send({ to: 'a@b.co', subject: 'Hola', text: 'Texto' });
    expect(email.sent).toEqual([{ to: 'a@b.co', subject: 'Hola', text: 'Texto' }]);
  });

  it('el de consola escribe destinatario, asunto y texto (ahí se ve el enlace en desarrollo)', async () => {
    const logger = { info: vi.fn() };
    await createConsoleEmail({ logger }).send({
      to: 'a@b.co',
      subject: 'Hola',
      text: 'http://x/restablecer?token=abc',
    });
    const written = logger.info.mock.calls[0][0];
    expect(written).toContain('Para: a@b.co');
    expect(written).toContain('Asunto: Hola');
    expect(written).toContain('token=abc');
  });

  it('sin logger usa console.log', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await createConsoleEmail().send({ to: 'a@b.co', subject: 'S', text: 'T' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
