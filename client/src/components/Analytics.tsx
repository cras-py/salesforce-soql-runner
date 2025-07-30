import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  TextField
} from '@mui/material';

import {
  BarChart as BarChartIcon,
  Timeline as LineIcon,
  ScatterPlot as ScatterIcon,
  PieChart as PieIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Plot from 'react-plotly.js';

interface ChartConfig {
  type: string;
  xField: string;
  yField: string;
  colorField?: string;
  title: string;
  aggregation: string;
}

export default function Analytics() {
  const location = useLocation();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [totalSize, setTotalSize] = useState(0);
  const [fetchedCount, setFetchedCount] = useState(0);
  
  // Chart configuration
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    xField: '',
    yField: '',
    colorField: '',
    title: 'My Chart',
    aggregation: 'count'
  });
  
  const [plotData, setPlotData] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available chart types
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: <BarChartIcon /> },
    { value: 'line', label: 'Line Chart', icon: <LineIcon /> },
    { value: 'scatter', label: 'Scatter Plot', icon: <ScatterIcon /> },
    { value: 'pie', label: 'Pie Chart', icon: <PieIcon /> },
    { value: 'histogram', label: 'Histogram', icon: <BarChartIcon /> },
    { value: 'box', label: 'Box Plot', icon: <AnalyticsIcon /> }
  ];

  // Aggregation functions
  const aggregations = [
    { value: 'count', label: 'Count' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];

  useEffect(() => {
    loadData();
  }, [location.state]);

  const loadData = () => {
    // Try to get data from navigation state first
    if (location.state) {
      const stateData = location.state as any;
      const dataArray = stateData.data || [];
      setData(dataArray);
      setQuery(stateData.query || '');
      setTotalSize(stateData.totalSize || 0);
      setFetchedCount(stateData.fetchedCount || 0);
      
      if (dataArray.length > 0) {
        const fields = Object.keys(dataArray[0]).filter(key => key !== 'id' && key !== 'attributes');
        setColumns(fields);
        
        // Auto-select first text field for X and first number field for Y
        const textField = fields.find(field => typeof dataArray[0][field] === 'string');
        const numberField = fields.find(field => typeof dataArray[0][field] === 'number');
        
        setChartConfig(prev => ({
          ...prev,
          xField: textField || fields[0] || '',
          yField: numberField || fields[1] || ''
        }));
      }
    } else {
      // Check for current query results from localStorage/sessionStorage
      let currentResults = localStorage.getItem('currentQueryResults');
      if (!currentResults) {
        currentResults = sessionStorage.getItem('currentQueryResults');
      }
      
      if (currentResults) {
        try {
          const resultsData = JSON.parse(currentResults);
          const dataArray = resultsData.data || [];
          setData(dataArray);
          setQuery(resultsData.query || '');
          setTotalSize(resultsData.totalSize || 0);
          setFetchedCount(resultsData.fetchedCount || 0);
          
          if (dataArray.length > 0) {
            const fields = Object.keys(dataArray[0]).filter(key => key !== 'id' && key !== 'attributes');
            setColumns(fields);
            
            // Auto-select fields
            const textField = fields.find(field => typeof dataArray[0][field] === 'string');
            const numberField = fields.find(field => typeof dataArray[0][field] === 'number');
            
            setChartConfig(prev => ({
              ...prev,
              xField: textField || fields[0] || '',
              yField: numberField || fields[1] || ''
            }));
          }
        } catch (error) {
          console.error('Error parsing current query results:', error);
        }
      }
    }
  };

  const getFieldType = (fieldName: string): string => {
    if (data.length === 0) return 'unknown';
    const sampleValue = data[0][fieldName];
    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (sampleValue instanceof Date) return 'date';
    return 'text';
  };

  const getFieldsOfType = (type: string): string[] => {
    return columns.filter(field => {
      const fieldType = getFieldType(field);
      if (type === 'categorical') return fieldType === 'text' || fieldType === 'boolean';
      if (type === 'numerical') return fieldType === 'number';
      if (type === 'temporal') return fieldType === 'date';
      return true;
    });
  };

  const generateChart = () => {
    if (!data.length || !chartConfig.xField) return;

    const plotConfig = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d']
    };

    const layout = {
      title: chartConfig.title,
      xaxis: { title: chartConfig.xField },
      yaxis: { title: chartConfig.yField || 'Count' },
      autosize: true,
      height: 450
    };

    let traces: any[] = [];

    if (chartConfig.type === 'pie') {
      // Pie chart
      const grouped: Record<string, number> = {};
      data.forEach(row => {
        const key = String(row[chartConfig.xField] || 'Unknown');
        grouped[key] = (grouped[key] || 0) + 1;
      });

      traces = [{
        type: 'pie',
        labels: Object.keys(grouped),
        values: Object.values(grouped),
        textinfo: 'label+percent',
        textposition: 'outside'
      }];
      
    } else if (chartConfig.type === 'histogram') {
      // Histogram
      traces = [{
        type: 'histogram',
        x: data.map(row => row[chartConfig.xField]),
        nbinsx: 30,
        name: chartConfig.xField
      }];
      
    } else if (chartConfig.type === 'scatter') {
      // Scatter plot
      if (chartConfig.yField) {
        const trace: any = {
          type: 'scatter',
          mode: 'markers',
          x: data.map(row => row[chartConfig.xField]),
          y: data.map(row => row[chartConfig.yField]),
          name: `${chartConfig.xField} vs ${chartConfig.yField}`,
          marker: { size: 8 }
        };

        if (chartConfig.colorField) {
          trace.marker.color = data.map(row => row[chartConfig.colorField!]);
          trace.marker.colorscale = 'Viridis';
          trace.marker.showscale = true;
        }

        traces = [trace];
      }
      
    } else if (chartConfig.type === 'box') {
      // Box plot
      if (chartConfig.yField) {
        const grouped: Record<string, number[]> = {};
        data.forEach(row => {
          const group = String(row[chartConfig.xField] || 'All');
          if (!grouped[group]) grouped[group] = [];
          grouped[group].push(row[chartConfig.yField]);
        });

        traces = Object.keys(grouped).map(group => ({
          type: 'box',
          y: grouped[group],
          name: group,
          boxpoints: 'outliers'
        }));
      }
      
    } else {
      // Bar/Line chart with aggregation
      const grouped: Record<string, number[]> = {};
      
      data.forEach(row => {
        const key = String(row[chartConfig.xField] || 'Unknown');
        if (!grouped[key]) grouped[key] = [];
        if (chartConfig.yField) {
          grouped[key].push(row[chartConfig.yField]);
        } else {
          grouped[key].push(1); // For count
        }
      });

      const processedData: Record<string, number> = {};
      Object.keys(grouped).forEach(key => {
        const values = grouped[key].filter(v => v != null && !isNaN(v));
        switch (chartConfig.aggregation) {
          case 'sum':
            processedData[key] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            processedData[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'min':
            processedData[key] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            processedData[key] = values.length > 0 ? Math.max(...values) : 0;
            break;
          default: // count
            processedData[key] = values.length;
        }
      });

      const trace: any = {
        type: chartConfig.type === 'line' ? 'scatter' : 'bar',
        x: Object.keys(processedData),
        y: Object.values(processedData),
        name: `${chartConfig.aggregation} of ${chartConfig.yField || 'Records'}`
      };

      if (chartConfig.type === 'line') {
        trace.mode = 'lines+markers';
      }

      traces = [trace];
    }

    setPlotData({
      data: traces,
      layout: layout,
      config: plotConfig
    });
  };

  const handleConfigChange = (field: string, value: any) => {
    setChartConfig(prev => ({ ...prev, [field]: value }));
  };

  if (data.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Alert severity="info">
          No data available for analysis. Please run a query first from the Query Runner.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Create interactive charts and visualizations from your query results
      </Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          <strong>Dataset:</strong> {fetchedCount.toLocaleString()} records, {columns.length} fields
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>Query:</strong> {query.substring(0, 100)}{query.length > 100 ? '...' : ''}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Chart Configuration Panel */}
        <Box sx={{ flex: '0 0 400px', minWidth: '350px' }}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Chart Configuration
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartConfig.type}
                label="Chart Type"
                onChange={(e) => handleConfigChange('type', e.target.value)}
              >
                {chartTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>X-Axis Field</InputLabel>
              <Select
                value={chartConfig.xField}
                label="X-Axis Field"
                onChange={(e) => handleConfigChange('xField', e.target.value)}
              >
                {columns.map(field => (
                  <MenuItem key={field} value={field}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {field}
                      <Chip size="small" label={getFieldType(field)} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {['bar', 'line', 'scatter', 'box'].includes(chartConfig.type) && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Y-Axis Field</InputLabel>
                  <Select
                    value={chartConfig.yField}
                    label="Y-Axis Field"
                    onChange={(e) => handleConfigChange('yField', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Count of records</em>
                    </MenuItem>
                    {getFieldsOfType('numerical').map(field => (
                      <MenuItem key={field} value={field}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {field}
                          <Chip size="small" label="number" />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {chartConfig.yField && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Aggregation</InputLabel>
                    <Select
                      value={chartConfig.aggregation}
                      label="Aggregation"
                      onChange={(e) => handleConfigChange('aggregation', e.target.value)}
                    >
                      {aggregations.map(agg => (
                        <MenuItem key={agg.value} value={agg.value}>
                          {agg.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            <TextField
              fullWidth
              label="Chart Title"
              value={chartConfig.title}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                />
              }
              label="Advanced Options"
              sx={{ mb: 2 }}
            />

            {showAdvanced && chartConfig.type === 'scatter' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Color Field (Optional)</InputLabel>
                <Select
                  value={chartConfig.colorField || ''}
                  label="Color Field (Optional)"
                  onChange={(e) => handleConfigChange('colorField', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {getFieldsOfType('numerical').map(field => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              fullWidth
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={generateChart}
              disabled={!chartConfig.xField}
            >
              Generate Chart
            </Button>
          </Paper>
        </Box>

        {/* Chart Display Area */}
        <Box sx={{ flex: '1 1 600px', minWidth: '600px' }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chart Preview
            </Typography>
            
            {!plotData ? (
              <Box sx={{ 
                height: 400, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px dashed #ccc',
                borderRadius: 1
              }}>
                <Typography variant="body1" color="textSecondary">
                  Configure your chart and click "Generate Chart" to visualize your data
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%' }}>
                <Plot
                  data={plotData.data}
                  layout={plotData.layout}
                  config={plotData.config}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler={true}
                />
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
} 