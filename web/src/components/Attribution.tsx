import {Text} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {SOURCE_LINKS} from '../content/site';

interface Props {
  snapshotId?: number | null;
  snapshotDate?: string | null;
}

/** CC BY 3.0 EC attribution shown on every page (test T-08). */
export function Attribution({snapshotId, snapshotDate}: Props) {
  return (
    <Text as="p" type="supporting" color="secondary">
      <span data-testid="attribution">
        Fuente: Servicio Nacional de Contratación Pública (SERCOP), publicado por{' '}
        <Link href={SOURCE_LINKS.ocp} isExternalLink>
          Open Contracting Partnership
        </Link>
        . Licencia{' '}
        <Link href={SOURCE_LINKS.license} isExternalLink>
          CC BY 3.0 Ecuador
        </Link>
        . Datos transformados por LUPA (aplanados, normalizados y agregados)
        {snapshotId ? `. Instantánea ${snapshotId}${snapshotDate ? ` del ${snapshotDate}` : ''}` : ''}.
      </span>
    </Text>
  );
}
