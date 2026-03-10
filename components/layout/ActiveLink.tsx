// src/components/layout/ActiveLink.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ActiveLinkProps {
  to: string;
  end?: boolean;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
}

export default function ActiveLink({
  to,
  end = false,
  children,
  className = '',
  activeClassName = '',
  style,
  activeStyle,
}: ActiveLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      href={to}
      className={`${className} ${isActive ? activeClassName : ''}`.trim()}
      style={{ ...style, ...(isActive ? activeStyle : {}) }}
    >
      {children}
    </Link>
  );
}
