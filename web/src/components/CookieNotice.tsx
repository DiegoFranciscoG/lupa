import {useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Link} from '@astryxdesign/core/Link';
import {href} from '../lib/router';

export const NOTICE_KEY = 'lupa.aviso-cerrado';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Informative notice: the site sets no cookies, so there is nothing to accept. */
export function CookieNotice() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;
  const close = () => {
    try {
      window.localStorage.setItem(NOTICE_KEY, '1');
    } catch {
      // Storage blocked: the notice closes only for this visit.
    }
    setDismissed(true);
  };
  return (
    <div className="lupa-notice" role="region" aria-label="Aviso de privacidad">
      <Banner
        status="info"
        title="Este sitio no usa cookies ni analítica"
        description={
          <>
            Tus consultas se ejecutan en tu navegador. <Link href={href('cookies')}>Más detalles</Link> y{' '}
            <Link href={href('privacidad')}>aviso de privacidad</Link>.
          </>
        }
        isDismissable
        dismissLabel="Cerrar aviso"
        onDismiss={close}
        container="card"
      />
    </div>
  );
}
