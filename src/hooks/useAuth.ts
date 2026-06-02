// Re-export from centralized AuthProvider for backwards compatibility
// This file exists to prevent breaking existing imports
// All new code should import from '@/providers/AuthProvider' directly

export { useAuth } from '@/providers/AuthProvider';
