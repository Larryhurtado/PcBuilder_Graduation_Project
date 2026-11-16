/** Utilidades para construir SQL parametrizado (el texto del usuario nunca se concatena). */

/** Escapa %, _ y \ para usar el texto del usuario dentro de un ILIKE. */
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Normaliza un valor igual que `normSql`: sin mayúsculas, espacios, guiones ni guiones bajos. */
export function normValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

/** Expresión SQL equivalente a `normValue` ("Micro ATX" = "Micro-ATX", "LGA 1700" = "LGA1700"). */
export function normSql(expression) {
  return `lower(regexp_replace(${expression}::text, '[\\s_-]', '', 'g'))`;
}

/**
 * Acumula condiciones WHERE con parámetros numerados. En cada plantilla, cada `?` se
 * reemplaza por el siguiente `$n`.
 */
export function createWhere() {
  const clauses = [];
  const params = [];

  return {
    params,

    /** @param {string} template condición con marcadores `?` @param {...unknown} values */
    add(template, ...values) {
      const marks = template.split('?').length - 1;
      if (marks !== values.length) {
        throw new Error(`La condición tiene ${marks} marcadores y ${values.length} valores.`);
      }
      let n = params.length;
      clauses.push(template.replace(/\?/g, () => `$${++n}`));
      params.push(...values);
    },

    /** Agrega un parámetro suelto (por ejemplo, el LIMIT) y devuelve su marcador `$n`. */
    param(value) {
      params.push(value);
      return `$${params.length}`;
    },

    /** "WHERE a AND b" o cadena vacía. */
    toSql() {
      return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    },
  };
}
