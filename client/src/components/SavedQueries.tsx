import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardActions,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as RunIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface SavedQuery {
  id: number;
  name: string;
  query: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  exportSettings?: {
    customFilename?: string;
    exportPath?: string;
    autoExport?: boolean;
    hasSelectedDirectory?: boolean;
  };
}

export default function SavedQueries() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [queryName, setQueryName] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [exportPath, setExportPath] = useState('');
  const [autoExport, setAutoExport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = () => {
    const queries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    setSavedQueries(queries);
  };

  const deleteQuery = (id: number) => {
    const updatedQueries = savedQueries.filter(q => q.id !== id);
    localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    setSavedQueries(updatedQueries);
  };

  const editQuery = (query: SavedQuery) => {
    setSelectedQuery(query);
    setQueryName(query.name);
    setQueryText(query.query);
    setQueryDescription(query.description || '');
    setCustomFilename(query.exportSettings?.customFilename || '');
    setExportPath(query.exportSettings?.exportPath || '');
    setAutoExport(query.exportSettings?.autoExport || false);
    setEditDialogOpen(true);
  };

  const saveEditedQuery = () => {
    if (!selectedQuery || !queryName.trim() || !queryText.trim()) return;

    const exportSettings = (customFilename || exportPath || autoExport) ? {
      customFilename: customFilename || undefined,
      exportPath: exportPath || undefined,
      autoExport: autoExport,
      hasSelectedDirectory: !!exportPath // Indicate that a directory was configured
    } : undefined;

    const updatedQueries = savedQueries.map(q => 
      q.id === selectedQuery.id 
        ? { 
            ...q, 
            name: queryName, 
            query: queryText, 
            description: queryDescription,
            exportSettings 
          }
        : q
    );
    
    localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    setSavedQueries(updatedQueries);
    closeEditDialog();
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedQuery(null);
    setQueryName('');
    setQueryText('');
    setQueryDescription('');
    setCustomFilename('');
    setExportPath('');
    setAutoExport(false);
  };

  const runQuery = (query: SavedQuery) => {
    // Store the query in localStorage and navigate to query runner using state
    console.log('SavedQueries: Running query:', query);
    const queryData = JSON.stringify(query);
    console.log('SavedQueries: Storing in localStorage:', queryData);
    localStorage.setItem('loadQuery', queryData);
    console.log('SavedQueries: Navigating to /query with state');
    navigate('/query', { 
      state: { 
        loadQuery: query,
        source: 'savedQueries' 
      } 
    });
  };

  const createNewQuery = () => {
    navigate('/query');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Saved Queries
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage your saved SOQL queries and export configurations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createNewQuery}
        >
          New Query
        </Button>
      </Box>

      {savedQueries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No saved queries yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Save your frequently used SOQL queries for quick access
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createNewQuery}
          >
            Create Your First Query
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {savedQueries.map((query) => (
            <Card key={query.id} sx={{ minWidth: 350, maxWidth: 400, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {query.name}
                </Typography>
                {query.description && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {query.description}
                  </Typography>
                )}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    backgroundColor: '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                    mb: 2,
                    maxHeight: 100,
                    overflow: 'auto'
                  }}
                >
                  {query.query}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={query.updatedAt ? `Updated ${formatDate(query.updatedAt)}` : formatDate(query.createdAt)} 
                    size="small" 
                    variant="outlined"
                    color={query.updatedAt ? "success" : "default"}
                  />
                  {query.exportSettings?.customFilename && (
                    <Chip 
                      label={`📁 ${query.exportSettings.customFilename}`} 
                      size="small" 
                      color="info"
                      variant="outlined"
                      title="Custom export filename saved"
                    />
                  )}
                  {query.exportSettings?.exportPath && (
                    <Chip 
                      label={`📂 ${query.exportSettings.exportPath}`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                      title="Export folder path saved"
                    />
                  )}
                  {query.exportSettings?.autoExport && (
                    <Chip 
                      label="⚡ Auto Export" 
                      size="small" 
                      color="success"
                      variant="outlined"
                      title="Auto-export enabled"
                    />
                  )}
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => runQuery(query)}
                    color="primary"
                    title="Run Query"
                  >
                    <RunIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => editQuery(query)}
                    title="Edit Query"
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => deleteQuery(query.id)}
                  color="error"
                  title="Delete Query"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Edit Query Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={closeEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Query</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Query Name"
            fullWidth
            variant="outlined"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            variant="outlined"
            value={queryDescription}
            onChange={(e) => setQueryDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="SOQL Query"
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            sx={{ fontFamily: 'monospace', mb: 2 }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Export Settings
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Configure custom export behavior for this query
          </Typography>
          
          <TextField
            margin="dense"
            label="Custom Filename (optional)"
            fullWidth
            variant="outlined"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="e.g., account_export.csv"
            sx={{ mb: 2 }}
            helperText="If specified, exports will use this filename instead of auto-generated names"
          />
          
          <TextField
            margin="dense"
            label="Export Path (optional)"
            fullWidth
            variant="outlined"
            value={exportPath}
            onChange={(e) => setExportPath(e.target.value)}
            placeholder="e.g., C:\\Reports\\Salesforce\\ or /Users/yourname/Reports/"
            sx={{ mb: 2 }}
            helperText="Folder path where files should be saved (if browser supports directory selection)"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={autoExport}
                onChange={(e) => setAutoExport(e.target.checked)}
              />
            }
            label="Auto-export after query execution"
            sx={{ mb: 1 }}
          />
          
          {autoExport && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
              When enabled, query results will automatically download after execution
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button 
            onClick={saveEditedQuery} 
            variant="contained"
            disabled={!queryName.trim() || !queryText.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 