import {useState} from 'react';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {Link} from '@astryxdesign/core/Link';
import {Card} from '@astryxdesign/core/Card';
import {getJson, sumBy, type Meta, type Panorama} from '../lib/data';
import {fmtInt, fmtUsd, fmtUsdShort} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {BarChart} from '../components/BarChart';
import {PageHeader, SelectField, Stat} from '../components/PageHeader';
import {FAMILY_LABEL, SITE} from '../content/site';

export function PanoramaPage() {
  const state = useAsync(() => Promise.all([getJson<Panorama>('panorama.json'), getJson<Meta>('meta.json')]), []);
  return <Loaded state={state}>{([p, m]) => <PanoramaView p={p} m={m} />}</Loaded>;
}

function PanoramaView({p, m}: {p: Panorama; m: Meta}) {
  const years = p.por_anio.map((r) => r.anio);
  const lastFull = years.filter((y) => y < new Date().getFullYear()).at(-1) ?? years.at(-1) ?? 0;
  const [year, setYear] = useState(String(lastFull));
  const y = Number(year);
  const total = p.por_anio.find((r) => r.anio === y);
  const families = sumBy(
    p.por_familia.filter((r) => r.anio === y),
    (r) => FAMILY_LABEL[r.familia] ?? r.familia,
    (r) => r.monto,
  );
  const provinces = sumBy(
    p.por_provincia.filter((r) => r.anio === y),
    (r) => r.provincia,
    (r) => r.monto,
  ).slice(0, 12);
  const natural = p.por_tipo_proveedor.filter((r) => r.anio === y && r.tipo === 'natural').reduce((s, r) => s + r.monto, 0);

  return (
    <VStack gap={6}>
      <PageHeader title="Cifras" lead={SITE.intro}>
        <Text as="p" color="secondary">
          {fmtInt(m.procesos)} procesos de compra entre {m.anios[0]} y {m.anios.at(-1)}.{' '}
          <Link href={href('precios')}>Compara cuánto pagó cada entidad por el mismo ítem</Link>.
        </Text>
      </PageHeader>

      <section aria-labelledby="h-anual">
        <VStack gap={3}>
          <Heading level={2} id="h-anual">Monto adjudicado por año</Heading>
          <BarChart
            title="Monto adjudicado por año, en dólares"
            bars={p.por_anio.map((r) => ({label: String(r.anio), value: r.monto, isAccent: r.anio === y}))}
          />
          <Text type="supporting" color="secondary">
            {m.anios.at(-1)} incluye datos hasta {m.snapshot_fecha}. Solo adjudicaciones vigentes en dólares.
          </Text>
        </VStack>
      </section>

      <section aria-labelledby="h-anio">
        <VStack gap={4}>
          <Heading level={2} id="h-anio">El año {y} en cifras</Heading>
          <div style={{maxWidth: 240}}>
            <SelectField
              label="Año"
              value={year}
              options={[...years].reverse().map((v) => ({value: String(v), label: String(v)}))}
              onChange={setYear}
            />
          </div>
          <div className="lupa-stats">
            <Stat label="Monto adjudicado" value={fmtUsdShort(total?.monto)} note={fmtUsd(total?.monto)} />
            <Stat label="Adjudicaciones" value={fmtInt(total?.adjudicaciones)} />
            <Stat label="A personas naturales" value={fmtUsdShort(natural)} note="Sin nombres ni RUC, por protección de datos." />
          </div>
          <div className="lupa-grid-2">
            <Card padding={4}>
              <VStack gap={2}>
                <Heading level={3}>Por procedimiento</Heading>
                <BarChart title={`Monto por procedimiento en ${y}`} bars={families.map((f) => ({...f}))} orientation="horizontal" />
              </VStack>
            </Card>
            <Card padding={4}>
              <VStack gap={2}>
                <Heading level={3}>Por provincia de la entidad</Heading>
                <BarChart title={`Monto por provincia en ${y}`} bars={provinces} orientation="horizontal" />
              </VStack>
            </Card>
          </div>
        </VStack>
      </section>
    </VStack>
  );
}
