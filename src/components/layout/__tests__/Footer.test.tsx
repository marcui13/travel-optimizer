import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { I18nProvider } from '../../../i18n/I18nContext';
import { Footer } from '../Footer';

describe('Footer Component', () => {
  it('renders developer name and author attribution', () => {
    const html = renderToString(
      <I18nProvider>
        <Footer />
      </I18nProvider>
    );

    expect(html).toContain('Agustín Marquardt');
    expect(html).toContain('Travel Optimizer');
  });

  it('renders correct GitHub and LinkedIn links with security attributes', () => {
    const html = renderToString(
      <I18nProvider>
        <Footer />
      </I18nProvider>
    );

    const githubUrl = 'https://github.com/marcui13';
    const linkedinUrl = 'https://www.linkedin.com/in/agust%C3%ADn-marquardt-0015611b3/';

    expect(html).toContain(githubUrl);
    expect(html).toContain(linkedinUrl);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('includes accessible labels for social links', () => {
    const html = renderToString(
      <I18nProvider>
        <Footer />
      </I18nProvider>
    );

    expect(html).toContain('aria-label=');
    expect(html).toContain('GitHub');
    expect(html).toContain('LinkedIn');
  });
});
