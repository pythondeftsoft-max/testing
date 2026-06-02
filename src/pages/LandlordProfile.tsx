import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LandlordProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = (location.state as any) || {};
    navigate('/dashboard?portfolioId=everything', { replace: true, state: { ...state, activeTab: 'Profile' } });
  }, [navigate, location.state]);

  return null;
};

export default LandlordProfilePage;
