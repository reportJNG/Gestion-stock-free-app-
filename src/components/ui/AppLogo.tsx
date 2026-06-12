import clsx from 'clsx';

import { APP_LOGO_SRC, APP_NAME } from '@/constants/app';

type AppLogoSize = 'sm' | 'lg';

const sizeClass: Record<AppLogoSize, string> = {
  sm: 'app-logo-sm',
  lg: 'app-logo-lg',
};

interface AppLogoProps {
  size?: AppLogoSize;
  className?: string;
}

export const AppLogo = ({ size = 'sm', className }: AppLogoProps) => (
  <img
    src={APP_LOGO_SRC}
    alt={`${APP_NAME} logo`}
    className={clsx('app-logo', sizeClass[size], className)}
  />
);
