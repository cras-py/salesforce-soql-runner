import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  TableView as TableViewIcon,
  Bookmark as BookmarkIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import axios from 'axios';

interface SalesforceObject {
  name: string;
  label: string;
  queryable: boolean;
}

export default function Dashboard() {
  const [objects, setObjects] = useState<SalesforceObject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    try {
      const response = await axios.get('/api/objects');
      if (response.data.success) {
        setObjects(response.data.data.slice(0, 10)); // Show first 10 objects
      }
    } catch (error) {
      console.error('Failed to fetch objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Run SOQL Query',
      description: 'Execute custom SOQL queries against your Salesforce org',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/query'),
      color: '#1976d2'
    },
    {
      title: 'Inspect Data',
      description: 'Browse and analyze your query results with advanced filtering',
      icon: <TableViewIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/inspect'),
      color: '#388e3c'
    },
    {
      title: 'Saved Queries',
      description: 'Access your saved queries and export configurations',
      icon: <BookmarkIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/saved'),
      color: '#f57c00'
    }
  ];

  const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Welcome to your Salesforce SOQL Runner
      </Typography>

      <Box sx={{ mt: 3 }}>
        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
          {quickActions.map((action, index) => (
            <Box key={index} sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ color: action.color, mb: 2 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {action.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={action.action}
                    sx={{ backgroundColor: action.color }}
                  >
                    Get Started
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Available Objects and Recent Queries */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Available Objects
              </Typography>
              {loading ? (
                <Typography>Loading objects...</Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {objects.map((obj) => (
                    <ListItem key={obj.name} divider>
                      <ListItemText
                        primary={obj.label}
                        secondary={obj.name}
                      />
                      <Chip
                        label="Queryable"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                <BookmarkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Saved Queries
              </Typography>
              {savedQueries.length === 0 ? (
                <Typography color="textSecondary">
                  No saved queries yet. Start by running some queries!
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {savedQueries.slice(0, 5).map((query: any, index: number) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={query.name}
                        secondary={`${query.query.substring(0, 50)}...`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 