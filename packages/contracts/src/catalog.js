import { z } from 'zod';

/** Las 8 categorías de componente del MVP (coinciden con el tipo catalog.component_category). */
export const componentCategories = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooler',
  'storage',
];

export const componentCategorySchema = z.enum(componentCategories);
