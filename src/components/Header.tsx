'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-xs font-bold">
            OC
          </div>
          <span className="font-semibold text-gray-100 text-sm">
            OpenClaw Help Center
          </span>
        </Link>
      </div>
    </header>
  );
}
