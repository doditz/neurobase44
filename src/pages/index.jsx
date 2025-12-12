import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect only once, not in a loop
    const hasRedirected = sessionStorage.getItem('home_redirected');
    if (!hasRedirected) {
      sessionStorage.setItem('home_redirected', 'true');
      navigate(createPageUrl('Chat'), { replace: true });
    }
  }, [navigate]);

  return null;
}