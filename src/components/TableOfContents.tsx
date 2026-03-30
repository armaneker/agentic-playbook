'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Re-query on each navigation — App Router layouts persist between routes
    setActiveId('');
    const elements = Array.from(
      document.querySelectorAll('article h2, article h3')
    );
    const items = elements.map((el) => ({
      id: el.id,
      text: el.textContent || '',
      level: el.tagName === 'H2' ? 2 : 3,
    }));
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <div className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          On this page
        </p>
        <ul className="space-y-1.5 text-sm border-l border-gray-800">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={`block py-0.5 transition-colors ${
                  h.level === 3 ? 'pl-6' : 'pl-3'
                } ${
                  activeId === h.id
                    ? 'text-brand-400 border-l-2 border-brand-400 -ml-px'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
