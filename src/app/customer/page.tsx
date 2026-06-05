'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function CustomerRoot() {
  const router = useRouter();
  useEffect(() => {
    const user = localStorage.getItem('user');
    router.replace(user ? '/customer/dashboard' : '/customer/login');
  }, []);
  return null;
}
