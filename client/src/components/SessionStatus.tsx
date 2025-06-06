import React, { useState, useEffect } from 'react';
import { Chip, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function SessionStatus() {
  const { isAuthenticated } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      try {
        const response = await axios.get('/api/auth-status');
        setSessionInfo(response.data);
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated || !sessionInfo) {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      <Chip
        label={`Session: ${sessionInfo.authenticated ? 'Active' : 'Expired'}`}
        color={sessionInfo.authenticated ? 'success' : 'error'}
        size="small"
        variant="outlined"
      />
    </Box>
  );
} 