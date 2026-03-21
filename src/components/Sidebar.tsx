'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { navigation, NavItem } from '@/lib/navigation';

function NavSection({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || item.children?.some(c => pathname === c.href);
  const [open, setOpen] = useState(isActive);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={`sidebar-link ${pathname === item.href ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
      >
        {item.title}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 rounded-md hover:bg-gray-800/50 transition-colors"
      >
        <span className="font-medium">{item.title}</span>
        <ChevronRight
          size={14}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 border-l border-gray-800 pl-2 space-y-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`sidebar-link ${pathname === child.href ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed top-14 bottom-0 z-40 w-64 border-r border-gray-800 bg-gray-950 overflow-y-auto
          transition-transform lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavSection key={item.href} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
}
