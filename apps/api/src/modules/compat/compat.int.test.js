// El motor de compatibilidad contra los datos reales de la base: las mismas conclusiones que
// las pruebas CMP-01 a CMP-05 de db/005_verify.sql, pero calculadas por el motor en JavaScript.
import { STATUS, evaluate, evaluateCandidate, slotForCategory } from '@hw/compat-engine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, createPool } from '../../kernel/db.js';
import { createCatalogModule } from '../catalog/index.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('motor de compatibilidad con datos reales', () => {
  let pool;
  let db;
  let catalog;

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    catalog = createCatalogModule({ db }).facade;
  });
  afterAll(() => pool.end());

  /** Arma el objeto de ranuras de un armado guardado (builds.builds) con sus especificaciones. */
  async function loadBuild(shareCode) {
    const { rows } = await db.query(
      `SELECT bi.category, bi.component_id
         FROM builds.builds b JOIN builds.build_items bi ON bi.build_id = b.id
        WHERE b.share_code = $1`,
      [shareCode],
    );
    const components = await catalog.getSpecs(rows.map((r) => r.componentId));
    const build = {};
    for (const row of rows)
      build[slotForCategory(row.category)] = components.get(row.componentId).specs;
    return build;
  }

  it('armado A (AM5/DDR5): las 8 reglas son compatibles, 300 W y fuente de 400 W', async () => {
    const result = evaluate(await loadBuild('Ab3dE9fG2h'));
    expect(result.results.map((r) => r.status)).toEqual(Array(8).fill(STATUS.OK));
    expect(result.estimatedWatts).toBe(300);
    expect(result.recommendedPsuW).toBe(400);
  });

  it('armado B: detecta RC-01 (socket), RC-02 (DDR4 vs DDR5) y RC-04 (formato) como incompatibles', async () => {
    const result = evaluate(await loadBuild('Zx8Qw1Er5T'));
    const failed = result.results.filter((r) => r.status === STATUS.FAIL).map((r) => r.code);
    expect(failed).toEqual(['RC-01', 'RC-02', 'RC-04']);
    expect(result.summary.unknown).toBe(0);
  });

  it('con una caja sin altura de disipador registrada, RC-06 queda no verificable', async () => {
    const { rows } = await db.query(
      'SELECT c.id FROM catalog.components c JOIN catalog.case_specs s ON s.component_id = c.id WHERE s.max_cooler_height_mm IS NULL',
    );
    expect(rows.length).toBeGreaterThan(0);
    const [pcCase] = [...(await catalog.getSpecs([rows[0].id])).values()];
    const { rows: coolers } = await db.query(
      "SELECT id FROM catalog.components WHERE category = 'cooler' LIMIT 1",
    );
    const [cooler] = [...(await catalog.getSpecs([coolers[0].id])).values()];
    const result = evaluate({ pcCase: pcCase.specs, cooler: cooler.specs });
    expect(result.results.find((r) => r.code === 'RC-06').status).toBe(STATUS.UNKNOWN);
  });

  it('CP-06: con el Ryzen 5 7600 elegido, las únicas placas candidatas no incompatibles son AM5', async () => {
    const { rows: cpuRows } = await db.query(
      "SELECT id FROM catalog.components WHERE display_name = 'AMD Ryzen 5 7600'",
    );
    const cpu = (await catalog.getComponent(cpuRows[0].id)).specs;

    const { rows: boards } = await db.query(
      "SELECT id FROM catalog.components WHERE category = 'motherboard'",
    );
    const components = [...(await catalog.getSpecs(boards.map((b) => b.id))).values()];
    expect(components.length).toBe(5);

    const accepted = components.filter(
      (b) => evaluateCandidate('motherboard', b.specs, { cpu }).status !== STATUS.FAIL,
    );
    expect(accepted.length).toBeGreaterThan(0);
    expect(accepted.every((b) => b.specs.socket === 'AM5')).toBe(true);
    const rejected = components.filter((b) => !accepted.includes(b));
    expect(rejected.every((b) => b.specs.socket !== 'AM5')).toBe(true);
  });
});
