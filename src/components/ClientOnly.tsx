import { useEffect, useState, PropsWithChildren } from 'react';

export default function ClientOnly({ children, fallback = null }: PropsWithChildren & { fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Only render on client-side after mount
  if (!mounted) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}