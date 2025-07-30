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
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  TableView as TableViewIcon,
  Bookmark as BookmarkIcon,
  Storage as StorageIcon,
  PlayArrow as PlayIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import axios from 'axios';

interface SalesforceObject {
  name: string;
  label: string;
  queryable: boolean;
}

interface SavedQuery {
  name: string;
  query: string;
  createdAt: string;
  exportSettings?: any;
}

interface RecentQuery {
  query: string;
  timestamp: string;
  totalSize?: number;
  fetchedCount?: number;
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

  // Get recent queries from localStorage and sessionStorage
  const getRecentQueries = (): RecentQuery[] => {
    const recentQueries: RecentQuery[] = [];
    
    // Get current query from localStorage
    try {
      const currentResults = localStorage.getItem('currentQueryResults');
      if (currentResults) {
        const data = JSON.parse(currentResults);
        if (data.query) {
          recentQueries.push({
            query: data.query,
            timestamp: data.timestamp || new Date().toISOString(),
            totalSize: data.totalSize,
            fetchedCount: data.fetchedCount
          });
        }
      }
    } catch (error) {
      console.error('Error reading currentQueryResults from localStorage:', error);
    }

    // Get current query from sessionStorage if different
    try {
      const sessionResults = sessionStorage.getItem('currentQueryResults');
      if (sessionResults) {
        const data = JSON.parse(sessionResults);
        if (data.query && !recentQueries.some(q => q.query === data.query)) {
          recentQueries.push({
            query: data.query,
            timestamp: data.timestamp || new Date().toISOString(),
            totalSize: data.totalSize,
            fetchedCount: data.fetchedCount
          });
        }
      }
    } catch (error) {
      console.error('Error reading currentQueryResults from sessionStorage:', error);
    }

    // Get query history if available
    try {
      const queryHistory = localStorage.getItem('queryHistory');
      if (queryHistory) {
        const history = JSON.parse(queryHistory);
        history.forEach((historyItem: RecentQuery) => {
          if (!recentQueries.some(q => q.query === historyItem.query)) {
            recentQueries.push(historyItem);
          }
        });
      }
    } catch (error) {
      console.error('Error reading queryHistory from localStorage:', error);
    }

    // Sort by timestamp (most recent first) and limit to 5
    return recentQueries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  // Run a saved query
  const runSavedQuery = (query: SavedQuery) => {
    console.log('Dashboard: Running saved query:', query);
    const queryData = JSON.stringify(query);
    localStorage.setItem('loadQuery', queryData);
    navigate('/query', { 
      state: { 
        loadQuery: query,
        source: 'dashboard' 
      } 
    });
  };

  // Run a recent query
  const runRecentQuery = (recentQuery: RecentQuery) => {
    console.log('Dashboard: Running recent query:', recentQuery);
    const queryData = {
      name: `Recent Query (${new Date(recentQuery.timestamp).toLocaleString()})`,
      query: recentQuery.query,
      createdAt: recentQuery.timestamp
    };
    const queryDataString = JSON.stringify(queryData);
    localStorage.setItem('loadQuery', queryDataString);
    navigate('/query', { 
      state: { 
        loadQuery: queryData,
        source: 'dashboard' 
      } 
    });
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

  const savedQueries: SavedQuery[] = JSON.parse(localStorage.getItem('savedQueries') || '[]');
  const recentQueries = getRecentQueries();

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

        {/* Available Objects, Recent Queries, and Saved Queries */}
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
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Queries
              </Typography>
              {recentQueries.length === 0 ? (
                <Typography color="textSecondary">
                  No recent queries yet. Start by running some queries!
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {recentQueries.map((query, index) => (
                    <ListItem 
                      key={index} 
                      divider 
                      secondaryAction={
                        <Tooltip title="Run Query">
                          <IconButton 
                            edge="end" 
                            onClick={() => runRecentQuery(query)}
                            color="primary"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemText
                        primary={`${query.query.substring(0, 40)}...`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {new Date(query.timestamp).toLocaleString()}
                            </Typography>
                            {query.totalSize && (
                              <Typography variant="caption" color="textSecondary">
                                {query.fetchedCount?.toLocaleString()}/{query.totalSize?.toLocaleString()} records
                              </Typography>
                            )}
                          </Box>
                        }
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
                  No saved queries yet. Start by saving some queries!
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {savedQueries.slice(0, 5).map((query: SavedQuery, index: number) => (
                    <ListItem 
                      key={index} 
                      divider
                      secondaryAction={
                        <Tooltip title="Run Query">
                          <IconButton 
                            edge="end" 
                            onClick={() => runSavedQuery(query)}
                            color="primary"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemText
                        primary={query.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {`${query.query.substring(0, 40)}...`}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(query.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
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