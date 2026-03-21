import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import Callout from '@/components/Callout';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Callout,
    a: ({ href, children, ...props }) => {
      if (href && href.startsWith('/')) {
        return <Link href={href} {...props}>{children}</Link>;
      }
      return <a href={href} {...props}>{children}</a>;
    },
    ...components,
  };
}
