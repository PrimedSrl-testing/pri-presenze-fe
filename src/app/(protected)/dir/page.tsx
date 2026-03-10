// src/app/(protected)/dir/page.tsx
'use client';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DirPage from '@/components/pages/DirPage';

export default function DirRoute() {
  const { auth } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (auth.user && auth.user.role !== 'dir') {
      router.replace('/');
    }
  }, [auth.user, router]);

  return <DirPage />;
}
