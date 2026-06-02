import { Navigate } from 'react-router-dom';

// Legacy tenant auth page - redirect to unified auth with tenant signup mode
const TenantAuth = () => <Navigate to="/auth?mode=signup&type=tenant" replace />;

export default TenantAuth;
