import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Onboarding() {
  const router = useRouter();

  useEffect(() => {
    // Skip onboarding and go directly to login
    router.replace('/(login)');
  }, []);

  return null;
}