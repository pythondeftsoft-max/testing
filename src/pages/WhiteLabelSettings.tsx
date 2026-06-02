import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WhiteLabelSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard?portfolioId=everything', { replace: true, state: { activeTab: 'Profile' } });
  }, [navigate]);

  return null;
};

export default WhiteLabelSettingsPage;
