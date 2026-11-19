import Icon from '../../shared/ui/Icon.jsx';

/**
 * Agrega a un resolver de formulario la comprobación de que `password` y `confirmPassword` coincidan.
 * La coincidencia no va dentro del esquema (`.refine`) porque Zod la omite mientras otro campo sea
 * inválido, y entonces el aviso no saldría al salir del campo de confirmación.
 * @param {(values: any, context: any, options: any) => Promise<any>} schemaResolver
 */
export const withPasswordMatch = (schemaResolver) => async (values, context, options) => {
  const result = await schemaResolver(values, context, options);
  const mismatch =
    values.confirmPassword && values.password !== values.confirmPassword
      ? { type: 'validate', message: 'Las contraseñas no coinciden' }
      : null;
  if (!mismatch || result.errors?.confirmPassword) return result;
  return { values: {}, errors: { ...result.errors, confirmPassword: mismatch } };
};

/** Requisitos de la contraseña: los tres del servidor (8 a 72, una letra, un número) y la coincidencia. */
const passwordRules = [
  {
    id: 'length',
    label: 'Entre 8 y 72 caracteres',
    test: (password) => password.length >= 8 && password.length <= 72,
  },
  { id: 'letter', label: 'Al menos una letra', test: (password) => /[A-Za-z]/.test(password) },
  { id: 'number', label: 'Al menos un número', test: (password) => /[0-9]/.test(password) },
  {
    id: 'match',
    label: 'Las dos contraseñas coinciden',
    test: (password, confirm) => confirm.length > 0 && password === confirm,
  },
];

export function PasswordRules({ password, confirm }) {
  return (
    <ul
      id="password-rules"
      aria-label="Requisitos de la contraseña"
      className="grid gap-1 rounded-xl bg-surface p-space-sm text-body-sm"
    >
      {passwordRules.map((rule) => {
        const met = rule.test(password, confirm);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${met ? 'text-compatible' : 'text-on-surface-variant'}`}
          >
            <Icon name={met ? 'check_circle' : 'radio_button_unchecked'} className="text-[18px]" />
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
