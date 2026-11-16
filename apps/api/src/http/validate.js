/**
 * Valida params, query y body con esquemas Zod. El resultado queda en `req.valid`
 * (en Express 5 `req.query` es de solo lectura). Un error de validación lo convierte
 * el manejador final en 422 VALIDATION_ERROR.
 * @param {{ params?: import('zod').ZodType, query?: import('zod').ZodType, body?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      req.valid = {};
      for (const part of ['params', 'query', 'body']) {
        if (schemas[part]) req.valid[part] = schemas[part].parse(req[part]);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
