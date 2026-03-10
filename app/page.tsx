// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const ROLE_HOME: Record<string, string> = {
  dip: '/me',
  mgr: '/manager',
  hr: '/hr',
  dir: '/dir',
  prod: '/manager',
};

export default function HomePage() {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!auth.user) {
      router.replace('/login');
    } else {
      router.replace(ROLE_HOME[auth.user.role] ?? '/login');
    }
  }, [auth.user, router]);

  return null;
}
