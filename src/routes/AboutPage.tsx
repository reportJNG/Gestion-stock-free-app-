import { useEffect, useState } from 'react';
import { GitBranch, Mail, MessageCircle, UserCircleIcon } from 'lucide-react';

import profileImage from '/pic.png';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { DEVELOPER, TECH_STACK } from '@/constants/developer';

interface AppInfo {
  version: string;
  platform: string;
  userDataPath: string;
  dbPath: string;
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const AboutPage = () => {
  const { notify } = useToast();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void window.api.app.getInfo().then(setAppInfo);
  }, []);

  const handleCopy = async (value: string, label: string) => {
    const copied = await copyToClipboard(value);

    notify({
      title: copied ? 'Copied' : 'Copy Failed',
      message: copied
        ? `${label} copied to clipboard.`
        : `Could not copy ${label.toLowerCase()}.`,
      variant: copied ? 'success' : 'error',
    });
  };

  const openExternal = (url: string) => {
    void window.api.shell.openExternal(url);
  };

  const openWhatsApp = () => {
    openExternal(`https://wa.me/${DEVELOPER.whatsappDigits}`);
  };

  const openEmail = () => {
    openExternal(`mailto:${DEVELOPER.email}`);
  };

  return (
    <div className="about-page">
      <header className="about-page-header">
        <p className="about-page-eyebrow">Made by</p>
        <h1 className="about-page-name">{DEVELOPER.name}</h1>
        <p className="about-page-role">{DEVELOPER.role}</p>
      </header>

      <div className="about-page-avatar">
        <img src={profileImage} alt={DEVELOPER.name} className="about-page-avatar-image" />
      </div>

      <div className="about-page-divider" />

      <p className="about-page-about">{DEVELOPER.about}</p>

      <div className="about-contact-list">
        <div className="about-contact-row">
          <div className="about-contact-main">
            <Mail className="about-contact-icon" size={24} />
            <div className="about-contact-text">
              <span className="about-contact-label">Email</span>
              <button type="button" className="about-contact-value" onClick={openEmail}>
                {DEVELOPER.email}
              </button>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void handleCopy(DEVELOPER.email, 'Email')}>
            Copy
          </Button>
        </div>

        <div className="about-contact-row">
          <div className="about-contact-main">
            <MessageCircle className="about-contact-icon" size={24} />
            <div className="about-contact-text">
              <span className="about-contact-label">WhatsApp</span>
              <button type="button" className="about-contact-value" onClick={openWhatsApp}>
                {DEVELOPER.whatsapp}
              </button>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleCopy(DEVELOPER.whatsapp, 'Phone Number')}
          >
            Copy
          </Button>
        </div>

        <div className="about-contact-row">
          <div className="about-contact-main">
            <GitBranch className="about-contact-icon" size={24} />
            <div className="about-contact-text">
              <span className="about-contact-label">GitHub</span>
              <button type="button" className="about-contact-value" onClick={() => openExternal(DEVELOPER.github.url)}>
                {DEVELOPER.github.label}
              </button>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openExternal(DEVELOPER.github.url)}>
            View Profile
          </Button>
        </div>

        <div className="about-contact-row">
          <div className="about-contact-main">
            <UserCircleIcon className="about-contact-icon" size={24} />
            <div className="about-contact-text">
              <span className="about-contact-label">LinkedIn</span>
              <button
                type="button"
                className="about-contact-value"
                onClick={() => openExternal(DEVELOPER.linkedin.url)}
              >
                {DEVELOPER.linkedin.label}
              </button>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openExternal(DEVELOPER.linkedin.url)}>
            Connect
          </Button>
        </div>
      </div>

      <section className="about-page-section">
        <h2 className="about-page-section-title">Built With</h2>
        <div className="about-tech-badges">
          {TECH_STACK.map((tech) => (
            <span key={tech} className="about-tech-badge">
              {tech}
            </span>
          ))}
        </div>
      </section>

      <section className="about-page-section">
        <h2 className="about-page-section-title">App Info</h2>
        <div className="about-app-info">
          <div className="about-app-info-row">
            <span>Version</span>
            <strong>{appInfo?.version ?? '...'}</strong>
          </div>
          <div className="about-app-info-row">
            <span>Platform</span>
            <strong>{appInfo?.platform ?? '...'}</strong>
          </div>
          <div className="about-app-info-row about-app-info-row-stack">
            <span>SQLite DB Path</span>
            <code className="about-app-info-path">{appInfo?.dbPath ?? '...'}</code>
          </div>
        </div>
        <Button
          variant="secondary"
          className="about-open-folder-btn"
          disabled={!appInfo}
          onClick={() => {
            if (appInfo) {
              void window.api.shell.openPath(appInfo.userDataPath);
            }
          }}
        >
          Open Data Folder
        </Button>
      </section>

      <div className="about-hire-callout">
        <h2>Need a Custom Solution?</h2>
        <p>
          I develop desktop applications, mobile apps, POS systems, inventory management tools,
          dashboards, and custom software tailored to your business.
        </p>
        <Button onClick={openEmail}>Get in Touch</Button>
      </div>
    </div>
  );
};
