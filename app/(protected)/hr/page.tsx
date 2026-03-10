// src/app/(protected)/hr/page.tsx
'use client';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import HRPage from '@/components/pages/HRPage';

export default function HRRoute() {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (auth.user && auth.user.role !== 'hr') {
      router.replace('/');
    }
  }, [auth.user, router]);

  return <HRPage />;
}
