import React, { useState, createContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Visibility as InspectIcon
} from '@mui/icons-material';
import axios from 'axios';
import { saveAs } from 'file-saver';

// Create a context for sharing query results
export const QueryResultsContext = createContext<any>(null);

export default function QueryRunner() {
  const [query, setQuery] = useState('SELECT Id, Name FROM Account LIMIT 10');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalSize, setTotalSize] = useState(0);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [recordLimit, setRecordLimit] = useState(10000);
  const [isRestoredQuery, setIsRestoredQuery] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // First, check if there's a query passed through navigation state
    const navigationState = location.state as any;
    if (navigationState?.loadQuery && navigationState?.source === 'savedQueries') {
      console.log('Loading saved query from navigation state:', navigationState.loadQuery);
      try {
        if (navigationState.loadQuery.query) {
          setQuery(navigationState.loadQuery.query);
          setIsRestoredQuery(true);
          console.log('Saved query loaded successfully from navigation state');
          // Clear the navigation state by replacing the history entry
          window.history.replaceState({}, document.title);
          return; // Don't load current query if we're loading a saved one
        } else {
          console.error('Navigation state loadQuery missing query field:', navigationState.loadQuery);
        }
      } catch (error) {
        console.error('Error processing navigation state:', error);
      }
    }

    // Fallback: Check if there's a query to load from SavedQueries via localStorage
    const loadQuery = localStorage.getItem('loadQuery');
    if (loadQuery) {
      console.log('Loading saved query from localStorage:', loadQuery);
      try {
        const queryData = JSON.parse(loadQuery);
        console.log('Parsed query data:', queryData);
        setQuery(queryData.query);
        localStorage.removeItem('loadQuery'); // Clean up
        setIsRestoredQuery(true);
        console.log('Saved query loaded successfully from localStorage');
        return; // Don't load current query if we're loading a saved one
      } catch (error) {
        console.error('Error parsing saved query:', error);
        localStorage.removeItem('loadQuery'); // Clean up corrupted data
      }
    }

    // Load the last executed query and results when returning to Query Runner
    const currentResults = localStorage.getItem('currentQueryResults');
    const currentColumns = localStorage.getItem('currentQueryColumns');
    
    if (currentResults && currentColumns) {
      try {
        const resultsData = JSON.parse(currentResults);
        const columnsData = JSON.parse(currentColumns);
        
        // Restore the query text
        setQuery(resultsData.query || 'SELECT Id, Name FROM Account LIMIT 10');
        
        // Restore the results and metadata
        setResults(resultsData.data || []);
        setTotalSize(resultsData.totalSize || 0);
        setFetchedCount(resultsData.fetchedCount || 0);
        setIsRestoredQuery(true);
        
        // Recreate columns with render functions
        if (resultsData.data && resultsData.data.length > 0) {
          const recreatedColumns = columnsData.map((col: any) => ({
            ...col,
            renderCell: (params: any) => {
              const value = params.value;
              if (value === null || value === undefined) {
                return <span style={{ color: '#999' }}>null</span>;
              }
              if (typeof value === 'object') {
                return JSON.stringify(value);
              }
              return String(value);
            }
          }));
          setColumns(recreatedColumns);
        }
      } catch (error) {
        console.error('Error restoring query state:', error);
        // Fall back to default query if there's an error
        setQuery('SELECT Id, Name FROM Account LIMIT 10');
      }
    }
  }, [location]);

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a SOQL query');
      return;
    }

    setLoading(true);
    setError('');
    setIsRestoredQuery(false); // Clear restored flag when executing new query

    try {
      console.log(`Executing query with ${recordLimit === 0 ? 'unlimited' : recordLimit} record limit:`, query);
      
      const response = await axios.post('/api/query', { 
        query,
        maxRecords: recordLimit 
      });
      
      console.log('Query response received:', {
        success: response.data.success,
        dataLength: response.data.data?.length,
        totalSize: response.data.totalSize,
        fetchedCount: response.data.fetchedCount
      });
      
      if (response.data.success) {
        const data = response.data.data;
        setResults(data);
        setTotalSize(response.data.totalSize);
        setFetchedCount(response.data.fetchedCount);
        
        // Generate columns from the first record
        if (data.length > 0) {
          const firstRecord = data[0];
          const allKeys = Object.keys(firstRecord).filter(key => key !== 'attributes');
          
          console.log(`Processing ${allKeys.length} columns for DataGrid:`, allKeys);
          
          try {
            const cols: GridColDef[] = allKeys.map(key => ({
              field: key,
              headerName: key,
              width: 200,
              minWidth: 150,
              renderCell: (params) => {
                const value = params.value;
                if (value === null || value === undefined) {
                  return <span style={{ color: '#999' }}>null</span>;
                }
                if (typeof value === 'object') {
                  return JSON.stringify(value);
                }
                return String(value);
              }
            }));
            
            console.log(`Successfully created ${cols.length} column definitions`);
            setColumns(cols);
            
            // Store columns in localStorage as well (columns are usually small)
            const cleanColumns = cols.map(col => ({
              field: col.field,
              headerName: col.headerName,
              width: col.width,
              minWidth: col.minWidth
            }));
            
            try {
              localStorage.setItem('currentQueryColumns', JSON.stringify(cleanColumns));
            } catch (columnStorageError) {
              console.log('Could not store columns in localStorage, but this is not critical.');
            }
            
            // Store query results for Data Inspector sidebar navigation
            // Use smart storage strategy to avoid localStorage quota issues
            const queryResults = {
              data: data,
              query: query,
              totalSize: response.data.totalSize,
              fetchedCount: response.data.fetchedCount,
              timestamp: new Date().toISOString()
            };
            
            try {
              // Calculate approximate size of the data
              const dataSize = JSON.stringify(queryResults).length;
              const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
              
              console.log(`Query results size: ${dataSizeMB}MB (${data.length} records, ${allKeys.length} columns)`);
              
              // Only store in localStorage if data is reasonably small (< 5MB)
              if (dataSize < 5 * 1024 * 1024) {
                localStorage.setItem('currentQueryResults', JSON.stringify(queryResults));
                console.log('Query results stored in localStorage');
              } else {
                // For large datasets, store in sessionStorage or skip localStorage
                console.log(`Dataset too large (${dataSizeMB}MB) for localStorage. Using sessionStorage fallback.`);
                try {
                  sessionStorage.setItem('currentQueryResults', JSON.stringify(queryResults));
                  console.log('Query results stored in sessionStorage');
                } catch (sessionError) {
                  console.log('SessionStorage also full. Skipping automatic storage for sidebar navigation.');
                  console.log('Note: "Inspect Data" button will still work via navigation state.');
                }
              }
            } catch (storageError) {
              console.error('Storage error:', storageError);
              console.log('Skipping automatic storage. "Inspect Data" button will still work via navigation state.');
            }
            
          } catch (columnError) {
            console.error('Error creating column definitions:', columnError);
            const errorMessage = columnError instanceof Error ? columnError.message : String(columnError);
            setError(`Error processing columns: ${errorMessage}. Query returned ${allKeys.length} columns.`);
          }
        }
      } else {
        setError(response.data.error || 'Query failed');
      }
    } catch (err: any) {
      console.error('Query execution error:', err);
      
      let errorMessage = err.response?.data?.error || err.message || 'An error occurred while executing the query';
      
      // Check for specific wide query issues
      if (errorMessage.includes('too many columns') || errorMessage.includes('column limit')) {
        errorMessage += '\n\nTip: Try selecting fewer columns or use SELECT Id, Name, ... instead of SELECT *.';
      } else if (errorMessage.includes('memory') || errorMessage.includes('timeout')) {
        errorMessage += '\n\nTip: Try reducing the record limit or adding WHERE clauses to filter results.';
      } else if (errorMessage.includes('MALFORMED_QUERY')) {
        errorMessage += '\n\nTip: Check your SOQL syntax, especially field names and relationships.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveQuery = () => {
    if (!queryName.trim()) {
      setError('Please enter a name for the query');
      return;
    }

    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    const newQuery = {
      id: Date.now(),
      name: queryName,
      query: query,
      createdAt: new Date().toISOString()
    };

    savedQueries.push(newQuery);
    localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
    
    setSaveDialogOpen(false);
    setQueryName('');
    setError('');
  };

  const exportData = () => {
    if (results.length === 0) {
      setError('No data to export');
      return;
    }

    // Export as CSV
    const headers = columns.map(col => col.field).join(',');
    const rows = results.map(row => 
      columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/,/g, ';'); // Replace commas to avoid CSV issues
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const inspectData = () => {
    // Clean columns data to remove functions (which can't be cloned for navigation state)
    const cleanColumns = columns.map(col => ({
      field: col.field,
      headerName: col.headerName,
      width: col.width,
      flex: col.flex
    }));

    // Pass data through navigation state instead of localStorage to avoid quota issues
    navigate('/inspect', {
      state: {
        data: results,
        columns: cleanColumns,
        query: query,
        totalSize: totalSize,
        fetchedCount: fetchedCount
      }
    });
  };

  return (
    <QueryResultsContext.Provider value={{ results, columns, query, totalSize }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          SOQL Query Runner
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Execute SOQL queries against your Salesforce org
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isRestoredQuery && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setIsRestoredQuery(false)}>
            📋 <strong>Query Loaded:</strong> {results.length > 0 ? 'Showing your last executed query and results.' : 'Saved query loaded and ready to execute.'} 
            You can modify the query and re-execute, or continue working with the current results.
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Query Editor
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SOQL query here..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Record Limit</InputLabel>
              <Select
                value={recordLimit}
                label="Record Limit"
                onChange={(e) => setRecordLimit(Number(e.target.value))}
              >
                <MenuItem value={100}>100 records</MenuItem>
                <MenuItem value={1000}>1,000 records</MenuItem>
                <MenuItem value={5000}>5,000 records</MenuItem>
                <MenuItem value={10000}>10,000 records</MenuItem>
                <MenuItem value={25000}>25,000 records</MenuItem>
                <MenuItem value={50000}>50,000 records (⚠️ Slow)</MenuItem>
                <MenuItem value={0}>Unlimited (⚠️ Risk)</MenuItem>
              </Select>
            </FormControl>
            
            {recordLimit === 0 && (
              <Alert severity="warning" sx={{ flex: 1 }}>
                <strong>Unlimited mode:</strong> Will fetch ALL available records - may take several minutes for large datasets!
                <br />
                💡 <strong>Tip:</strong> Monitor server logs for progress. Use Ctrl+C to stop if needed.
              </Alert>
            )}
            {recordLimit >= 25000 && recordLimit !== 0 && (
              <Alert severity="info" sx={{ flex: 1 }}>
                <strong>Large limit:</strong> May take longer to load
              </Alert>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
              onClick={executeQuery}
              disabled={loading}
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialogOpen(true)}
              disabled={!query.trim()}
            >
              Save Query
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportData}
              disabled={results.length === 0}
            >
              Export Data
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<InspectIcon />}
              onClick={inspectData}
              disabled={results.length === 0}
            >
              Inspect Data
            </Button>
          </Box>
        </Paper>

        {results.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Query Results
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={`${fetchedCount} fetched`} 
                  color="primary" 
                  variant="outlined" 
                />
                {totalSize > fetchedCount && (
                  <Chip 
                    label={`${totalSize} total available`} 
                    color="warning" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </Box>
            
            {totalSize > fetchedCount && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Large Dataset Notice:</strong> Showing first {fetchedCount} records out of {totalSize} total.
                {fetchedCount >= recordLimit && recordLimit > 0 && ` (${recordLimit.toLocaleString()} record limit reached)`}
                <br />
                💡 <strong>Tip:</strong> Increase the record limit above or use WHERE clauses, LIMIT, or ORDER BY to refine your query.
              </Alert>
            )}
            
            {fetchedCount > 10000 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Large Dataset Loaded:</strong> {fetchedCount.toLocaleString()} records successfully loaded!
                <br />
                📊 <strong>Query Results:</strong> All {fetchedCount.toLocaleString()} records are displayed below with virtual scrolling.
                <br />
                🔍 <strong>Data Inspector:</strong> Click "Inspect Data" for detailed analysis of all {fetchedCount.toLocaleString()} records.
                <br />
                💾 <strong>Memory Efficient:</strong> Uses navigation state (no localStorage limits).
              </Alert>
            )}
            
            {fetchedCount === totalSize && fetchedCount > 1000 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Complete Dataset:</strong> All {totalSize.toLocaleString()} available records have been fetched and are displayed below.
                <br />
                ✅ <strong>100% Complete:</strong> No additional records available in Salesforce.
              </Alert>
            )}
            
            <Box sx={{ height: 600, width: '100%', overflow: 'auto' }}>
              <DataGrid
                rows={results.map((row, index) => ({ id: index, ...row }))}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 100 },
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                disableRowSelectionOnClick
                disableColumnResize={false}
                disableVirtualization={false}
                sx={{
                  minWidth: 'max-content',
                  '& .MuiDataGrid-root': {
                    overflow: 'visible',
                  },
                  '& .MuiDataGrid-main': {
                    overflow: 'visible',
                  },
                  '& .MuiDataGrid-virtualScroller': {
                    overflow: 'visible',
                  },
                  '& .MuiDataGrid-cell': {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: 'background.paper',
                  },
                  '& .MuiDataGrid-footerContainer': {
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: 'background.paper',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
            
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary" align="center">
                📊 <strong>Dataset:</strong> {fetchedCount.toLocaleString()} records, {columns.length} columns loaded with pagination (100 rows/page).
                {fetchedCount === totalSize && " ✅ Complete dataset loaded."}
                <br />
                🔄 <strong>Navigation:</strong> Use pagination controls below. Scroll horizontally in the table area for wide datasets.
                <br />
                📏 <strong>Columns:</strong> Fixed width (200px each) prevents compression. Resize columns by dragging headers.
                <br />
                💾 <strong>Persistence:</strong> Query and results are automatically saved. Navigate freely and return anytime!
                {columns.length > 50 && (
                  <>
                    <br />
                    ⚠️ <strong>Wide Query:</strong> {columns.length} columns detected. Use horizontal scrolling and column virtualization for best performance.
                  </>
                )}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Save Query Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>Save Query</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Query Name"
              fullWidth
              variant="outlined"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveQuery} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </QueryResultsContext.Provider>
  );
} 