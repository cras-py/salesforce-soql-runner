import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  Button,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { DataGrid, GridColDef, GridFilterModel } from '@mui/x-data-grid';
import {
  Analytics as AnalyticsIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { saveAs } from 'file-saver';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DataInspector() {
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [query, setQuery] = useState('');
  const [totalSize, setTotalSize] = useState(0);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [statistics, setStatistics] = useState<any>({});
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [storageSource, setStorageSource] = useState('localStorage');

  useEffect(() => {
    // Try to get data from navigation state first (for "Inspect Data" button)
    if (location.state) {
      const stateData = location.state as any;
      setData(stateData.data || []);
      
      // Recreate columns with renderCell functions (since functions can't be serialized)
      const recreatedColumns = (stateData.columns || []).map((col: any) => ({
        ...col,
        width: 200,
        minWidth: 150,
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
      setQuery(stateData.query || '');
      setTotalSize(stateData.totalSize || 0);
      setFetchedCount(stateData.fetchedCount || 0);
      calculateStatistics(stateData.data || []);
    } else {
      // Check for current query results from sidebar navigation
      // Try localStorage first, then sessionStorage as fallback
      let currentResults = localStorage.getItem('currentQueryResults');
      let currentColumns = localStorage.getItem('currentQueryColumns');
      let storageSource = 'localStorage';
      
      if (!currentResults) {
        // Fallback to sessionStorage for large datasets
        currentResults = sessionStorage.getItem('currentQueryResults');
        currentColumns = sessionStorage.getItem('currentQueryColumns');
        storageSource = 'sessionStorage';
      }
      
      if (currentResults && currentColumns) {
        try {
          const resultsData = JSON.parse(currentResults);
          const columnsData = JSON.parse(currentColumns);
          
          console.log(`Loading query results from ${storageSource}`);
          
          setData(resultsData.data || []);
          setQuery(resultsData.query || '');
          setTotalSize(resultsData.totalSize || 0);
          setFetchedCount(resultsData.fetchedCount || 0);
          
          // Recreate columns with renderCell functions
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
          calculateStatistics(resultsData.data || []);
        } catch (error) {
          console.error('Error parsing current query results:', error);
          // Fallback to old localStorage method
          const inspectionData = localStorage.getItem('inspectionData');
          if (inspectionData) {
            try {
              const parsed = JSON.parse(inspectionData);
              setData(parsed.data || []);
              setColumns(parsed.columns || []);
              setQuery(parsed.query || '');
              setTotalSize(parsed.totalSize || 0);
              setFetchedCount(parsed.fetchedCount || 0);
              calculateStatistics(parsed.data || []);
            } catch (error) {
              console.error('Error parsing localStorage data:', error);
            }
          }
        }
      } else {
        // Final fallback to old localStorage method for backward compatibility
        const inspectionData = localStorage.getItem('inspectionData');
        if (inspectionData) {
          try {
            const parsed = JSON.parse(inspectionData);
            setData(parsed.data || []);
            setColumns(parsed.columns || []);
            setQuery(parsed.query || '');
            setTotalSize(parsed.totalSize || 0);
            setFetchedCount(parsed.fetchedCount || 0);
            calculateStatistics(parsed.data || []);
          } catch (error) {
            console.error('Error parsing localStorage data:', error);
          }
        }
      }
    }
    setStorageSource(storageSource);
  }, [location.state]);

  const calculateStatistics = (dataset: any[]) => {
    if (dataset.length === 0) return;

    const stats: any = {};
    const firstRecord = dataset[0];
    
    Object.keys(firstRecord).forEach(field => {
      if (field === 'attributes') return;
      
      const values = dataset.map(row => row[field]).filter(val => val !== null && val !== undefined);
      const nonNullCount = values.length;
      const nullCount = dataset.length - nonNullCount;
      
      stats[field] = {
        field,
        type: typeof values[0],
        totalCount: dataset.length,
        nonNullCount,
        nullCount,
        nullPercentage: ((nullCount / dataset.length) * 100).toFixed(1)
      };

      // For numeric fields
      if (typeof values[0] === 'number') {
        const numericValues = values.filter(val => typeof val === 'number');
        if (numericValues.length > 0) {
          stats[field].min = Math.min(...numericValues);
          stats[field].max = Math.max(...numericValues);
          stats[field].mean = (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2);
          
          // Calculate median
          const sorted = [...numericValues].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          stats[field].median = sorted.length % 2 === 0 
            ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
            : sorted[mid].toFixed(2);
        }
      }

      // For string fields
      if (typeof values[0] === 'string') {
        const uniqueValues = Array.from(new Set(values));
        stats[field].uniqueCount = uniqueValues.length;
        stats[field].duplicateCount = values.length - uniqueValues.length;
        
        // Most common values
        const frequency: any = {};
        values.forEach(val => {
          frequency[val] = (frequency[val] || 0) + 1;
        });
        
        const sortedFreq = Object.entries(frequency)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5);
        
        stats[field].topValues = sortedFreq;
      }
    });

    setStatistics(stats);
  };

  const exportFilteredData = () => {
    // For now, export all data. In a real implementation, you'd apply the current filters
    if (data.length === 0) return;

    const headers = columns.map(col => col.field).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/,/g, ';');
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `filtered_data_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (data.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Data Inspector
        </Typography>
        <Alert severity="info">
          No data to inspect. Please run a query first from the Query Runner.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Inspector
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Analyze and explore your query results
      </Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          <strong>Query:</strong> {query}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>Records:</strong> {fetchedCount} fetched
          {totalSize > fetchedCount && ` / ${totalSize} total available`}
        </Typography>
        {!location.state && query && (
          <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>
            📋 <strong>Current Query Results:</strong> Showing data from your most recent query execution
            {storageSource === 'sessionStorage' && (
              <span style={{ color: '#ff9800' }}>
                {' '}(Large dataset - using session storage)
              </span>
            )}
          </Typography>
        )}
        {totalSize > fetchedCount && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            ⚠️ Only showing first {fetchedCount} records. Total available: {totalSize}
          </Typography>
        )}
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Data View" icon={<FilterIcon />} />
          <Tab label="Statistics" icon={<AnalyticsIcon />} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportFilteredData}
          >
            Export Filtered Data
          </Button>
          <Chip label={`${data.length} rows`} color="primary" variant="outlined" />
        </Box>
        
        <Box sx={{ height: 700, width: '100%', overflow: 'auto' }}>
          <DataGrid
            rows={data.map((row, index) => ({ id: index, ...row }))}
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
            filterModel={filterModel}
            onFilterModelChange={setFilterModel}
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
            📊 <strong>Data Inspector:</strong> {data.length.toLocaleString()} records, {columns.length} columns loaded with pagination and horizontal scrolling.
            <br />
            🔄 <strong>Navigation:</strong> Use pagination controls below. Scroll horizontally in the table area for wide datasets.
            <br />
            📏 <strong>Columns:</strong> Fixed width (200px each) prevents compression. Resize columns by dragging headers.
            {columns.length > 50 && (
              <>
                <br />
                ⚠️ <strong>Wide Query:</strong> {columns.length} columns detected. Use horizontal scrolling and filtering for best performance.
              </>
            )}
          </Typography>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Field Statistics
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.values(statistics).map((stat: any) => (
            <Card key={stat.field} sx={{ minWidth: 300, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {stat.field}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Type: {stat.type}
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Count</TableCell>
                        <TableCell>{stat.totalCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Non-null Count</TableCell>
                        <TableCell>{stat.nonNullCount}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Null Count</TableCell>
                        <TableCell>{stat.nullCount} ({stat.nullPercentage}%)</TableCell>
                      </TableRow>
                      
                      {stat.type === 'number' && (
                        <>
                          <TableRow>
                            <TableCell>Min</TableCell>
                            <TableCell>{stat.min}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Max</TableCell>
                            <TableCell>{stat.max}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Mean</TableCell>
                            <TableCell>{stat.mean}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Median</TableCell>
                            <TableCell>{stat.median}</TableCell>
                          </TableRow>
                        </>
                      )}
                      
                      {stat.type === 'string' && (
                        <>
                          <TableRow>
                            <TableCell>Unique Values</TableCell>
                            <TableCell>{stat.uniqueCount}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Duplicates</TableCell>
                            <TableCell>{stat.duplicateCount}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {stat.topValues && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Top Values:
                    </Typography>
                    {stat.topValues.map(([value, count]: [string, number], index: number) => (
                      <Chip
                        key={index}
                        label={`${value} (${count})`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </TabPanel>
    </Box>
  );
} 