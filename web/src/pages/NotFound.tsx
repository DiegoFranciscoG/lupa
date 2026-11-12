import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Link} from '@astryxdesign/core/Link';
import {href} from '../lib/router';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Esta página no existe"
      description="Puede que el enlace esté incompleto."
      actions={<Link href={href('')}>Ir al panorama</Link>}
      headingLevel={1}
    />
  );
}
