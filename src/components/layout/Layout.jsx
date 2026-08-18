import { Suspense, lazy, useEffect, useState } from 'react';

import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';

import Footer from './Footer';

import MobileBottomNav from './MobileBottomNav';

import WhatsAppButton from './WhatsAppButton';

import ScrollManager from './ScrollManager';
import ScrollReveal from '../ui/ScrollReveal';
import RouteErrorBoundary from '../ui/RouteErrorBoundary';



const LiveChatWidget = lazy(() => import('../ui/LiveChatWidget'));



function DeferredLiveChat() {

  const [ready, setReady] = useState(false);



  useEffect(() => {

    const activate = () => setReady(true);



    if ('requestIdleCallback' in window) {

      const id = window.requestIdleCallback(activate, { timeout: 8000 });

      return () => window.cancelIdleCallback(id);

    }



    const timeout = window.setTimeout(activate, 4000);

    return () => window.clearTimeout(timeout);

  }, []);



  if (!ready) return null;



  return (

    <Suspense fallback={null}>

      <LiveChatWidget />

    </Suspense>

  );

}



export default function Layout() {
  const { pathname, search } = useLocation();

  return (

    <>

      <ScrollManager />
      <ScrollReveal />

      <Header />

      <main className="relative min-h-screen pb-[var(--mobile-bottom-nav-offset)] lg:pb-0">

        <RouteErrorBoundary resetKey={`${pathname}${search}`}>
          <Suspense fallback={null}>

            <Outlet />

          </Suspense>
        </RouteErrorBoundary>

      </main>

      <Footer />

      <MobileBottomNav />

      <WhatsAppButton />

      <DeferredLiveChat />

    </>

  );

}

