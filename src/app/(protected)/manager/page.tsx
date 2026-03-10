// src/app/(protected)/manager/page.tsx
'use client';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ManagerPage from '@/components/pages/ManagerPage';

export default function ManagerRoute() {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (auth.user && !['mgr', 'hr', 'dir', 'prod'].includes(auth.user.role)) {
      router.replace('/');
    }
  }, [auth.user, router]);

  return <ManagerPage />;
}
