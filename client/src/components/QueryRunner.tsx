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
  Visibility as InspectIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon
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
  const [saveMode, setSaveMode] = useState<'save' | 'saveAs'>('save');
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [existingQuery, setExistingQuery] = useState<any>(null);
  const [recordLimit, setRecordLimit] = useState(10000);
  const [isRestoredQuery, setIsRestoredQuery] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [customExportFilename, setCustomExportFilename] = useState('');
  const [customExportPath, setCustomExportPath] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState<any>(null);
  const [loadedQuerySettings, setLoadedQuerySettings] = useState<any>(null);
  const [supportsFileSystemAPI, setSupportsFileSystemAPI] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if File System Access API is supported
    const hasDirectoryPicker = 'showDirectoryPicker' in window;
    const hasSaveFilePicker = 'showSaveFilePicker' in window;
    const isSecureContext = window.isSecureContext;
    
    console.log('File System API Detection:', {
      hasDirectoryPicker,
      hasSaveFilePicker,
      isSecureContext,
      userAgent: navigator.userAgent,
      protocol: window.location.protocol
    });
    
    setSupportsFileSystemAPI(hasDirectoryPicker && hasSaveFilePicker && isSecureContext);
    
    // First, check if there's a query passed through navigation state
    const navigationState = location.state as any;
    if (navigationState?.loadQuery && navigationState?.source === 'savedQueries') {
      console.log('Loading saved query from navigation state:', navigationState.loadQuery);
      try {
        if (navigationState.loadQuery.query) {
          setQuery(navigationState.loadQuery.query);
          setLoadedQuerySettings(navigationState.loadQuery);
          
          // Restore export settings
          if (navigationState.loadQuery.exportSettings) {
            const settings = navigationState.loadQuery.exportSettings;
            setCustomExportFilename(settings.customFilename || '');
            setCustomExportPath(settings.exportPath || '');
            console.log('Restored export settings:', settings);
            
            // Note: selectedDirectory cannot be restored across sessions due to browser security
            // The user will need to reselect the folder, but we'll show them what was previously selected
          }
          
          setIsRestoredQuery(true);
          console.log('Saved query and export settings loaded successfully from navigation state');
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
        setLoadedQuerySettings(queryData);
        
        // Restore export settings
        if (queryData.exportSettings) {
          const settings = queryData.exportSettings;
          setCustomExportFilename(settings.customFilename || '');
          setCustomExportPath(settings.exportPath || '');
          console.log('Restored export settings from localStorage:', settings);
        }
        
        localStorage.removeItem('loadQuery'); // Clean up
        setIsRestoredQuery(true);
        console.log('Saved query and export settings loaded successfully from localStorage');
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
          
          // Check for auto-export setting
          if (loadedQuerySettings?.exportSettings?.autoExport) {
            console.log('Auto-export enabled, triggering export...');
            setTimeout(() => {
              const filename = loadedQuerySettings?.exportSettings?.customFilename || `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`;
              if (supportsFileSystemAPI && selectedDirectory) {
                exportToSelectedPath(filename);
              } else {
                exportData(undefined, true);
              }
            }, 1000); // Small delay to let the UI update
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
    
    // Check if query with same name already exists
    const existingQueryIndex = savedQueries.findIndex((q: any) => q.name.toLowerCase() === queryName.toLowerCase());
    const queryExists = existingQueryIndex !== -1;
    
    // If query exists and we're in 'save' mode (not 'saveAs'), ask for confirmation
    if (queryExists && saveMode === 'save') {
      setExistingQuery(savedQueries[existingQueryIndex]);
      setReplaceConfirmOpen(true);
      return;
    }
    
    // If in 'saveAs' mode and query exists, generate unique name
    let finalQueryName = queryName;
    if (saveMode === 'saveAs' && queryExists) {
      let counter = 1;
      while (savedQueries.some((q: any) => q.name.toLowerCase() === `${queryName} (${counter})`.toLowerCase())) {
        counter++;
      }
      finalQueryName = `${queryName} (${counter})`;
    }
    
    performSave(finalQueryName, queryExists ? existingQueryIndex : -1);
  };

  const performSave = (finalQueryName: string, replaceIndex: number = -1) => {
    const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    
    // Capture current export settings
    const currentExportSettings = {
      customFilename: customExportFilename || loadedQuerySettings?.exportSettings?.customFilename || '',
      exportPath: selectedDirectory?.name || customExportPath || loadedQuerySettings?.exportSettings?.exportPath || '',
      autoExport: loadedQuerySettings?.exportSettings?.autoExport || false,
      hasSelectedDirectory: !!selectedDirectory
    };
    
    const newQuery = {
      id: replaceIndex !== -1 ? savedQueries[replaceIndex].id : Date.now(), // Keep original ID if replacing
      name: finalQueryName,
      query: query,
      createdAt: replaceIndex !== -1 ? savedQueries[replaceIndex].createdAt : new Date().toISOString(), // Keep original date if replacing
      updatedAt: replaceIndex !== -1 ? new Date().toISOString() : undefined, // Add updated timestamp if replacing
      exportSettings: (currentExportSettings.customFilename || currentExportSettings.exportPath || currentExportSettings.autoExport) 
        ? currentExportSettings 
        : undefined
    };

    if (replaceIndex !== -1) {
      // Replace existing query
      savedQueries[replaceIndex] = newQuery;
    } else {
      // Add new query
      savedQueries.push(newQuery);
    }
    
    localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
    
    // Show success message
    let successMessage = replaceIndex !== -1 
      ? `Query "${finalQueryName}" updated successfully!`
      : `Query "${finalQueryName}" saved successfully!`;
      
    if (newQuery.exportSettings) {
      const settings = newQuery.exportSettings;
      const exportInfo = [];
      if (settings.customFilename) exportInfo.push(`filename: ${settings.customFilename}`);
      if (settings.exportPath) exportInfo.push(`folder: ${settings.exportPath}`);
      if (settings.autoExport) exportInfo.push('auto-export enabled');
      
      if (exportInfo.length > 0) {
        successMessage += ` Export settings saved: ${exportInfo.join(', ')}.`;
      }
    }
    
    console.log(successMessage);
    setError(''); // Clear any previous errors
    
    // Close dialogs and reset state
    setSaveDialogOpen(false);
    setReplaceConfirmOpen(false);
    setQueryName('');
    setExistingQuery(null);
    setSaveMode('save');
  };

  const exportData = (customFilename?: string, isAutoExport = false) => {
    if (results.length === 0) {
      setError('No data to export');
      return;
    }

    // Generate filename
    let filename = customFilename;
    if (!filename) {
      // Use loaded query settings if available
      filename = loadedQuerySettings?.exportSettings?.customFilename;
    }
    if (!filename) {
      // Default filename
      filename = `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    // Ensure .csv extension
    if (!filename.toLowerCase().endsWith('.csv')) {
      filename += '.csv';
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
    
    console.log(`Exporting data to: ${filename}${isAutoExport ? ' (auto-export)' : ''}`);
    saveAs(blob, filename);
    
    if (!isAutoExport) {
      setExportDialogOpen(false);
    }
  };

  const selectExportDirectory = async () => {
    try {
      if (!supportsFileSystemAPI) {
        setError('Directory selection is not supported in this browser. Please use a modern browser like Chrome or Edge.');
        return Promise.reject('Not supported');
      }

      // @ts-ignore - File System Access API types may not be fully available
      const directoryHandle = await window.showDirectoryPicker();
      setSelectedDirectory(directoryHandle);
      setCustomExportPath(directoryHandle.name);
      console.log('Directory selected:', directoryHandle.name);
      return Promise.resolve(directoryHandle);
    } catch (error) {
      console.log('Directory selection cancelled or failed:', error);
      return Promise.reject(error);
    }
  };

  const exportToSelectedPath = async (filename: string) => {
    try {
      if (!supportsFileSystemAPI) {
        // Fallback to regular download
        exportData(filename, false);
        return;
      }

      // Generate CSV content
      const headers = columns.map(col => col.field).join(',');
      const rows = results.map(row => 
        columns.map(col => {
          const value = row[col.field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/,/g, ';');
        }).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      if (selectedDirectory) {
        // Save to selected directory
        const fileHandle = await selectedDirectory.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        console.log(`File saved to selected directory: ${filename}`);
        setExportDialogOpen(false);
      } else {
        // Use save file picker
        // @ts-ignore
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'CSV files',
            accept: { 'text/csv': ['.csv'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        console.log(`File saved: ${filename}`);
        setExportDialogOpen(false);
      }
    } catch (error) {
      console.log('File save cancelled or failed:', error);
      // Fallback to regular download
      exportData(filename, false);
    }
  };

  const recheckFileSystemSupport = () => {
    const hasDirectoryPicker = 'showDirectoryPicker' in window;
    const hasSaveFilePicker = 'showSaveFilePicker' in window;
    const isSecureContext = window.isSecureContext;
    
    console.log('Rechecking File System API support:', {
      hasDirectoryPicker,
      hasSaveFilePicker,
      isSecureContext
    });
    
    setSupportsFileSystemAPI(hasDirectoryPicker && hasSaveFilePicker && isSecureContext);
    
    if (hasDirectoryPicker && hasSaveFilePicker && isSecureContext) {
      setError('✅ File System API is now available! You can now select folders and save files directly.');
    } else {
      setError('⚠️ File System API is still not available. Please check the troubleshooting steps above.');
    }
  };

  const openSaveDialog = (mode: 'save' | 'saveAs' = 'save') => {
    setSaveMode(mode);
    
    // Pre-populate query name for 'save' mode if it's a loaded query
    if (mode === 'save' && loadedQuerySettings?.name) {
      setQueryName(loadedQuerySettings.name);
    } else {
      setQueryName('');
    }
    
    setSaveDialogOpen(true);
  };

  const openExportDialog = () => {
    // Pre-populate with saved settings if available
    const savedFilename = loadedQuerySettings?.exportSettings?.customFilename || '';
    const savedPath = loadedQuerySettings?.exportSettings?.exportPath || '';
    setCustomExportFilename(savedFilename);
    setCustomExportPath(savedPath);
    setExportDialogOpen(true);
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
            <Box>
              📋 <strong>Query Loaded:</strong> {results.length > 0 ? 'Showing your last executed query and results.' : 'Saved query loaded and ready to execute.'} 
              {loadedQuerySettings?.exportSettings && (
                <Box component="div" sx={{ mt: 1 }}>
                  📁 <strong>Export settings restored:</strong> 
                  {loadedQuerySettings.exportSettings.customFilename && ` Filename: ${loadedQuerySettings.exportSettings.customFilename}`}
                  {loadedQuerySettings.exportSettings.exportPath && ` | Path: ${loadedQuerySettings.exportSettings.exportPath}`}
                  {loadedQuerySettings.exportSettings.autoExport && ' | Auto-export enabled'}
                  
                  {loadedQuerySettings.exportSettings.hasSelectedDirectory && supportsFileSystemAPI && !selectedDirectory && (
                    <Box sx={{ mt: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<FolderIcon />}
                        onClick={selectExportDirectory}
                        color="warning"
                      >
                        📂 Reselect Export Folder ({loadedQuerySettings.exportSettings.exportPath})
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
              <Box sx={{ mt: 1 }}>
                You can modify the query and re-execute, or continue working with the current results.
              </Box>
            </Box>
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
              onClick={() => openSaveDialog('save')}
              disabled={!query.trim()}
            >
              {loadedQuerySettings?.name ? 'Update Query' : 'Save Query'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => openSaveDialog('saveAs')}
              disabled={!query.trim()}
              color="secondary"
            >
              Save Query As...
            </Button>
            
            <Button
              variant="outlined"
              startIcon={selectedDirectory ? <FolderOpenIcon /> : <DownloadIcon />}
              onClick={openExportDialog}
              disabled={results.length === 0}
              color={selectedDirectory ? "success" : "primary"}
            >
              {selectedDirectory ? `Export to ${selectedDirectory.name}` : 'Export Data'}
            </Button>
            
            {selectedDirectory && supportsFileSystemAPI && (
              <Button
                variant="contained"
                startIcon={<FolderOpenIcon />}
                onClick={() => {
                  const filename = loadedQuerySettings?.exportSettings?.customFilename || `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`;
                  exportToSelectedPath(filename);
                }}
                disabled={results.length === 0}
                color="success"
                size="small"
              >
                Quick Save
              </Button>
            )}
            
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
          <DialogTitle>
            {saveMode === 'save' 
              ? (loadedQuerySettings?.name ? 'Update Query' : 'Save Query')
              : 'Save Query As...'
            }
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
              {saveMode === 'save' 
                ? (loadedQuerySettings?.name 
                    ? `Update the existing query "${loadedQuerySettings.name}" or enter a new name to create a copy.`
                    : 'Save this query for future use.')
                : 'Create a new copy of this query with a different name.'
              }
            </Typography>
            
            <TextField
              autoFocus
              margin="dense"
              label="Query Name"
              fullWidth
              variant="outlined"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              sx={{ mt: 2 }}
              placeholder={saveMode === 'saveAs' ? 'Enter new query name...' : 'Enter query name...'}
            />
            
            {saveMode === 'saveAs' && queryName && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                💡 If this name already exists, a number will be added automatically (e.g., "Query Name (2)")
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveQuery} 
              variant="contained"
              disabled={!queryName.trim()}
            >
              {saveMode === 'save' 
                ? (loadedQuerySettings?.name && queryName === loadedQuerySettings.name ? 'Update' : 'Save')
                : 'Save As'
              }
            </Button>
          </DialogActions>
        </Dialog>

        {/* Replace Query Confirmation Dialog */}
        <Dialog open={replaceConfirmOpen} onClose={() => setReplaceConfirmOpen(false)}>
          <DialogTitle>Replace Existing Query?</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              A query named "<strong>{queryName}</strong>" already exists.
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Created: {existingQuery && new Date(existingQuery.createdAt).toLocaleString()}
            </Typography>
            {existingQuery?.updatedAt && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Last updated: {new Date(existingQuery.updatedAt).toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 2 }}>
              Would you like to replace it with the current query?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReplaceConfirmOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => openSaveDialog('saveAs')}
              variant="outlined"
            >
              Save As New
            </Button>
            <Button 
              onClick={() => {
                const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
                const existingIndex = savedQueries.findIndex((q: any) => q.name.toLowerCase() === queryName.toLowerCase());
                performSave(queryName, existingIndex);
              }}
              variant="contained"
              color="warning"
            >
              Replace Existing
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Data Dialog */}
        <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Export Data</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
              Choose your export method and customize settings. 
              {loadedQuerySettings && (
                <Box component="span" color="primary.main">
                  💾 Export settings will be saved with this query for future use.
                </Box>
              )}
            </Typography>
            
            <TextField
              autoFocus
              margin="dense"
              label="Custom Filename"
              fullWidth
              variant="outlined"
              value={customExportFilename}
              onChange={(e) => setCustomExportFilename(e.target.value)}
              placeholder="e.g., my_export.csv"
              sx={{ mt: 2 }}
              helperText="Leave empty to use default timestamp-based filename"
            />

            {/* File System Access API Section */}
            {supportsFileSystemAPI && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📁 Choose Export Location
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Select a folder or let the browser choose the save location.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FolderIcon />}
                    onClick={selectExportDirectory}
                    sx={{ flex: 1 }}
                  >
                    Select Folder
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => setSelectedDirectory(null)}
                    sx={{ flex: 1 }}
                    disabled={!selectedDirectory}
                  >
                    Clear Selection
                  </Button>
                </Box>
                
                {selectedDirectory && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="subtitle2" color="success.dark">
                      📂 Selected Folder: {selectedDirectory.name}
                    </Typography>
                    <Typography variant="caption" color="success.dark">
                      Files will be saved directly to this folder
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Fallback info for unsupported browsers */}
            {!supportsFileSystemAPI && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200' }}>
                <Typography variant="subtitle2" color="warning.dark">
                  ⚠️ Limited File System Access
                </Typography>
                <Typography variant="body2" color="warning.dark" sx={{ mb: 2 }}>
                  Advanced file system features are not available. This could be due to:
                </Typography>
                <Typography variant="body2" color="warning.dark" component="div">
                  <strong>For Edge users:</strong>
                  <br />• Ensure you're using Edge 86+ (Check: edge://settings/help)
                  <br />• Use HTTPS (not HTTP) - required for file system API
                  <br />• Enable "Experimental Web Platform features" in edge://flags
                  <br />• Restart Edge after enabling flags
                  <br /><br />
                  <strong>Alternative:</strong> Files will download to your Downloads folder with custom filenames.
                </Typography>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                    variant="outlined"
                  >
                    {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting Info
                  </Button>
                  <Button 
                    size="small" 
                    onClick={recheckFileSystemSupport}
                    variant="contained"
                    color="primary"
                  >
                    🔄 Recheck Support
                  </Button>
                </Box>
                
                {showTroubleshooting && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.875rem' }}>
                    <Typography variant="caption" component="div">
                      <strong>Debug Information:</strong><br />
                      • Browser: {navigator.userAgent}<br />
                      • Protocol: {window.location.protocol}<br />
                      • Secure Context: {window.isSecureContext ? 'Yes' : 'No'}<br />
                      • showDirectoryPicker: {'showDirectoryPicker' in window ? 'Available' : 'Missing'}<br />
                      • showSaveFilePicker: {'showSaveFilePicker' in window ? 'Available' : 'Missing'}<br />
                      <br />
                      <strong>Quick Fixes:</strong><br />
                      • Try opening: <code>edge://flags/#file-system-access-api</code><br />
                      • Enable "File System Access API" flag<br />
                      • Restart Edge completely<br />
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {loadedQuerySettings?.exportSettings && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📋 Saved Query Export Settings:
                </Typography>
                {loadedQuerySettings.exportSettings.customFilename && (
                  <Typography variant="body2">
                    • Default filename: {loadedQuerySettings.exportSettings.customFilename}
                  </Typography>
                )}
                {loadedQuerySettings.exportSettings.exportPath && (
                  <Typography variant="body2">
                    • Saved path: {loadedQuerySettings.exportSettings.exportPath}
                  </Typography>
                )}
                {loadedQuerySettings.exportSettings.autoExport && (
                  <Typography variant="body2">
                    • Auto-export enabled for this query
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
            {/* Modern File System API Options */}
            {supportsFileSystemAPI && (
              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                {/* Quick Save to Saved Location */}
                {loadedQuerySettings?.exportSettings?.exportPath && (
                  <Button 
                    onClick={async () => {
                      const filename = customExportFilename || loadedQuerySettings?.exportSettings?.customFilename || `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`;
                      
                      if (selectedDirectory) {
                        // Directory already selected, save directly
                        exportToSelectedPath(filename);
                      } else {
                        // Need to reselect the directory first, then save
                        try {
                          console.log(`Reselecting directory: ${loadedQuerySettings.exportSettings.exportPath}`);
                          await selectExportDirectory();
                          // After folder selection, auto-save
                          setTimeout(() => {
                            exportToSelectedPath(filename);
                          }, 500);
                        } catch (error) {
                          console.log('Quick save cancelled - user did not select folder');
                          // User cancelled folder selection, that's OK
                        }
                      }
                    }}
                    variant="contained"
                    startIcon={selectedDirectory ? <FolderOpenIcon /> : <FolderIcon />}
                    color="success"
                    sx={{ flex: 1 }}
                  >
                    {selectedDirectory 
                      ? `⚡ Quick Save to ${selectedDirectory.name}` 
                      : `📂 Select & Save to "${loadedQuerySettings.exportSettings.exportPath}"`
                    }
                  </Button>
                )}
                
                {/* General Save Location */}
                <Button 
                  onClick={() => {
                    const filename = customExportFilename || loadedQuerySettings?.exportSettings?.customFilename || `salesforce_query_results_${new Date().toISOString().split('T')[0]}.csv`;
                    exportToSelectedPath(filename);
                  }}
                  variant="contained"
                  startIcon={<FolderOpenIcon />}
                  sx={{ flex: 1 }}
                  color={loadedQuerySettings?.exportSettings?.exportPath ? "primary" : "primary"}
                >
                  {selectedDirectory ? 'Save to Selected Folder' : 'Choose Save Location'}
                </Button>
              </Box>
            )}
            
            {/* Traditional Options */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
              <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => exportData()} 
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Download to Default Folder
              </Button>
              {customExportFilename.trim() && (
                <Button 
                  onClick={() => exportData(customExportFilename)} 
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                >
                  Download with Custom Name
                </Button>
              )}
            </Box>
          </DialogActions>
        </Dialog>
      </Box>
    </QueryResultsContext.Provider>
  );
} 