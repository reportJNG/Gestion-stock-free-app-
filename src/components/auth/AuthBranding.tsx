import { useEffect, useState } from 'react';

import { AppLogo } from '@/components/ui/AppLogo';
import { APP_NAME, APP_TAGLINE } from '@/constants/app';

export const AuthBranding = () => {
  const [version, setVersion] = useState(import.meta.env.VITE_APP_VERSION ?? '');

  useEffect(() => {
    void window.api.app
      .getInfo()
      .then((info) => setVersion(info.version))
      .catch(() => undefined);
  }, []);

  return (
    <aside className="auth-branding">
      <div>
        <AppLogo size="lg" />
        <h1>{APP_NAME}</h1>
        <p>{APP_TAGLINE}</p>
      </div>
      {version ? <small>v{version}</small> : null}
    </aside>
  );
};
