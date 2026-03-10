// src/app/(protected)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Shell from '@/components/layout/Shell';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!auth.user) {
      router.replace('/login');
    }
  }, [auth.user, router]);

  if (!auth.user) return null;

  return <Shell>{children}</Shell>;
}
