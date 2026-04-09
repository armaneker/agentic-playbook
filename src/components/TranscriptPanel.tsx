'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { pathnameToSlug } from '@/lib/slug';

export default function TranscriptPanel() {
  const pathname = usePathname();
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slug = pathnameToSlug(pathname);

  // Check if transcript exists on mount / pathname change
  useEffect(() => {
    setOpen(false);
    setContent(null);
    setAvailable(false);

    fetch(`/transcripts/${slug}.md`, { method: 'HEAD' })
      .then((res) => setAvailable(res.ok))
      .catch(() => setAvailable(false));
  }, [slug]);

  const handleToggle = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }

    // First open — fetch content
    if (!content) {
      setLoading(true);
      try {
        const res = await fetch(`/transcripts/${slug}.md`);
        if (res.ok) {
          setContent(await res.text());
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }

    setOpen(true);
  }, [open, content, slug]);

  if (!available) return null;

  return (
    <div className="not-prose mb-8">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
      >
        <FileText size={13} />
        {open ? 'Hide transcript' : 'Show transcript'}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900/30 p-5 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Loading transcript...</p>
          ) : content ? (
            <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-line">
              {content}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Transcript unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}
