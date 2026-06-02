export interface MockAdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  created_at: string;
}

// Mock user data
export const mockAdminUsers: MockAdminUser[] = [
  {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    user_type: 'tenant',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 'user-2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@example.com',
    user_type: 'landlord',
    created_at: '2024-01-12T14:20:00Z'
  },
  {
    id: 'user-3',
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.brown@example.com',
    user_type: 'individual_owner',
    created_at: '2024-01-08T09:15:00Z'
  },
  {
    id: 'user-4',
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.davis@example.com',
    user_type: 'property_manager',
    created_at: '2024-01-05T16:45:00Z'
  },
  {
    id: 'user-5',
    first_name: 'David',
    last_name: 'Wilson',
    email: 'david.wilson@example.com',
    user_type: 'tenant',
    created_at: '2024-01-03T11:30:00Z'
  },
  {
    id: 'user-6',
    first_name: 'Lisa',
    last_name: 'Anderson',
    email: 'lisa.anderson@example.com',
    user_type: 'admin',
    created_at: '2023-12-28T08:20:00Z'
  },
  {
    id: 'user-7',
    first_name: 'Robert',
    last_name: 'Martinez',
    email: 'robert.martinez@example.com',
    user_type: 'landlord',
    created_at: '2023-12-25T13:45:00Z'
  },
  {
    id: 'user-8',
    first_name: 'Jennifer',
    last_name: 'Taylor',
    email: 'jennifer.taylor@example.com',
    user_type: 'tenant',
    created_at: '2023-12-20T10:15:00Z'
  },
  {
    id: 'user-9',
    first_name: 'Christopher',
    last_name: 'Thomas',
    email: 'christopher.thomas@example.com',
    user_type: 'property_manager',
    created_at: '2023-12-18T15:30:00Z'
  },
  {
    id: 'user-10',
    first_name: 'Amanda',
    last_name: 'Garcia',
    email: 'amanda.garcia@example.com',
    user_type: 'individual_owner',
    created_at: '2023-12-15T12:10:00Z'
  },
  {
    id: 'user-11',
    first_name: 'James',
    last_name: 'Rodriguez',
    email: 'james.rodriguez@example.com',
    user_type: 'tenant',
    created_at: '2023-12-12T09:25:00Z'
  },
  {
    id: 'user-12',
    first_name: 'Michelle',
    last_name: 'Lee',
    email: 'michelle.lee@example.com',
    user_type: 'landlord',
    created_at: '2023-12-10T14:40:00Z'
  },
  {
    id: 'user-13',
    first_name: 'Daniel',
    last_name: 'Walker',
    email: 'daniel.walker@example.com',
    user_type: 'tenant',
    created_at: '2023-12-08T11:55:00Z'
  },
  {
    id: 'user-14',
    first_name: 'Jessica',
    last_name: 'Hall',
    email: 'jessica.hall@example.com',
    user_type: 'property_manager',
    created_at: '2023-12-05T16:20:00Z'
  },
  {
    id: 'user-15',
    first_name: 'Matthew',
    last_name: 'Allen',
    email: 'matthew.allen@example.com',
    user_type: 'individual_owner',
    created_at: '2023-12-03T13:35:00Z'
  },
  {
    id: 'user-16',
    first_name: 'Ashley',
    last_name: 'Young',
    email: 'ashley.young@example.com',
    user_type: 'tenant',
    created_at: '2023-12-01T10:50:00Z'
  },
  {
    id: 'user-17',
    first_name: 'Andrew',
    last_name: 'King',
    email: 'andrew.king@example.com',
    user_type: 'landlord',
    created_at: '2023-11-28T15:15:00Z'
  },
  {
    id: 'user-18',
    first_name: 'Stephanie',
    last_name: 'Wright',
    email: 'stephanie.wright@example.com',
    user_type: 'admin',
    created_at: '2023-11-25T12:30:00Z'
  },
  {
    id: 'user-19',
    first_name: 'Kevin',
    last_name: 'Lopez',
    email: 'kevin.lopez@example.com',
    user_type: 'tenant',
    created_at: '2023-11-22T09:45:00Z'
  },
  {
    id: 'user-20',
    first_name: 'Rachel',
    last_name: 'Hill',
    email: 'rachel.hill@example.com',
    user_type: 'property_manager',
    created_at: '2023-11-20T14:00:00Z'
  },
  {
    id: 'user-21',
    first_name: 'Brian',
    last_name: 'Scott',
    email: 'brian.scott@example.com',
    user_type: 'individual_owner',
    created_at: '2023-11-18T11:15:00Z'
  },
  {
    id: 'user-22',
    first_name: 'Nicole',
    last_name: 'Green',
    email: 'nicole.green@example.com',
    user_type: 'tenant',
    created_at: '2023-11-15T16:30:00Z'
  },
  {
    id: 'user-23',
    first_name: 'Tyler',
    last_name: 'Adams',
    email: 'tyler.adams@example.com',
    user_type: 'landlord',
    created_at: '2023-11-12T13:45:00Z'
  },
  {
    id: 'user-24',
    first_name: 'Samantha',
    last_name: 'Baker',
    email: 'samantha.baker@example.com',
    user_type: 'tenant',
    created_at: '2023-11-10T10:00:00Z'
  },
  {
    id: 'user-25',
    first_name: 'Jonathan',
    last_name: 'Nelson',
    email: 'jonathan.nelson@example.com',
    user_type: 'property_manager',
    created_at: '2023-11-08T15:20:00Z'
  }
];

// In-memory points store for mock adjustments
const mockPointsStore: Record<string, number> = {
  'user-1': 1500,
  'user-2': 3200,
  'user-3': 850,
  'user-4': 4100,
  'user-5': 2750,
  'user-6': 0, // Admin with no points
  'user-7': 1900,
  'user-8': 675,
  'user-9': 2400,
  'user-10': 3800,
  // Others default to 0
};

// Mock mode detection
export const isMockMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('useMocks') || 
         localStorage.getItem('openkey-mocks') === 'true';
};

// Get points for a user
export const getMockUserPoints = (userId: string): number => {
  return mockPointsStore[userId] || 0;
};

// Update points for a user
export const updateMockUserPoints = (userId: string, newPoints: number): void => {
  mockPointsStore[userId] = Math.max(0, newPoints);
};

// Search mock users
export const searchMockUsers = (query: string) => {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase().trim();
  return mockAdminUsers
    .filter(user => 
      user.first_name.toLowerCase().includes(searchTerm) ||
      user.last_name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    )
    .map(user => ({
      ...user,
      total_points: getMockUserPoints(user.id)
    }))
    .slice(0, 10); // Limit to 10 results like the real implementation
};
