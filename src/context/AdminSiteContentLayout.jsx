import { SiteContentProvider } from '../context/SiteContentContext';
import AdminShell from '../pages/admin/AdminShell';

export default function AdminSiteContentLayout() {
  return (
    <SiteContentProvider>
      <AdminShell />
    </SiteContentProvider>
  );
}
