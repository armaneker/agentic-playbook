'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import '@/styles/globals.css';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TableOfContents from '@/components/TableOfContents';
import Footer from '@/components/Footer';

const BASE_URL = 'https://agentic-playbook.dev';
const SITE_TITLE = 'Agentic Playbook';
const SITE_DESCRIPTION =
  'Tested guides for setting up and running AI agent systems in production. Covers OpenClaw, Skills, LangSmith Fleet, and more.';

function JsonLd() {
  useEffect(() => {
    const existing = document.getElementById('site-jsonld');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'site-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_TITLE,
      url: BASE_URL,
      description: SITE_DESCRIPTION,
    });
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const canonicalUrl = `${BASE_URL}${pathname}`;

  return (
    <html lang="en">
      <head>
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${BASE_URL}/og.svg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Agentic Playbook — tested guides for AI agent systems" />
        <meta property="og:site_name" content={SITE_TITLE} />

        {/* Twitter / X Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${BASE_URL}/og.svg`} />
      </head>
      <body>
        <JsonLd />
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 flex">
              <article className="flex-1 min-w-0 px-6 py-8 lg:px-10 lg:py-10 max-w-3xl mx-auto prose prose-invert prose-sm lg:prose-base">
                {children}
              </article>
              <TableOfContents />
            </div>
            <Footer />
          </main>
        </div>
      </body>
    </html>
  );
}
