import { AdminNotificationCenter } from '@/components/admin/notifications/AdminNotificationCenter';
import { AdminLayout } from '@/components/admin/AdminLayout';

const NotificationCenterPage = () => {
  return (
    <AdminLayout activeTab="notification-center">
      <div className="container mx-auto p-6">
        <AdminNotificationCenter />
      </div>
    </AdminLayout>
  );
};

export default NotificationCenterPage;
