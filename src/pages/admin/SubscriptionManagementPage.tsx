import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminSubscriptionManagement } from '@/components/admin/AdminSubscriptionManagement';

const SubscriptionManagementPage = () => {
  return (
    <AdminLayout activeTab="subscriptions">
      <div className="container mx-auto p-6">
        <AdminSubscriptionManagement />
      </div>
    </AdminLayout>
  );
};

export default SubscriptionManagementPage;
