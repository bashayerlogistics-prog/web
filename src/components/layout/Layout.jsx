import { Suspense, lazy, useEffect, useState } from 'react';

import { Outlet } from 'react-router-dom';

import Header from './Header';

import Footer from './Footer';

import MobileBottomNav from './MobileBottomNav';

import WhatsAppButton from './WhatsAppButton';

import ScrollManager from './ScrollManager';



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

  return (

    <>

      <ScrollManager />

      <Header />

      <main className="relative min-h-screen pb-[var(--mobile-bottom-nav-offset)] lg:pb-0">

        <Suspense fallback={null}>

          <Outlet />

        </Suspense>

      </main>

      <Footer />

      <MobileBottomNav />

      <WhatsAppButton />

      <DeferredLiveChat />

    </>

  );

}

