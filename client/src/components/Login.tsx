import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved preferences on component mount
  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const loadSavedPreferences = () => {
    try {
      const savedPreferences = localStorage.getItem('loginPreferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        console.log('Loading saved login preferences:', { ...preferences, password: '[HIDDEN]' });
        
        setUsername(preferences.username || '');
        setEnvironment(preferences.environment || 'production');
        setUseCustomDomain(preferences.useCustomDomain || false);
        setCustomDomain(preferences.customDomain || '');
        setRememberMe(true); // If preferences exist, remember me was checked
        setPreferencesLoaded(true);
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
      // Clean up corrupted data
      localStorage.removeItem('loginPreferences');
    }
  };

  const savePreferences = () => {
    if (rememberMe) {
      const preferences = {
        username,
        environment,
        useCustomDomain,
        customDomain,
        savedAt: new Date().toISOString()
      };
      console.log('Saving login preferences:', preferences);
      localStorage.setItem('loginPreferences', JSON.stringify(preferences));
    } else {
      // Remove saved preferences if remember me is unchecked
      localStorage.removeItem('loginPreferences');
      console.log('Removed saved login preferences');
    }
  };

  const clearSavedPreferences = () => {
    localStorage.removeItem('loginPreferences');
    // Reset form to default values
    setUsername('');
    setEnvironment('production');
    setUseCustomDomain(false);
    setCustomDomain('');
    setRememberMe(false);
    setPreferencesLoaded(false);
    console.log('Cleared saved login preferences');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Combine password with security token if provided
      const passwordWithToken = securityToken ? password + securityToken : password;
      
      const success = await login(
        username, 
        passwordWithToken, 
        environment, 
        useCustomDomain ? customDomain : undefined
      );
      
      if (success) {
        // Save preferences on successful login
        savePreferences();
        navigate('/');
      } else {
        setError('Login failed. Please check your credentials and security token.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Salesforce SOQL Runner
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
            Sign in to your Salesforce org
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {preferencesLoaded && !error && (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPreferencesLoaded(false)}>
              💾 <strong>Welcome back!</strong> Your saved login preferences have been loaded.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              fullWidth
              name="securityToken"
              label="Security Token (if required)"
              type="password"
              id="securityToken"
              value={securityToken}
              onChange={(e) => setSecurityToken(e.target.value)}
              helperText="Required when accessing from outside trusted networks. Get from Salesforce: Setup → Reset My Security Token"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="environment-label">Environment</InputLabel>
              <Select
                labelId="environment-label"
                id="environment"
                value={environment}
                label="Environment"
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="sandbox">Sandbox</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={useCustomDomain}
                  onChange={(e) => setUseCustomDomain(e.target.checked)}
                />
              }
              label="Use custom domain"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              }
              label="Remember username and settings"
              sx={{ mt: 1 }}
            />
            
            {rememberMe && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Your username, environment, and custom domain settings will be saved locally. 
                Passwords are never saved.
              </Typography>
            )}

            {useCustomDomain && (
              <TextField
                margin="normal"
                fullWidth
                id="customDomain"
                label="Custom Domain (without .my.salesforce.com)"
                name="customDomain"
                placeholder="mycompany"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                helperText="Enter only the subdomain part (e.g., 'mycompany' for mycompany.my.salesforce.com)"
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            {(rememberMe || localStorage.getItem('loginPreferences')) && (
              <Button
                fullWidth
                variant="text"
                color="secondary"
                onClick={clearSavedPreferences}
                sx={{ mb: 1 }}
                size="small"
              >
                Clear Saved Login Data
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 