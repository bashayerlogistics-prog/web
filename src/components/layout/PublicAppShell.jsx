import { CartProvider } from '../../context/CartContext';
import { SiteContentProvider } from '../../context/SiteContentContext';
import CustomerAuthGate from '../../context/CustomerAuthGate';
import Layout from './Layout';

export default function PublicAppShell() {
  return (
    <CustomerAuthGate>
      <CartProvider>
        <SiteContentProvider>
          <Layout />
        </SiteContentProvider>
      </CartProvider>
    </CustomerAuthGate>
  );
}
