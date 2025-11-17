import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Area } from 'recharts';
import { transformDataForDataset, getAvailableDatasets, getDatasetInfo, getAdsorbateBreakdown, getDatasetMlipAdsorbateBreakdown } from './utils/dataTransform';
import colorSchemeTeal, { colorSchemeBlue, colorSchemePurple, colorSchemeGreen } from './utils/colorSchemes';

/**
 * CatBench Leaderboard - Modern Color Palette
 * 
 * Primary Colors:
 * - Teal (#0d9488): Main brand color, buttons, headers
 * - Cyan (#06b6d4): Gradient accent, secondary actions
 * 
 * Accent Colors:
 * - Teal Variants (#14b8a6, #0891b2): Success, performance metrics
 * - Amber (#f59e0b): Highlights, Pareto frontier
 * 
 * Neutral Colors:
 * - Gray 50 (#fafafa): Page background
 * - Gray 100 (#f4f4f5): Card backgrounds
 * - Gray 300 (#d4d4d8): Borders
 * - Gray 600 (#52525b): Secondary text
 * - Gray 900 (#18181b): Primary text
 * 
 * Ranking Colors:
 * - Gold (#fbbf24): 1st place
 * - Silver (#94a3b8): 2nd place
 * - Bronze (#fb923c): 3rd place
 */

const CatBenchLeaderboard = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [sortColumn, setSortColumn] = useState('maeNormal');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedModel, setSelectedModel] = useState(null);
  const [colorScheme, setColorScheme] = useState(colorSchemeTeal); // color palette state
  const [showAdsorbateDetails, setShowAdsorbateDetails] = useState(false); // whether to show adsorbate details
  const [showDatasetDetails, setShowDatasetDetails] = useState(false); // whether to show dataset details
  const [selectedMlipTab, setSelectedMlipTab] = useState(null); // selected MLIP tab
  const [tabTransition, setTabTransition] = useState(false); // tab transition animation state
  const [hoveredModel, setHoveredModel] = useState(null); // hovered model
  const [searchQuery, setSearchQuery] = useState(''); // model search query
  const [datasetSearchQuery, setDatasetSearchQuery] = useState(''); // dataset search query

  // derive list of available datasets
  const allAvailableDatasets = useMemo(() => {
    if (!data) return [];
    return getAvailableDatasets(data);
  }, [data]);

  // dataset list filtered by search
  const availableDatasets = useMemo(() => {
    if (!datasetSearchQuery.trim()) return allAvailableDatasets;
    const query = datasetSearchQuery.toLowerCase();
    return allAvailableDatasets.filter(dataset => 
      dataset.toLowerCase().includes(query)
    );
  }, [allAvailableDatasets, datasetSearchQuery]);

  // initialize default dataset when the datasets tab becomes active
  React.useEffect(() => {
    if (activeTab === 'datasets' && availableDatasets.length > 0 && !selectedDataset) {
      // prefer MamunHigh2019 or FG2023, otherwise use the first entry
      const preferred = availableDatasets.find(d => d === 'MamunHigh2019' || d === 'FG2023');
      setSelectedDataset(preferred || availableDatasets[0]);
    }
  }, [activeTab, availableDatasets, selectedDataset]);

  // transform data for the currently selected dataset
  const currentData = useMemo(() => {
    if (!data || !selectedDataset) return [];
    return transformDataForDataset(data, selectedDataset);
  }, [data, selectedDataset]);

  // fetch metadata for the selected dataset
  const datasetInfo = useMemo(() => {
    if (!data || !selectedDataset) return null;
    return getDatasetInfo(data, selectedDataset);
  }, [data, selectedDataset]);

  // filter current dataset by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return currentData;
    const query = searchQuery.toLowerCase();
    return currentData.filter(model => 
      model.model.toLowerCase().includes(query)
    );
  }, [currentData, searchQuery]);

  // apply sorting to the filtered data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getParetoFrontier = (data, xKey, yKey, minimize = [true, false]) => {
    const points = data
      .filter(d => d[xKey] !== null && d[xKey] !== undefined && d[yKey] !== null && d[yKey] !== undefined)
      .map(d => ({ ...d, x: d[xKey], y: d[yKey] }));
    
    // same approach as generate_bc.py: compare every point to find Pareto-optimal ones
    const paretoIndices = [];
    
    for (let i = 0; i < points.length; i++) {
      let isPareto = true;
      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          if (minimize[0] && minimize[1]) {
            // both axes minimized: smaller x and y are preferred
            if (points[j].x <= points[i].x && points[j].y <= points[i].y &&
                (points[j].x < points[i].x || points[j].y < points[i].y)) {
              isPareto = false;
              break;
            }
          } else if (minimize[0] && !minimize[1]) {
            // minimize x while maximizing y: prefer smaller x and larger y
            if (points[j].x <= points[i].x && points[j].y >= points[i].y &&
                (points[j].x < points[i].x || points[j].y > points[i].y)) {
              isPareto = false;
              break;
            }
          }
        }
      }
      if (isPareto) {
        paretoIndices.push(i);
      }
    }
    
    // sort by x-axis values
    return paretoIndices
      .map(i => points[i])
      .sort((a, b) => a.x - b.x);
  };

  // build a step-wise line that connects the Pareto frontier
  const getParetoLineData = (paretoData, xKey, yKey) => {
    if (paretoData.length < 2) return [];
    
    const sorted = [...paretoData].sort((a, b) => a[xKey] - b[xKey]);
    const lineData = [];
    
    // seed with the first point
    lineData.push({ [xKey]: sorted[0][xKey], [yKey]: sorted[0][yKey] });
    
    // connect each consecutive pair using the generate_bc.py step pattern
    for (let i = 0; i < sorted.length - 1; i++) {
      // horizontal segment: (x1, y1) -> (x2, y1)
      lineData.push({ [xKey]: sorted[i][xKey], [yKey]: sorted[i][yKey] });
      lineData.push({ [xKey]: sorted[i + 1][xKey], [yKey]: sorted[i][yKey] });
      // vertical segment: (x2, y1) -> (x2, y2)
      lineData.push({ [xKey]: sorted[i + 1][xKey], [yKey]: sorted[i][yKey] });
      lineData.push({ [xKey]: sorted[i + 1][xKey], [yKey]: sorted[i + 1][yKey] });
    }
    
    return lineData;
  };

  // generate area polygons for shading the Pareto frontier (mirrors generate_bc.py)
  const getParetoAreaData = (paretoData, xKey, yKey, allData, maxX, maxY, isMinimizeY = true) => {
    if (paretoData.length < 1) return [];
    
    const sorted = [...paretoData].sort((a, b) => a[xKey] - b[xKey]);
    const areaData = [];
    
    const minX = Math.min(...allData.map(d => d[xKey]));
    const maxXExtended = maxX * 1.15;
    
    if (isMinimizeY) {
      // accuracy vs efficiency: shade the region above the frontier
      // fill_between([min_time] + pareto_x + [max*1.15], [pareto_y[0]] + pareto_y + [pareto_y[-1]], max*1.1)
      const topY = maxY * 1.1;
      
      // lower boundary: minX -> Pareto points -> maxX * 1.15
      areaData.push({ [xKey]: minX, [yKey]: sorted[0][yKey] });
      sorted.forEach(point => {
        areaData.push({ [xKey]: point[xKey], [yKey]: point[yKey] });
      });
      areaData.push({ [xKey]: maxXExtended, [yKey]: sorted[sorted.length - 1][yKey] });
      
      // upper boundary: maxX * 1.15 -> minX
      areaData.push({ [xKey]: maxXExtended, [yKey]: topY });
      areaData.push({ [xKey]: minX, [yKey]: topY });
    } else {
      // robustness vs efficiency: shade the region beneath the frontier (starting at y=0)
      // fill_between([min_time] + pareto_x + [max*1.15], 0, [pareto_y[0]] + pareto_y + [pareto_y[-1]])
      const bottomY = 0;
      
      // upper boundary: minX -> Pareto points -> maxX * 1.15
      areaData.push({ [xKey]: minX, [yKey]: sorted[0][yKey] });
      sorted.forEach(point => {
        areaData.push({ [xKey]: point[xKey], [yKey]: point[yKey] });
      });
      areaData.push({ [xKey]: maxXExtended, [yKey]: sorted[sorted.length - 1][yKey] });
      
      // lower boundary: maxX * 1.15 -> minX at y=0
      areaData.push({ [xKey]: maxXExtended, [yKey]: bottomY });
      areaData.push({ [xKey]: minX, [yKey]: bottomY });
    }
    
    return areaData;
  };

  const paretoAccuracyEfficiency = useMemo(() => 
    getParetoFrontier(currentData, 'timePerStep', 'maeNormal', [true, true]),
    [currentData]
  );
  const paretoRobustnessEfficiency = useMemo(() => 
    getParetoFrontier(currentData, 'timePerStep', 'normalRate', [true, false]),
    [currentData]
  );
  
  // derived line data for each Pareto frontier
  const paretoAccuracyLineData = useMemo(() => 
    getParetoLineData(paretoAccuracyEfficiency, 'timePerStep', 'maeNormal'),
    [paretoAccuracyEfficiency]
  );
  const paretoRobustnessLineData = useMemo(() => 
    getParetoLineData(paretoRobustnessEfficiency, 'timePerStep', 'normalRate'),
    [paretoRobustnessEfficiency]
  );
  
  // derived area data for shading the frontier
  const paretoAccuracyAreaData = useMemo(() => {
    if (paretoAccuracyEfficiency.length === 0) return [];
    const accuracyData = currentData.filter(d => d.maeNormal !== null && d.maeNormal !== undefined && d.timePerStep !== null && d.timePerStep !== undefined);
    const timeValues = accuracyData.map(d => d.timePerStep);
    const maeValues = accuracyData.map(d => d.maeNormal);
    const maxTime = Math.max(...timeValues);
    const maxMae = Math.max(...maeValues);
    return getParetoAreaData(paretoAccuracyEfficiency, 'timePerStep', 'maeNormal', accuracyData, maxTime, maxMae, true);
  }, [paretoAccuracyEfficiency, currentData]);
  
  const paretoRobustnessAreaData = useMemo(() => {
    if (paretoRobustnessEfficiency.length === 0) return [];
    const robustnessData = currentData.filter(d => d.normalRate !== null && d.normalRate !== undefined && d.timePerStep !== null && d.timePerStep !== undefined);
    const timeValues = robustnessData.map(d => d.timePerStep);
    const rateValues = robustnessData.map(d => d.normalRate);
    const maxTime = Math.max(...timeValues);
    const maxRate = Math.max(...rateValues);
    return getParetoAreaData(paretoRobustnessEfficiency, 'timePerStep', 'normalRate', robustnessData, maxTime, maxRate, false);
  }, [paretoRobustnessEfficiency, currentData]);

  if (!data) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: "'Inter', sans-serif",
        color: '#52525b'
      }}>
        Unable to load data.
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#fafafa'
    }}>
      {/* Add Google Fonts */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        `}
      </style>

      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
        color: 'white',
        padding: '32px 48px',
        borderRadius: '16px',
        marginBottom: '24px',
        boxShadow: '0 20px 25px -5px rgba(13, 148, 136, 0.15), 0 10px 10px -5px rgba(6, 182, 212, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top bar with Title and GitHub */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            {/* Title */}
            <h1 style={{ 
              margin: '0', 
              fontSize: '2.5em', 
              fontWeight: '800',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(to right, #ffffff, #f0f0ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              CatBench Leaderboard
            </h1>

            {/* GitHub Link */}
            <a 
              href="https://github.com/JinukMoon/CatBench" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.3s',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Repository</span>
            </a>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
            marginTop: '16px'
          }}>
            {['overview', 'datasets', 'documentation'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (activeTab === tab) return; // ignore clicks on the already active tab
                  setTabTransition(true);
                  setSearchQuery(''); // reset search when switching tabs
                  setDatasetSearchQuery(''); // reset dataset search when switching tabs
                  setTimeout(() => {
                    setActiveTab(tab);
                    setTimeout(() => {
                      setTabTransition(false);
                    }, 100);
                  }, 200);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '3px solid white' : '3px solid transparent',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: activeTab === tab ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'capitalize',
                  fontFamily: 'inherit',
                  marginBottom: '-2px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {tab === 'overview' ? 'Overview' : tab === 'datasets' ? 'Datasets' : 'Documentation'}
                {activeTab === tab && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-3px',
                    left: '0',
                    right: '0',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, white, transparent)',
                    animation: 'slideIn 0.3s ease-out'
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && !tabTransition && (
          <div style={{
          animation: 'fadeIn 0.3s ease-in',
          opacity: 1
        }}>
          {/* Logo and Podcast Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'center',
            marginBottom: '48px',
            padding: '40px'
          }}>
            {/* Logo */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
          }}>
            <img 
                src={`${import.meta.env.BASE_URL}CatBench_logo.png`}
              alt="CatBench Logo" 
              style={{ 
                height: '400px',
                  width: 'auto',
                maxWidth: '100%',
                  objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))'
              }} 
            />
            </div>
            
            {/* Podcasts */}
            <div style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e4e4e7'
            }}>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '24px', 
                color: '#18181b', 
                fontWeight: '700', 
                fontSize: '1.5em',
                textAlign: 'center'
              }}>
                Overview
              </h3>
              
              {/* Short Podcast */}
              <div style={{
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid #e4e4e7'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎙️</span>
                  <h4 style={{ 
                    margin: 0, 
                    color: '#18181b', 
                    fontWeight: '600', 
                    fontSize: '1.1em' 
                  }}>
                    Short Version
                  </h4>
                </div>
                <p style={{ 
                  margin: '0 0 12px 32px', 
                  color: '#52525b', 
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  A concise introduction to CatBench framework, covering key features and applications.
                </p>
                <audio 
                  controls 
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px'
                  }}
                >
                  <source src={`${import.meta.env.BASE_URL}podcasts/Podcast_Short.m4a`} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              </div>
              
              {/* Long Podcast */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎧</span>
                  <h4 style={{ 
                    margin: 0, 
                    color: '#18181b', 
                    fontWeight: '600', 
                    fontSize: '1.1em' 
                  }}>
                    Long Version
                  </h4>
                </div>
                <p style={{ 
                  margin: '0 0 12px 32px', 
                  color: '#52525b', 
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  An in-depth exploration of CatBench, including detailed methodologies and comprehensive analysis capabilities.
                </p>
                <audio 
                  controls 
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px'
                  }}
                >
                  <source src={`${import.meta.env.BASE_URL}podcasts/Podcast_Long.m4a`} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>

          {/* Overview Content */}
          <div style={{
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f4f4f5'
          }}>
            <h2 style={{ 
              color: '#18181b', 
              fontWeight: '700', 
              fontSize: '2em',
              marginTop: 0,
              marginBottom: '24px'
            }}>
              About CatBench
            </h2>
            
            <div style={{ 
              color: '#52525b', 
              fontSize: '16px', 
              lineHeight: '1.8',
              marginBottom: '32px'
            }}>
              <p style={{ marginBottom: '20px' }}>
                CatBench is a comprehensive benchmarking platform for Machine Learning Interatomic Potentials (MLIPs) 
                in heterogeneous catalysis. Our platform evaluates MLIPs across diverse catalytic systems, providing 
                detailed performance metrics and comparative analyses.
              </p>
              
              <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.3em', marginTop: '32px', marginBottom: '16px' }}>
                Key Features
              </h3>
              <ul style={{ paddingLeft: '24px', marginBottom: '20px' }}>
                <li style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#18181b' }}>Comprehensive Evaluation:</strong> Test MLIPs across multiple 
                  datasets covering various catalytic reactions and surface systems
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#18181b' }}>Performance Metrics:</strong> Detailed analysis including 
                  energy accuracy (MAE), structural accuracy (ADwT), and computational efficiency
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#18181b' }}>Robustness Assessment:</strong> Evaluate model reliability 
                  through normal rate analysis and anomaly detection
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#18181b' }}>Interactive Visualization:</strong> Explore results through 
                  interactive charts and Pareto frontier analysis
                </li>
              </ul>

              <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.3em', marginTop: '32px', marginBottom: '16px' }}>
                Statistics
              </h3>
              {data && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginTop: '24px'
                }}>
                  <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: '#6b21a8', marginBottom: '8px' }}>
                      {data.metadata?.num_mlips || '-'}
                    </div>
                    <div style={{ color: '#52525b', fontWeight: '600' }}>MLIPs Evaluated</div>
                  </div>
                  <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fef08a 100%)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2.5em', fontWeight: '800', color: '#92400e', marginBottom: '8px' }}>
                      {data.metadata?.num_datasets || '-'}
                    </div>
                    <div style={{ color: '#52525b', fontWeight: '600' }}>Datasets</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'datasets' && !tabTransition && (
        <div style={{
          animation: 'fadeIn 0.3s ease-in',
          opacity: 1
        }}>
          {/* Dataset Selector */}
          {availableDatasets.length > 0 && (
            <div style={{ 
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f4f4f5'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <h3 style={{ margin: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em' }}>
                  Select Dataset
                </h3>
                {selectedDataset && (
                  <button
                    onClick={() => {
                      setShowDatasetDetails(!showDatasetDetails);
                      if (!showDatasetDetails) {
                        setSelectedMlipTab(null);
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: showDatasetDetails ? '#0891b2' : '#0d9488',
                      color: 'white',
                      fontWeight: '600',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0891b2';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(8, 145, 178, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = showDatasetDetails ? '#0891b2' : '#0d9488';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(13, 148, 136, 0.2)';
                    }}
                  >
                    {showDatasetDetails ? 'Hide Details' : 'View Details'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {availableDatasets.map((datasetName) => {
                  const info = getDatasetInfo(data, datasetName);
                  const isSelected = selectedDataset === datasetName;
                  return (
                    <button
                      key={datasetName}
                      onClick={() => {
                        setSelectedDataset(datasetName);
                        setShowDatasetDetails(false);
                        setSelectedMlipTab(null);
                      }}
                      style={{
                        padding: '16px 28px',
                        fontSize: '16px',
                        border: isSelected ? '2px solid #0d9488' : '2px solid transparent',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#0d9488' : 'white',
                        color: isSelected ? 'white' : '#52525b',
                        fontWeight: '600',
                        transition: 'all 0.3s',
                        boxShadow: isSelected 
                          ? '0 8px 16px rgba(13, 148, 136, 0.25)' 
                          : '0 1px 3px rgba(0, 0, 0, 0.1)',
                        fontFamily: 'inherit',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e4e4e7';
                          e.currentTarget.style.backgroundColor = '#fafafa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700' }}>{datasetName}</span>
                        <a
                          href={`https://www.catalysis-hub.org/publications/${datasetName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                          }}
                          title="View on Catalysis Hub"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      </div>
                      {info && info.num_structures && (
                        <div style={{ fontSize: '13px', marginTop: '6px', opacity: 0.8, fontWeight: '500' }}>
                          {info.num_structures.toLocaleString()} structures
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

      {/* Dataset Details Section - compact comparison summary */}
          {showDatasetDetails && selectedDataset && currentData.length > 0 && (
        <div style={{ 
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #f4f4f5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Complete Dataset Summary: {selectedDataset}
              <a
                href={`https://www.catalysis-hub.org/publications/${selectedDataset}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                  marginLeft: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
                title="View on Catalysis Hub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </h3>
            <p style={{ margin: 0, color: '#71717a', fontSize: '13px' }}>
              Click "View" button in the table above to see detailed adsorbate breakdown for each MLIP
            </p>
          </div>
          
          {/* All MLIPs Comparison Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e4e4e7' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#18181b' }}>MLIP</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>MAE_total (eV)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b', backgroundColor: '#faf5ff' }}>MAE_normal (eV)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Normal Rate (%)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>ADwT (%)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Time/Step (s)</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((model, idx) => (
                  <tr 
                    key={model.model}
                    style={{ 
                      borderBottom: '1px solid #f4f4f5',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // mimic clicking the model's view button
                      setSelectedModel(selectedModel === model.model ? null : model.model);
                      // scroll the page to the selected model details
                      setTimeout(() => {
                        const element = document.getElementById(`model-detail-${model.model}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0fdfa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#fafafa';
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: '600', color: '#18181b' }}>
                      {model.model}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {model.maeTotal !== null && model.maeTotal !== undefined ? model.maeTotal.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', backgroundColor: '#faf5ff', fontWeight: '600', color: '#6b21a8' }}>
                      {model.maeNormal !== null && model.maeNormal !== undefined ? model.maeNormal.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {model.normalRate !== null && model.normalRate !== undefined ? model.normalRate.toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {model.adwt !== null && model.adwt !== undefined ? model.adwt.toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {model.timePerStep !== null && model.timePerStep !== undefined ? model.timePerStep.toFixed(3) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      {/* Detailed Metrics */}
      {selectedModel && (() => {
            const modelData = currentData.find(m => m.model === selectedModel);
            if (!modelData) return null;
            
            // fetch adsorbate-level metrics using the currently selected dataset
            const adsorbateData = selectedDataset 
              ? getDatasetMlipAdsorbateBreakdown(data, selectedDataset, selectedModel)
              : getAdsorbateBreakdown(data, selectedModel);
            
            return (
              <div id={`model-detail-${selectedModel}`} style={{ scrollMarginTop: '80px' }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f4f4f5'
              }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em' }}>
                  Detailed Metrics: {selectedModel}
                      {selectedDataset && <span style={{ fontSize: '0.8em', fontWeight: '500', color: '#71717a', marginLeft: '8px' }}>({selectedDataset})</span>}
                </h3>
                    <button
                      onClick={() => setSelectedModel(null)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#f4f4f5',
                        color: '#52525b',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e4e4e7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#6b21a8', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Energy Metrics</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Total MAE:</strong> {modelData.maeTotal !== null && modelData.maeTotal !== undefined ? modelData.maeTotal.toFixed(3) + ' eV' : 'N/A'}
                    </p>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Normal MAE:</strong> {modelData.maeNormal !== null && modelData.maeNormal !== undefined ? modelData.maeNormal.toFixed(3) + ' eV' : 'N/A'}
                    </p>
                  </div>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fef08a 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #fde68a',
                    boxShadow: '0 2px 4px rgba(251, 191, 36, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#92400e', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classification Rates</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Normal:</strong> {modelData.normalRate !== null && modelData.normalRate !== undefined ? modelData.normalRate.toFixed(2) + '%' : 'N/A'}
                    </p>
                  </div>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #5eead4',
                    boxShadow: '0 2px 4px rgba(20, 184, 166, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#115e59', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Structural Accuracy</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>ADwT:</strong> {modelData.adwt !== null && modelData.adwt !== undefined ? modelData.adwt.toFixed(2) + '%' : 'N/A'}
                    </p>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Time/Step:</strong> {modelData.timePerStep !== null && modelData.timePerStep !== undefined ? modelData.timePerStep.toFixed(3) + ' s' : 'N/A'}
                    </p>
                  </div>
                </div>
                </div>

                {/* Adsorbate Breakdown Table */}
                {adsorbateData && adsorbateData.length > 0 && (() => {
                  // filter out empty rows when adsorbate name is missing and no metrics are provided
                  const filteredData = adsorbateData.filter(row => {
                    const adsorbateName = row['Adsorbate_name'] || row['Adsorbate_name - Adsorbate_name'] || '';
                    if (!adsorbateName || adsorbateName === '-' || adsorbateName.trim() === '') {
                      // check whether all critical metrics are N/A
                      const hasValidData = 
                        (row['MAE_total (eV)'] !== null && row['MAE_total (eV)'] !== undefined && row['MAE_total (eV)'] !== '') ||
                        (row['MAE_normal (eV)'] !== null && row['MAE_normal (eV)'] !== undefined && row['MAE_normal (eV)'] !== '') ||
                        (row['Num_total'] !== null && row['Num_total'] !== undefined && row['Num_total'] !== '');
                      return hasValidData;
                    }
                    return true;
                  });
                  
                  if (filteredData.length === 0) {
                    return null;
                  }
                  
                  // find anomaly-detection related columns
                  const anomalyColumns = Object.keys(filteredData[0] || {}).filter(key => 
                    key.includes('Anomaly count') && key !== 'Anomaly count - total'
                  ).sort();
                  
                  return (
                  <div style={{ 
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #f4f4f5',
                    overflowX: 'auto'
                  }}>
                    <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.3em', marginBottom: '20px' }}>
                      Adsorbate-Specific Performance: {selectedModel}
                      {selectedDataset && ` (${selectedDataset})`}
                    </h3>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '13px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e4e4e7' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#18181b' }}>Adsorbate</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>MAE_total (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b', backgroundColor: '#faf5ff' }}>MAE_normal (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>MAE_single (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>ADwT (%)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>AMDwT (%)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Num_total</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Num_normal</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Migration</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Anomaly (total)</th>
                          {anomalyColumns.map(col => (
                            <th key={col} style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b', fontSize: '12px' }}>
                              {col.replace('Anomaly count - ', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => {
                          const adsorbateName = row['Adsorbate_name'] || row['Adsorbate_name - Adsorbate_name'] || '-';
                          return (
                          <tr 
                            key={idx}
                            style={{ 
                              borderBottom: '1px solid #f4f4f5',
                              backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa'
                            }}
                          >
                            <td style={{ padding: '12px', fontWeight: '600', color: '#18181b' }}>
                              {adsorbateName}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['MAE_total (eV)'] !== null && row['MAE_total (eV)'] !== undefined && row['MAE_total (eV)'] !== '' ? Number(row['MAE_total (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', backgroundColor: '#faf5ff', fontWeight: '600', color: '#6b21a8' }}>
                              {row['MAE_normal (eV)'] !== null && row['MAE_normal (eV)'] !== undefined && row['MAE_normal (eV)'] !== '' ? Number(row['MAE_normal (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['MAE_single (eV)'] !== null && row['MAE_single (eV)'] !== undefined && row['MAE_single (eV)'] !== '' ? Number(row['MAE_single (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['ADwT (%)'] !== null && row['ADwT (%)'] !== undefined && row['ADwT (%)'] !== '' ? Number(row['ADwT (%)']).toFixed(2) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['AMDwT (%)'] !== null && row['AMDwT (%)'] !== undefined && row['AMDwT (%)'] !== '' ? Number(row['AMDwT (%)']).toFixed(2) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_total'] !== null && row['Num_total'] !== undefined && row['Num_total'] !== '' ? Number(row['Num_total']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_normal'] !== null && row['Num_normal'] !== undefined && row['Num_normal'] !== '' ? Number(row['Num_normal']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_adsorbate_migration'] !== null && row['Num_adsorbate_migration'] !== undefined && row['Num_adsorbate_migration'] !== '' ? Number(row['Num_adsorbate_migration']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Anomaly count - total'] !== null && row['Anomaly count - total'] !== undefined && row['Anomaly count - total'] !== '' ? Number(row['Anomaly count - total']).toLocaleString() : 'N/A'}
                            </td>
                            {anomalyColumns.map(col => (
                              <td key={col} style={{ padding: '12px', textAlign: 'center' }}>
                                {row[col] !== null && row[col] !== undefined && row[col] !== '' ? Number(row[col]).toLocaleString() : 'N/A'}
                              </td>
                            ))}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

          {/* Main Leaderboard Table */}
          {currentData.length > 0 && (
          <div style={{ 
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f4f4f5',
            overflowX: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 style={{ margin: 0, color: '#18181b', fontWeight: '700', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Model Rankings {selectedDataset && (
                  <>
                    - {selectedDataset}
                    <a
                      href={`https://www.catalysis-hub.org/publications/${selectedDataset}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        opacity: 0.6,
                        transition: 'opacity 0.2s',
                        marginLeft: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.6';
                      }}
                      title="View on Catalysis Hub"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </>
                )}
            </h2>
              {selectedDataset && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '10px 16px 10px 40px',
                      border: '2px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '14px',
                      width: '250px',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e4e4e7';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#71717a',
                    fontSize: '16px'
                  }}>🔍</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        color: '#71717a',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#18181b'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              {searchQuery && (
                <span style={{ fontSize: '14px', color: '#71717a' }}>
                  {sortedData.length} model{sortedData.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e4e4e7' }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: '700', color: '#18181b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</th>
                  <th 
                    onClick={() => handleSort('model')} 
                    style={{ padding: '14px', textAlign: 'left', cursor: 'pointer', fontWeight: '700', color: '#18181b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Model {sortColumn === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('maeNormal')} 
                    style={{ 
                      padding: '14px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      fontWeight: '700', 
                      backgroundColor: sortColumn === 'maeNormal' ? '#ddd6fe' : '#ede9fe',
                      color: '#5b21b6', 
                      fontSize: '13px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      transition: 'background-color 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'maeNormal') {
                        e.currentTarget.style.backgroundColor = '#e9d5ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = sortColumn === 'maeNormal' ? '#ddd6fe' : '#ede9fe';
                    }}
                  >
                    Normal MAE 
                    {sortColumn === 'maeNormal' && (
                      <span style={{ marginLeft: '6px', fontSize: '16px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={() => handleSort('normalRate')} 
                    style={{ 
                      padding: '14px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      fontWeight: '700', 
                      backgroundColor: sortColumn === 'normalRate' ? '#fde68a' : '#fef3c7',
                      color: '#92400e', 
                      fontSize: '13px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'normalRate') {
                        e.currentTarget.style.backgroundColor = '#fcd34d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = sortColumn === 'normalRate' ? '#fde68a' : '#fef3c7';
                    }}
                  >
                    Normal Rate 
                    {sortColumn === 'normalRate' && (
                      <span style={{ marginLeft: '6px', fontSize: '16px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={() => handleSort('timePerStep')} 
                    style={{ 
                      padding: '14px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      fontWeight: '700', 
                      backgroundColor: sortColumn === 'timePerStep' ? '#99f6e4' : '#ccfbf1',
                      color: '#115e59', 
                      fontSize: '13px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'timePerStep') {
                        e.currentTarget.style.backgroundColor = '#5eead4';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = sortColumn === 'timePerStep' ? '#99f6e4' : '#ccfbf1';
                    }}
                  >
                    Time/Step 
                    {sortColumn === 'timePerStep' && (
                      <span style={{ marginLeft: '6px', fontSize: '16px' }}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#18181b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((model, index) => (
                  <tr 
                    key={model.model}
                    style={{ 
                      borderBottom: '1px solid #f4f4f5',
                      backgroundColor: selectedModel === model.model ? '#faf5ff' : 'white',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: hoveredModel === model.model ? 'scale(1.01)' : 'scale(1)',
                      boxShadow: hoveredModel === model.model ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      setHoveredModel(model.model);
                      e.currentTarget.style.backgroundColor = '#f0fdfa';
                    }}
                    onMouseLeave={(e) => {
                      setHoveredModel(null);
                      e.currentTarget.style.backgroundColor = selectedModel === model.model ? '#faf5ff' : 'white';
                    }}
                  >
                    <td style={{ padding: '14px' }}>
                      {index < 3 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '14px',
                          background: index === 0 
                            ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                            : index === 1
                            ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                            : 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                          {index + 1}
                        </span>
                      ) : (
                        <span style={{ 
                          fontWeight: '600', 
                          color: '#71717a',
                          fontSize: '15px'
                        }}>
                          {index + 1}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontWeight: '600', color: '#18181b', fontSize: '15px' }}>
                        {model.model}
                      </span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', backgroundColor: '#faf5ff', fontWeight: '600', color: '#6b21a8' }}>
                      {model.maeNormal !== null && model.maeNormal !== undefined ? model.maeNormal.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', backgroundColor: '#fffbeb', fontWeight: '600', color: '#78350f' }}>
                      {model.normalRate !== null && model.normalRate !== undefined ? model.normalRate.toFixed(2) + '%' : 'N/A'}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', backgroundColor: '#f0fdfa', fontWeight: '600', color: '#115e59' }}>
                      {model.timePerStep !== null && model.timePerStep !== undefined ? model.timePerStep.toFixed(3) : 'N/A'}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedModel(selectedModel === model.model ? null : model.model)}
                        style={{
                          padding: '8px 18px',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: selectedModel === model.model ? '#0891b2' : '#0d9488',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0891b2';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(8, 145, 178, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = selectedModel === model.model ? '#0891b2' : '#0d9488';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(13, 148, 136, 0.2)';
                        }}
                      >
                        {selectedModel === model.model ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}

          {/* Detailed Metrics */}
          {currentData.length > 0 && selectedModel && (() => {
            const modelData = currentData.find(m => m.model === selectedModel);
            if (!modelData) return null;
            
            // fetch adsorbate-level metrics using the currently selected dataset
            const adsorbateData = selectedDataset 
              ? getDatasetMlipAdsorbateBreakdown(data, selectedDataset, selectedModel)
              : getAdsorbateBreakdown(data, selectedModel);
            
            return (
              <div id={`model-detail-${selectedModel}`} style={{ scrollMarginTop: '80px' }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f4f4f5'
              }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em' }}>
                  Detailed Metrics: {selectedModel}
                      {selectedDataset && <span style={{ fontSize: '0.8em', fontWeight: '500', color: '#71717a', marginLeft: '8px' }}>({selectedDataset})</span>}
                </h3>
                    <button
                      onClick={() => setSelectedModel(null)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#f4f4f5',
                        color: '#52525b',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e4e4e7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f4f4f5';
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#6b21a8', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Energy Metrics</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Total MAE:</strong> {modelData.maeTotal !== null && modelData.maeTotal !== undefined ? modelData.maeTotal.toFixed(3) + ' eV' : 'N/A'}
                    </p>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Normal MAE:</strong> {modelData.maeNormal !== null && modelData.maeNormal !== undefined ? modelData.maeNormal.toFixed(3) + ' eV' : 'N/A'}
                    </p>
                  </div>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fef08a 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #fde68a',
                    boxShadow: '0 2px 4px rgba(251, 191, 36, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#92400e', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classification Rates</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Normal:</strong> {modelData.normalRate !== null && modelData.normalRate !== undefined ? modelData.normalRate.toFixed(2) + '%' : 'N/A'}
                    </p>
                  </div>
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', 
                    borderRadius: '12px', 
                    border: '1px solid #5eead4',
                    boxShadow: '0 2px 4px rgba(20, 184, 166, 0.1)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#115e59', fontWeight: '700', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Structural Accuracy</h4>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>ADwT:</strong> {modelData.adwt !== null && modelData.adwt !== undefined ? modelData.adwt.toFixed(2) + '%' : 'N/A'}
                    </p>
                    <p style={{ margin: '8px 0', color: '#18181b', fontSize: '14px' }}>
                      <strong>Time/Step:</strong> {modelData.timePerStep !== null && modelData.timePerStep !== undefined ? modelData.timePerStep.toFixed(3) + ' s' : 'N/A'}
                    </p>
                  </div>
                </div>
                </div>

                {/* Adsorbate Breakdown Table */}
                {adsorbateData && adsorbateData.length > 0 && (() => {
                  // filter out empty rows when the adsorbate name is missing and no metrics exist
                  const filteredData = adsorbateData.filter(row => {
                    const adsorbateName = row['Adsorbate_name'] || row['Adsorbate_name - Adsorbate_name'] || '';
                    if (!adsorbateName || adsorbateName === '-' || adsorbateName.trim() === '') {
                      // check whether every major metric is N/A
                      const hasValidData = 
                        (row['MAE_total (eV)'] !== null && row['MAE_total (eV)'] !== undefined && row['MAE_total (eV)'] !== '') ||
                        (row['MAE_normal (eV)'] !== null && row['MAE_normal (eV)'] !== undefined && row['MAE_normal (eV)'] !== '') ||
                        (row['Num_total'] !== null && row['Num_total'] !== undefined && row['Num_total'] !== '');
                      return hasValidData;
                    }
                    return true;
                  });
                  
                  if (filteredData.length === 0) {
                    return null;
                  }
                  
                  // find anomaly-detection columns
                  const anomalyColumns = Object.keys(filteredData[0] || {}).filter(key => 
                    key.includes('Anomaly count') && key !== 'Anomaly count - total'
                  ).sort();
                  
                  return (
                  <div style={{ 
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #f4f4f5',
                    overflowX: 'auto'
                  }}>
                    <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.3em', marginBottom: '20px' }}>
                      Adsorbate-Specific Performance: {selectedModel}
                      {selectedDataset && ` (${selectedDataset})`}
                    </h3>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '13px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e4e4e7' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#18181b' }}>Adsorbate</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>MAE_total (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b', backgroundColor: '#faf5ff' }}>MAE_normal (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>MAE_single (eV)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>ADwT (%)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>AMDwT (%)</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Num_total</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Num_normal</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Migration</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b' }}>Anomaly (total)</th>
                          {anomalyColumns.map(col => (
                            <th key={col} style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#18181b', fontSize: '12px' }}>
                              {col.replace('Anomaly count - ', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => {
                          const adsorbateName = row['Adsorbate_name'] || row['Adsorbate_name - Adsorbate_name'] || '-';
                          return (
                          <tr 
                            key={idx}
                            style={{ 
                              borderBottom: '1px solid #f4f4f5',
                              backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa'
                            }}
                          >
                            <td style={{ padding: '12px', fontWeight: '600', color: '#18181b' }}>
                              {adsorbateName}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['MAE_total (eV)'] !== null && row['MAE_total (eV)'] !== undefined && row['MAE_total (eV)'] !== '' ? Number(row['MAE_total (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', backgroundColor: '#faf5ff', fontWeight: '600', color: '#6b21a8' }}>
                              {row['MAE_normal (eV)'] !== null && row['MAE_normal (eV)'] !== undefined && row['MAE_normal (eV)'] !== '' ? Number(row['MAE_normal (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['MAE_single (eV)'] !== null && row['MAE_single (eV)'] !== undefined && row['MAE_single (eV)'] !== '' ? Number(row['MAE_single (eV)']).toFixed(3) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['ADwT (%)'] !== null && row['ADwT (%)'] !== undefined && row['ADwT (%)'] !== '' ? Number(row['ADwT (%)']).toFixed(2) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['AMDwT (%)'] !== null && row['AMDwT (%)'] !== undefined && row['AMDwT (%)'] !== '' ? Number(row['AMDwT (%)']).toFixed(2) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_total'] !== null && row['Num_total'] !== undefined && row['Num_total'] !== '' ? Number(row['Num_total']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_normal'] !== null && row['Num_normal'] !== undefined && row['Num_normal'] !== '' ? Number(row['Num_normal']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Num_adsorbate_migration'] !== null && row['Num_adsorbate_migration'] !== undefined && row['Num_adsorbate_migration'] !== '' ? Number(row['Num_adsorbate_migration']).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              {row['Anomaly count - total'] !== null && row['Anomaly count - total'] !== undefined && row['Anomaly count - total'] !== '' ? Number(row['Anomaly count - total']).toLocaleString() : 'N/A'}
                            </td>
                            {anomalyColumns.map(col => (
                              <td key={col} style={{ padding: '12px', textAlign: 'center' }}>
                                {row[col] !== null && row[col] !== undefined && row[col] !== '' ? Number(row[col]).toLocaleString() : 'N/A'}
                              </td>
                            ))}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Pareto Plots */}
          {currentData.filter(d => d.timePerStep !== null && d.timePerStep !== undefined).length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* Accuracy vs Efficiency */}
              {currentData.filter(d => d.maeNormal !== null && d.maeNormal !== undefined).length > 0 && (() => {
                const accuracyData = currentData.filter(d => d.maeNormal !== null && d.maeNormal !== undefined && d.timePerStep !== null && d.timePerStep !== undefined);
                const timeValues = accuracyData.map(d => d.timePerStep);
                const maeValues = accuracyData.map(d => d.maeNormal);
                const timeMin = Math.min(...timeValues);
                const timeMax = Math.max(...timeValues);
                const maeMin = Math.min(...maeValues);
                const maeMax = Math.max(...maeValues);
                const xMargin = (timeMax - timeMin) * 0.15;
                const yMargin = (maeMax - maeMin) * 0.1;
                
                return (
                <div style={{ 
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f4f4f5'
                }}>
                  <h3 style={{ marginTop: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em' }}>Accuracy vs Efficiency</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <ComposedChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="timePerStep" 
                        name="Time per Step (s)" 
                        label={{ value: 'Time per Step (s)', position: 'insideBottom', offset: -10 }}
                        domain={[Math.max(0, timeMin - 0.015), timeMax + xMargin]}
                        allowDecimals={true}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="maeNormal" 
                        name="Normal MAE (eV)" 
                        label={{ value: 'Normal MAE (eV)', angle: -90, position: 'insideLeft' }}
                        domain={[Math.max(0, maeMin - yMargin), maeMax + yMargin]}
                        allowDecimals={true}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload, coordinate }) => {
                          if (active && payload && payload.length && coordinate) {
                            // exclude the Pareto frontier points
                            const filteredPayload = payload.filter(p => p.name !== 'Pareto Frontier' && p.payload && p.payload.model);
                            if (filteredPayload.length === 0) return null;
                            
                            // determine which point is closest to the cursor
                            let closestPoint = filteredPayload[0];
                            let minDistance = Infinity;
                            
                            filteredPayload.forEach(p => {
                              if (p.payload && p.coordinate) {
                                const dx = p.coordinate.x - coordinate.x;
                                const dy = p.coordinate.y - coordinate.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance < minDistance) {
                                  minDistance = distance;
                                  closestPoint = p;
                                }
                              }
                            });
                            
                            const data = closestPoint.payload;
                            if (!data || !data.model) return null;
                            
                            return (
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '10px', 
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                              }}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{data.model}</p>
                                <p style={{ margin: '0' }}>Normal MAE: {data.maeNormal?.toFixed(3)} eV</p>
                                <p style={{ margin: '0' }}>Time: {data.timePerStep?.toFixed(3)} s</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {paretoAccuracyAreaData.length > 0 && (
                        <Area
                          type="linear"
                          dataKey="maeNormal"
                          data={paretoAccuracyAreaData}
                          fill="#f59e0b"
                          fillOpacity={0.1}
                          stroke="none"
                          isAnimationActive={false}
                        />
                      )}
                      {paretoAccuracyLineData.length > 0 && (
                        <Line 
                          type="linear" 
                          dataKey="maeNormal" 
                          data={paretoAccuracyLineData} 
                          stroke="#f59e0b" 
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls={true}
                          isAnimationActive={false}
                          strokeOpacity={0.8}
                          xAxisId={0}
                          yAxisId={0}
                        />
                      )}
                      <Scatter 
                        name="Models" 
                        data={currentData.filter(d => d.maeNormal !== null && d.maeNormal !== undefined && d.timePerStep !== null && d.timePerStep !== undefined)} 
                        fill="#0d9488"
                      />
                      {paretoAccuracyEfficiency.length > 0 && (
                        <Scatter 
                          name="Pareto Frontier" 
                          data={paretoAccuracyEfficiency} 
                          fill="#f59e0b"
                          shape={(props) => {
                            const { cx, cy } = props;
                            const size = 12;
                            const points = 5;
                            const outerRadius = size;
                            const innerRadius = size * 0.4;
                            const angle = Math.PI / points;
                            let path = '';
                            for (let i = 0; i < points * 2; i++) {
                              const radius = i % 2 === 0 ? outerRadius : innerRadius;
                              const x = cx + radius * Math.cos(i * angle - Math.PI / 2);
                              const y = cy + radius * Math.sin(i * angle - Math.PI / 2);
                              if (i === 0) {
                                path += `M ${x} ${y}`;
                              } else {
                                path += ` L ${x} ${y}`;
                              }
                            }
                            path += ' Z';
                            return <path d={path} fill="#f59e0b" stroke="none" />;
                          }}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', marginTop: '10px' }}>
                    <strong>Lower-left corner</strong> indicates better accuracy-efficiency trade-off (lower MAE and faster)
                  </p>
                </div>
                );
              })()}

              {/* Robustness vs Efficiency */}
              {currentData.filter(d => d.normalRate !== null && d.normalRate !== undefined).length > 0 && (() => {
                const robustnessData = currentData.filter(d => d.normalRate !== null && d.normalRate !== undefined && d.timePerStep !== null && d.timePerStep !== undefined);
                const timeValues = robustnessData.map(d => d.timePerStep);
                const rateValues = robustnessData.map(d => d.normalRate);
                const timeMin = Math.min(...timeValues);
                const timeMax = Math.max(...timeValues);
                const rateMin = Math.min(...rateValues);
                const rateMax = Math.max(...rateValues);
                const xMargin = (timeMax - timeMin) * 0.15;
                const rateSpan = rateMax - rateMin;
                const yMargin = rateSpan * 0.1;
                
                return (
                <div style={{ 
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f4f4f5'
                }}>
                  <h3 style={{ marginTop: 0, color: '#18181b', fontWeight: '700', fontSize: '1.3em' }}>Robustness vs Efficiency</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <ComposedChart margin={{ top: 20, right: 20, bottom: 40, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="timePerStep" 
                        name="Time per Step (s)" 
                        label={{ value: 'Time per Step (s)', position: 'insideBottom', offset: -10 }}
                        domain={[Math.max(0, timeMin - 0.015), timeMax + xMargin]}
                        allowDecimals={true}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="normalRate" 
                        name="Normal Rate (%)" 
                        label={{ value: 'Normal Rate (%)', angle: -90, position: 'insideLeft' }}
                        domain={[rateMin - yMargin, rateMax + yMargin]}
                        allowDecimals={true}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload, coordinate }) => {
                          if (active && payload && payload.length && coordinate) {
                            // exclude the Pareto frontier points
                            const filteredPayload = payload.filter(p => p.name !== 'Pareto Frontier' && p.payload && p.payload.model);
                            if (filteredPayload.length === 0) return null;
                            
                            // determine which point is closest to the cursor
                            let closestPoint = filteredPayload[0];
                            let minDistance = Infinity;
                            
                            filteredPayload.forEach(p => {
                              if (p.payload && p.coordinate) {
                                const dx = p.coordinate.x - coordinate.x;
                                const dy = p.coordinate.y - coordinate.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance < minDistance) {
                                  minDistance = distance;
                                  closestPoint = p;
                                }
                              }
                            });
                            
                            const data = closestPoint.payload;
                            if (!data || !data.model) return null;
                            
                            return (
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '10px', 
                                border: '1px solid #ccc',
                                borderRadius: '5px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                              }}>
                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{data.model}</p>
                                <p style={{ margin: '0' }}>Normal Rate: {data.normalRate?.toFixed(2)}%</p>
                                <p style={{ margin: '0' }}>Time: {data.timePerStep?.toFixed(3)} s</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {paretoRobustnessAreaData.length > 0 && (
                        <Area
                          type="linear"
                          dataKey="normalRate"
                          data={paretoRobustnessAreaData}
                          fill="#f59e0b"
                          fillOpacity={0.1}
                          stroke="none"
                          isAnimationActive={false}
                        />
                      )}
                      {paretoRobustnessLineData.length > 0 && (
                        <Line 
                          type="linear" 
                          dataKey="normalRate" 
                          data={paretoRobustnessLineData} 
                          stroke="#f59e0b" 
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls={true}
                          isAnimationActive={false}
                          strokeOpacity={0.8}
                          xAxisId={0}
                          yAxisId={0}
                        />
                      )}
                      <Scatter 
                        name="Models" 
                        data={currentData.filter(d => d.normalRate !== null && d.normalRate !== undefined && d.timePerStep !== null && d.timePerStep !== undefined)} 
                        fill="#14b8a6"
                      />
                      {paretoRobustnessEfficiency.length > 0 && (
                        <Scatter 
                          name="Pareto Frontier" 
                          data={paretoRobustnessEfficiency} 
                          fill="#f59e0b"
                          shape={(props) => {
                            const { cx, cy } = props;
                            const size = 12;
                            const points = 5;
                            const outerRadius = size;
                            const innerRadius = size * 0.4;
                            const angle = Math.PI / points;
                            let path = '';
                            for (let i = 0; i < points * 2; i++) {
                              const radius = i % 2 === 0 ? outerRadius : innerRadius;
                              const x = cx + radius * Math.cos(i * angle - Math.PI / 2);
                              const y = cy + radius * Math.sin(i * angle - Math.PI / 2);
                              if (i === 0) {
                                path += `M ${x} ${y}`;
                              } else {
                                path += ` L ${x} ${y}`;
                              }
                            }
                            path += ' Z';
                            return <path d={path} fill="#f59e0b" stroke="none" />;
                          }}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', marginTop: '10px' }}>
                    <strong>Upper-left corner</strong> indicates better robustness-efficiency trade-off (higher normal rate and faster)
                  </p>
                </div>
                );
              })()}
        </div>
      )}
        </div>
      )}

      {activeTab === 'documentation' && !tabTransition && (
        <div style={{
          animation: 'fadeIn 0.3s ease-in',
          opacity: 1
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '48px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f4f4f5',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            {/* Quick Navigation */}
            <div style={{ 
              backgroundColor: '#fafafa',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
              marginBottom: '32px'
            }}>
              <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: 0, marginBottom: '16px' }}>
                Quick Navigation
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  { id: 'installation', label: 'Installation' },
                  { id: 'adsorption-energy', label: 'Adsorption Energy Benchmarking' },
                  { id: 'relative-energy', label: 'Relative Energy Benchmarking' },
                  { id: 'eos', label: 'Equation of State (EOS)' },
                  { id: 'configuration', label: 'Configuration Options' },
                  { id: 'citation', label: 'Citation' }
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(item.id);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0d9488',
                      color: 'white',
                      borderRadius: '8px',
                      textDecoration: 'none',
                fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0891b2';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0d9488';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {item.label}
                  </a>
                ))}
            </div>
            </div>

            <h2 id="installation" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Installation
            </h2>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#18181b' }}>Basic installation (core features only):</strong><br/>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '8px' }}>pip install catbench</code>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#18181b' }}>With D3 dispersion correction support (requires CUDA):</strong><br/>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '8px' }}>pip install catbench[d3]</code>
              </div>
              <div>
                <strong style={{ color: '#18181b' }}>Development installation:</strong><br/>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '8px' }}>git clone https://github.com/JinukMoon/CatBench.git</code>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '4px' }}>cd CatBench</code>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '4px' }}>pip install -e .</code>
                <code style={{ color: '#0d9488', display: 'block', marginTop: '4px' }}>pip install -e .[d3]  # Development with D3 support</code>
              </div>
            </div>
            <div style={{
              backgroundColor: '#fef3c7',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              marginBottom: '24px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                <strong>Note:</strong> D3 dispersion correction requires CUDA toolkit for GPU acceleration. CPU-only mode is not currently supported.
              </p>
            </div>

            <h2 id="adsorption-energy" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Adsorption Energy Benchmarking
            </h2>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Data Preparation
            </h3>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Option A: CatHub Database
            </h4>
            <p style={{ marginBottom: '16px' }}>
              Download and preprocess catalysis reaction data directly from CatHub:
            </p>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import cathub_preprocessing

# Single benchmark dataset
cathub_preprocessing("MamunHighT2019")

# Multiple datasets with adsorbate name integration
cathub_preprocessing(
    ["MamunHighT2019", "AraComputational2022"],
    adsorbate_integration={'HO': 'OH', 'O2H': 'OOH'}  # Unify naming conventions
)`}
              </pre>
            </div>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Option B: User VASP Data
            </h4>
            <div style={{
              backgroundColor: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                <strong>⚠️ Important:</strong> The VASP preprocessing functions will DELETE all files except CONTCAR and OSZICAR to save disk space. <strong>Always work with a copy of your original VASP data!</strong>
              </p>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '13px'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`# STRONGLY RECOMMENDED: Copy your original data first
cp -r original_vasp_data/ your_dataset_name/`}
              </pre>
            </div>
            <p style={{ marginBottom: '16px' }}>
              Organize your VASP calculation folders following this hierarchy:
            </p>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`your_dataset_name/  # You can use any name for this folder
├── gas/
│   ├── H2gas/            # Complete VASP calculation folder
│   │   ├── INCAR
│   │   ├── POSCAR
│   │   ├── POTCAR
│   │   ├── KPOINTS
│   │   ├── CONTCAR      # Required
│   │   ├── OSZICAR      # Required
│   │   └── ...
│   └── H2Ogas/
│       ├── CONTCAR
│       ├── OSZICAR
│       └── ...
├── system1/  # e.g., material_1
│   ├── slab/
│   │   ├── CONTCAR      # REQUIRED: must be exactly "slab"
│   │   ├── OSZICAR
│   │   └── ...
│   ├── H/
│   │   ├── 1/
│   │   │   ├── CONTCAR  # REQUIRED: must be exactly "adslab"
│   │   │   ├── OSZICAR
│   │   │   └── ...
│   │   └── 2/
│   └── OH/
│       └── ...
└── system2/
    └── ...`}
              </pre>
            </div>
            <div style={{
              backgroundColor: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                <strong>⚠️ Critical: Required Keywords</strong><br/>
                • <code>"slab"</code> and <code>"adslab"</code> are <strong>mandatory fixed keywords</strong> - do NOT change these names<br/>
                • Gas phase references <strong>must end with "gas"</strong> suffix (e.g., "H2gas", "COgas", "H2Ogas")<br/>
                • These naming conventions are hard-coded in CatBench and changing them will cause errors
              </p>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import vasp_preprocessing

# Define reaction stoichiometry
coeff_setting = {
    "H": {
        "slab": -1,      # E(slab) - REQUIRED: must be exactly "slab"
        "adslab": 1,     # E(H*) - REQUIRED: must be exactly "adslab"
        "H2gas": -1/2,   # -1/2 E(H2) - REQUIRED: must end with "gas"
    },
    "OH": {
        "slab": -1,      # REQUIRED: must be exactly "slab"
        "adslab": 1,     # REQUIRED: must be exactly "adslab"
        "H2gas": +1/2,   # REQUIRED: must end with "gas"
        "H2Ogas": -1,    # REQUIRED: must end with "gas"
    },
}

# Process and prepare data
vasp_preprocessing("your_dataset_name", coeff_setting)
# Output: Creates raw_data/{your_folder_name}_adsorption.json`}
              </pre>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Calculation
            </h3>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Basic Calculation
            </h4>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import AdsorptionCalculation
from your_mlip import YourCalculator

# Initialize calculators for reproducibility testing
calc_num = 3  # Number of independent calculations
calculators = []
for i in range(calc_num):
    calc = YourCalculator(...)  # Your MLIP with desired settings
    calculators.append(calc)

# Configure and run
config = {
    "mlip_name": "YourMLIP",
    "benchmark": "dataset_name",
    # "rate": None,  # IMPORTANT: Use None to preserve VASP's original fixing constraints
    # "save_files": False,  # Set to False to save disk space
}

adsorption_calc = AdsorptionCalculation(calculators, **config)
adsorption_calc.run()`}
              </pre>
            </div>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              With D3 Dispersion Correction
            </h4>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import AdsorptionCalculation
from catbench.dispersion import DispersionCorrection
from your_mlip import YourCalculator

# Setup D3 correction (using default PBE parameters)
d3_corr = DispersionCorrection()

# Apply D3 to calculators
calc_num = 3
calculators = []
for i in range(calc_num):
    calc = YourCalculator(...)
    calc_d3 = d3_corr.apply(calc)  # Combine MLIP with D3
    calculators.append(calc_d3)

# Run calculation
config = {
    "mlip_name": "YourMLIP_D3",
    "benchmark": "dataset_name",
}
adsorption_calc = AdsorptionCalculation(calculators, **config)
adsorption_calc.run()`}
              </pre>
            </div>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              OC20 Mode (Direct Adsorption Energy Prediction)
            </h4>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import AdsorptionCalculation
from your_oc20_mlip import OC20Calculator

# OC20-trained models (directly predict adsorption energies)
calc_num = 3
calculators = []
for i in range(calc_num):
    oc20_calculator = OC20Calculator(...)
    calculators.append(oc20_calculator)

# Run in OC20 mode
config = {
    "mlip_name": "OC20_MLIP",
    "benchmark": "dataset_name",
}
adsorption_calc = AdsorptionCalculation(calculators, mode="oc20", **config)
adsorption_calc.run()`}
              </pre>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Analysis
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import AdsorptionAnalysis

# Configure and run analysis
config = {
    #"mlip_list": ["MLIP_A", "MLIP_B", ...],  # Auto-detects if not set
    #"font_setting": ["~/fonts/your_font_file.ttf", "sans-serif"],
}

analysis = AdsorptionAnalysis(**config)
analysis.analysis()`}
              </pre>
            </div>
            <p style={{ marginBottom: '16px' }}>
              This generates:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Parity plots:</strong> Visual comparison of MLIP vs DFT energies</li>
              <li style={{ marginBottom: '8px' }}><strong>Excel report:</strong> Comprehensive metrics including MAE, RMSE, anomaly statistics</li>
              <li style={{ marginBottom: '8px' }}><strong>Anomaly detection:</strong> Automatic identification of problematic calculations</li>
            </ul>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Output Files
            </h4>
            <p style={{ marginBottom: '16px' }}>
              CatBench generates comprehensive parity plots for visual assessment of MLIP performance:
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`${import.meta.env.BASE_URL}mono_plot.png`}
                  alt="Mono Plot" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '650px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    marginBottom: '12px'
                  }} 
                />
                <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>Mono Plot</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b' }}>All reactions combined in a single parity plot</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`${import.meta.env.BASE_URL}multi_plot.png`}
                  alt="Multi Plot" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '650px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    marginBottom: '12px'
                  }} 
                />
                <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>Multi Plot</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b' }}>Separate parity plots displayed by adsorbate type</p>
              </div>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Threshold Sensitivity Analysis
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.adsorption import AdsorptionAnalysis

analysis = AdsorptionAnalysis()

# Run both threshold sensitivity analyses automatically (default)
analysis.threshold_sensitivity_analysis()

# Or specify a specific mode
analysis.threshold_sensitivity_analysis(mode="disp_thrs")  # Only displacement threshold
analysis.threshold_sensitivity_analysis(mode="bond_length_change_threshold")  # Only bond length threshold`}
              </pre>
            </div>
            <p style={{ marginBottom: '16px' }}>
              This generates stacked area charts showing how anomaly detection rates change with different threshold values, 
              helping you optimize threshold parameters for your specific system.
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`${import.meta.env.BASE_URL}disp_thrs_sensitivity.png`}
                  alt="Displacement Threshold Sensitivity" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '700px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    marginBottom: '12px'
                  }} 
                />
                <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>Displacement Threshold Analysis</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b' }}>Impact of displacement threshold on anomaly detection rates</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`${import.meta.env.BASE_URL}bond_threshold_sensitivity.png`}
                  alt="Bond Length Threshold Sensitivity" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '700px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    marginBottom: '12px'
                  }} 
                />
                <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>Bond Length Threshold Analysis</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b' }}>Impact of bond length change threshold on anomaly detection rates</p>
              </div>
            </div>

            <h2 id="relative-energy" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Relative Energy Benchmarking
            </h2>
            <p style={{ marginBottom: '20px' }}>
              CatBench supports two main types of relative energy calculations: surface energy and bulk formation energy.
            </p>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Surface Energy
            </h3>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Data Preparation
            </h4>
            <div style={{
              backgroundColor: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                <strong>Warning:</strong> Preprocessing functions will DELETE all VASP files except CONTCAR and OSZICAR to save disk space. Always work with copies of your original data.
              </p>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`your_surface_data/
├── Material_1/
│   ├── bulk/
│   │   ├── CONTCAR      # Required
│   │   ├── OSZICAR      # Required
│   └── slab/
│       ├── CONTCAR      # Required
│       ├── OSZICAR      # Required
└── Material_2/
    └── ...`}
              </pre>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.relative.surface_energy.data import surface_energy_vasp_preprocessing

# Process surface energy data
surface_energy_vasp_preprocessing("your_surface_data")
# Output: Creates raw_data/{your_surface_data}_surface_energy.json`}
              </pre>
            </div>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Calculation & Analysis
            </h4>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.relative import SurfaceEnergyCalculation, RelativeEnergyAnalysis
from your_mlip import YourCalculator

# Calculation
calc = YourCalculator(...)
surface_calc = SurfaceEnergyCalculation(
    calculator=calc,
    benchmark="surface_benchmark",
    mlip_name="YourMLIP"
)
surface_calc.run()

# Analysis
config = {
    "task_type": "surface",  # Required: "surface", "bulk_formation", or "custom"
}
analysis = RelativeEnergyAnalysis(**config)
analysis.analysis()`}
              </pre>
            </div>

            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Output Files
            </h4>
            <p style={{ marginBottom: '16px' }}>
              Results include comprehensive Excel reports with performance metrics and publication-ready parity plots for visual comparison.
            </p>
            <div style={{ 
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <img 
                src={`${import.meta.env.BASE_URL}surface_parity.png`}
                alt="Surface Energy Parity Plot" 
                style={{ 
                  width: '100%', 
                  maxWidth: '750px',
                  height: 'auto',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginBottom: '12px'
                }} 
              />
              <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>Surface Energy Parity Plot</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b', fontStyle: 'italic' }}>
                Surface energy parity plot showing MLIP performance against DFT references for various metal surfaces
              </p>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '32px', marginBottom: '16px' }}>
              Bulk Formation Energy
            </h3>
            <div style={{
              backgroundColor: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                <strong>Warning:</strong> Preprocessing functions will DELETE all VASP files except CONTCAR and OSZICAR to save disk space. Always work with copies of your original data.
              </p>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.relative.bulk_formation.data import bulk_formation_vasp_preprocessing
from catbench.relative import BulkFormationCalculation, RelativeEnergyAnalysis

# Define formation reaction stoichiometry
coeff_setting = {
    "Compound_1": {
        "bulk": 1,
        "Element_A": -1,
        "Element_C": -1/2,
    },
}

bulk_formation_vasp_preprocessing("your_formation_data", coeff_setting)

# Calculation
calc = YourCalculator(...)
formation_calc = BulkFormationCalculation(
    calculator=calc,
    benchmark="formation_benchmark",
    mlip_name="YourMLIP"
)
formation_calc.run()

# Analysis
config = {
    "task_type": "bulk_formation",
}
analysis = RelativeEnergyAnalysis(**config)
analysis.analysis()`}
              </pre>
            </div>

            <h2 id="eos" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Equation of State (EOS) Benchmarking
            </h2>
            <div style={{
              backgroundColor: '#dbeafe',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                <strong>Note:</strong> Unlike adsorption preprocessing, EOS preprocessing does NOT delete any files.
              </p>
            </div>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`from catbench.eos import eos_vasp_preprocessing, EOSCalculation, EOSAnalysis

# Data preparation
eos_vasp_preprocessing("your_eos_data")
# Output: Creates raw_data/{your_eos_data}_eos.json

# Calculation
calc = YourCalculator(...)
eos_calc = EOSCalculation(
    calculator=calc,
    mlip_name="YourMLIP",
    benchmark="eos_benchmark"
)
eos_calc.run()

# Analysis
eos_analysis = EOSAnalysis()
eos_analysis.analysis()`}
              </pre>
            </div>
            <h4 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.2em', marginTop: '24px', marginBottom: '12px' }}>
              Output Files
            </h4>
            <p style={{ marginBottom: '16px' }}>
              Comprehensive analysis results including individual material EOS curves and multi-MLIP comparison reports 
              with Birch-Murnaghan equation fitting parameters.
            </p>
            <div style={{ 
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <img 
                src={`${import.meta.env.BASE_URL}EOS_example.png`}
                alt="EOS Analysis Example" 
                style={{ 
                  width: '100%', 
                  maxWidth: '750px',
                  height: 'auto',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginBottom: '12px'
                }} 
              />
              <p style={{ margin: 0, fontWeight: '600', color: '#18181b' }}>EOS Curve Comparison</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#52525b', fontStyle: 'italic' }}>
                EOS curve comparison showing MLIP vs DFT results fitted with Birch-Murnaghan equation
              </p>
            </div>

            <h2 id="configuration" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Configuration Options
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Detailed configuration options for all CatBench components:
            </p>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              AdsorptionCalculation
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_name</code></td>
                    <td style={{ padding: '10px' }}>Name identifier for the MLIP</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmark</code></td>
                    <td style={{ padding: '10px' }}>Dataset name or "multiple_tag" for combined</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mode</code></td>
                    <td style={{ padding: '10px' }}>Calculation mode: "basic" or "oc20"</td>
                    <td style={{ padding: '10px' }}>"basic"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>f_crit_relax</code></td>
                    <td style={{ padding: '10px' }}>Force convergence criterion (eV/Å)</td>
                    <td style={{ padding: '10px' }}>0.05</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>n_crit_relax</code></td>
                    <td style={{ padding: '10px' }}>Maximum optimization steps</td>
                    <td style={{ padding: '10px' }}>999</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>rate</code></td>
                    <td style={{ padding: '10px' }}>Fraction of atoms to fix (None: preserve original constraints)</td>
                    <td style={{ padding: '10px' }}>0.5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>optimizer</code></td>
                    <td style={{ padding: '10px' }}>ASE optimizer: "LBFGS", "BFGS", "FIRE", etc.</td>
                    <td style={{ padding: '10px' }}>"LBFGS"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>save_files</code></td>
                    <td style={{ padding: '10px' }}>Save trajectory, log, and gas files</td>
                    <td style={{ padding: '10px' }}>True</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              AdsorptionAnalysis
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Type</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>calculating_path</code></td>
                    <td style={{ padding: '10px' }}>Path to results directory</td>
                    <td style={{ padding: '10px' }}>str</td>
                    <td style={{ padding: '10px' }}>"./result"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_list</code></td>
                    <td style={{ padding: '10px' }}>MLIPs to analyze</td>
                    <td style={{ padding: '10px' }}>list[str]</td>
                    <td style={{ padding: '10px' }}>Auto-detect</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>target_adsorbates</code></td>
                    <td style={{ padding: '10px' }}>Specific adsorbates to analyze</td>
                    <td style={{ padding: '10px' }}>list[str]</td>
                    <td style={{ padding: '10px' }}>All</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>exclude_adsorbates</code></td>
                    <td style={{ padding: '10px' }}>Adsorbates to exclude</td>
                    <td style={{ padding: '10px' }}>list[str]</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmarking_name</code></td>
                    <td style={{ padding: '10px' }}>Output file prefix</td>
                    <td style={{ padding: '10px' }}>str</td>
                    <td style={{ padding: '10px' }}>Current dir</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>disp_thrs</code></td>
                    <td style={{ padding: '10px' }}>Displacement threshold (Å)</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>0.5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>energy_thrs</code></td>
                    <td style={{ padding: '10px' }}>Energy anomaly threshold (eV)</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>2.0</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>reproduction_thrs</code></td>
                    <td style={{ padding: '10px' }}>Reproducibility threshold (eV)</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>0.2</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>bond_length_change_threshold</code></td>
                    <td style={{ padding: '10px' }}>Bond length change threshold for anomaly detection (fraction)</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>0.2</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>energy_cutoff</code></td>
                    <td style={{ padding: '10px' }}>Max reference energy to include (eV)</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Plot Customization</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>figsize</code></td>
                    <td style={{ padding: '10px' }}>Figure size (width, height) in inches</td>
                    <td style={{ padding: '10px' }}>tuple</td>
                    <td style={{ padding: '10px' }}>(9, 8)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>dpi</code></td>
                    <td style={{ padding: '10px' }}>Plot resolution (dots per inch)</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>300</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>time_unit</code></td>
                    <td style={{ padding: '10px' }}>Time display unit: "s", "ms", "µs"</td>
                    <td style={{ padding: '10px' }}>str</td>
                    <td style={{ padding: '10px' }}>"ms"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>plot_enabled</code></td>
                    <td style={{ padding: '10px' }}>Generate plots</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>True</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_name_map</code></td>
                    <td style={{ padding: '10px' }}>Dictionary for MLIP display names</td>
                    <td style={{ padding: '10px' }}>dict[str, str]</td>
                    <td style={{ padding: '10px' }}>{}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Plot Appearance</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mark_size</code></td>
                    <td style={{ padding: '10px' }}>Marker size in plots</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>100</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>linewidths</code></td>
                    <td style={{ padding: '10px' }}>Line width in plots</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>1.5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Plot Axes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>min</code></td>
                    <td style={{ padding: '10px' }}>Minimum value for plot axes</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>max</code></td>
                    <td style={{ padding: '10px' }}>Maximum value for plot axes</td>
                    <td style={{ padding: '10px' }}>float</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>tick_bins</code></td>
                    <td style={{ padding: '10px' }}>Number of tick bins for both axes (None = auto)</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>6</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>tick_decimal_places</code></td>
                    <td style={{ padding: '10px' }}>Decimal places for tick labels (None = auto)</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>1</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>tick_labelsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for tick labels</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>25</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Font Sizes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>xlabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for x-axis labels</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>ylabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for y-axis labels</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mae_text_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for MAE text</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>30</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>legend_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Legend font size</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>25</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>comparison_legend_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Comparison plot legend font size</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>15</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>threshold_xlabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>X-axis label font size for threshold plots</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>threshold_ylabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Y-axis label font size for threshold plots</td>
                    <td style={{ padding: '10px' }}>int</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Display Options</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>legend_off</code></td>
                    <td style={{ padding: '10px' }}>Hide legends in plots</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mae_text_off</code></td>
                    <td style={{ padding: '10px' }}>Hide MAE text in plots</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>error_bar_display</code></td>
                    <td style={{ padding: '10px' }}>Show error bars in plots</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>xlabel_off</code></td>
                    <td style={{ padding: '10px' }}>Hide x-axis labels</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>ylabel_off</code></td>
                    <td style={{ padding: '10px' }}>Hide y-axis labels</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>grid</code></td>
                    <td style={{ padding: '10px' }}>Show grid on plots</td>
                    <td style={{ padding: '10px' }}>bool</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>specific_color</code></td>
                    <td style={{ padding: '10px' }}>Color for single MLIP plots</td>
                    <td style={{ padding: '10px' }}>str</td>
                    <td style={{ padding: '10px' }}>"#2077B5"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '10px', fontWeight: '700' }} colSpan="4">Advanced</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>font_setting</code></td>
                    <td style={{ padding: '10px' }}>Custom font settings [family, path]</td>
                    <td style={{ padding: '10px' }}>list[str]</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              DispersionCorrection
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>damping_type</code></td>
                    <td style={{ padding: '10px' }}>Damping function: "damp_bj", "damp_zero"</td>
                    <td style={{ padding: '10px' }}>"damp_bj"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>functional_name</code></td>
                    <td style={{ padding: '10px' }}>DFT functional for parameters</td>
                    <td style={{ padding: '10px' }}>"pbe"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>vdw_cutoff</code></td>
                    <td style={{ padding: '10px' }}>van der Waals cutoff (au²)</td>
                    <td style={{ padding: '10px' }}>9000</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>cn_cutoff</code></td>
                    <td style={{ padding: '10px' }}>Coordination number cutoff (au²)</td>
                    <td style={{ padding: '10px' }}>1600</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              SurfaceEnergyCalculation / BulkFormationCalculation
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>calculator</code></td>
                    <td style={{ padding: '10px' }}>ASE calculator instance</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_name</code></td>
                    <td style={{ padding: '10px' }}>MLIP identifier</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmark</code></td>
                    <td style={{ padding: '10px' }}>Dataset name</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>f_crit_relax</code></td>
                    <td style={{ padding: '10px' }}>Force convergence (eV/Å)</td>
                    <td style={{ padding: '10px' }}>0.05</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>n_crit_relax</code></td>
                    <td style={{ padding: '10px' }}>Max steps</td>
                    <td style={{ padding: '10px' }}>999</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              RelativeEnergyAnalysis
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>calculating_path</code></td>
                    <td style={{ padding: '10px' }}>Path to results directory</td>
                    <td style={{ padding: '10px' }}>"./result"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>plot_path</code></td>
                    <td style={{ padding: '10px' }}>Path for plot output</td>
                    <td style={{ padding: '10px' }}>"./plot"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmark</code></td>
                    <td style={{ padding: '10px' }}>Dataset name</td>
                    <td style={{ padding: '10px' }}>Current dir name</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>task_type</code></td>
                    <td style={{ padding: '10px' }}>Analysis type: "surface", "bulk_formation", "custom"</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_list</code></td>
                    <td style={{ padding: '10px' }}>MLIPs to analyze</td>
                    <td style={{ padding: '10px' }}>Auto-detect</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>figsize</code></td>
                    <td style={{ padding: '10px' }}>Plot dimensions</td>
                    <td style={{ padding: '10px' }}>(9, 8)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>dpi</code></td>
                    <td style={{ padding: '10px' }}>Plot resolution</td>
                    <td style={{ padding: '10px' }}>300</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mark_size</code></td>
                    <td style={{ padding: '10px' }}>Marker size in plots</td>
                    <td style={{ padding: '10px' }}>100</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>linewidths</code></td>
                    <td style={{ padding: '10px' }}>Line width in plots</td>
                    <td style={{ padding: '10px' }}>1.5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>specific_color</code></td>
                    <td style={{ padding: '10px' }}>Color for plots</td>
                    <td style={{ padding: '10px' }}>"#2077B5"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>min</code></td>
                    <td style={{ padding: '10px' }}>Minimum value for plot axes</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>max</code></td>
                    <td style={{ padding: '10px' }}>Maximum value for plot axes</td>
                    <td style={{ padding: '10px' }}>None</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>grid</code></td>
                    <td style={{ padding: '10px' }}>Show grid on plots</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>font_setting</code></td>
                    <td style={{ padding: '10px' }}>Custom font settings</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              EOSCalculation
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>calculator</code></td>
                    <td style={{ padding: '10px' }}>ASE calculator instance</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_name</code></td>
                    <td style={{ padding: '10px' }}>MLIP identifier</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmark</code></td>
                    <td style={{ padding: '10px' }}>Dataset name</td>
                    <td style={{ padding: '10px' }}>Required</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.5em', marginTop: '24px', marginBottom: '12px' }}>
              EOSAnalysis
            </h3>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e4e4e7', borderBottom: '2px solid #a1a1aa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Parameter</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '700' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>calculating_path</code></td>
                    <td style={{ padding: '10px' }}>Path to results directory</td>
                    <td style={{ padding: '10px' }}>"./result"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>plot_path</code></td>
                    <td style={{ padding: '10px' }}>Path for plot output</td>
                    <td style={{ padding: '10px' }}>"./plot"</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>benchmark</code></td>
                    <td style={{ padding: '10px' }}>Dataset name</td>
                    <td style={{ padding: '10px' }}>Current dir name</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mlip_list</code></td>
                    <td style={{ padding: '10px' }}>MLIPs to analyze</td>
                    <td style={{ padding: '10px' }}>Auto-detect</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>figsize</code></td>
                    <td style={{ padding: '10px' }}>Plot dimensions</td>
                    <td style={{ padding: '10px' }}>(9, 8)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>dpi</code></td>
                    <td style={{ padding: '10px' }}>Plot resolution</td>
                    <td style={{ padding: '10px' }}>300</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>mark_size</code></td>
                    <td style={{ padding: '10px' }}>Marker size in plots</td>
                    <td style={{ padding: '10px' }}>100</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>x_tick_bins</code></td>
                    <td style={{ padding: '10px' }}>Number of x-axis tick bins</td>
                    <td style={{ padding: '10px' }}>5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>y_tick_bins</code></td>
                    <td style={{ padding: '10px' }}>Number of y-axis tick bins</td>
                    <td style={{ padding: '10px' }}>5</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>tick_decimal_places</code></td>
                    <td style={{ padding: '10px' }}>Decimal places for tick labels</td>
                    <td style={{ padding: '10px' }}>1</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>tick_labelsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for tick labels</td>
                    <td style={{ padding: '10px' }}>25</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>xlabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for x-axis labels</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>ylabel_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Font size for y-axis labels</td>
                    <td style={{ padding: '10px' }}>40</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>legend_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Legend font size</td>
                    <td style={{ padding: '10px' }}>25</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>comparison_legend_fontsize</code></td>
                    <td style={{ padding: '10px' }}>Comparison plot legend font size</td>
                    <td style={{ padding: '10px' }}>15</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>grid</code></td>
                    <td style={{ padding: '10px' }}>Show grid on plots</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ padding: '10px' }}><code>font_setting</code></td>
                    <td style={{ padding: '10px' }}>Custom font settings</td>
                    <td style={{ padding: '10px' }}>False</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="citation" style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7', scrollMarginTop: '80px' }}>
              Citation
            </h2>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
              marginBottom: '24px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#52525b' }}>
{`@article{catbench2025,
  title={CatBench Framework for Benchmarking Machine Learning Interatomic Potentials in Adsorption Energy Predictions for Heterogeneous Catalysis},
  author={Moon, Jinuk and Jeon, Uchan and Choung, Seokhyun and Han, Jeong Woo},
  journal={Cell Reports Physical Science},
  volume={6},
  pages={102968},
  year={2025},
  doi={10.1016/j.xcrp.2025.102968}
}`}
              </pre>
            </div>

            <h2 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7' }}>
              License
            </h2>
            <p style={{ marginBottom: '24px' }}>
              This project is licensed under the MIT License.
            </p>

            <h2 style={{ color: '#18181b', fontWeight: '700', fontSize: '1.8em', marginTop: '48px', marginBottom: '16px', paddingTop: '24px', borderTop: '2px solid #e4e4e7' }}>
              Contact
            </h2>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>Jinuk Moon</strong> - <a href="mailto:jumoon@snu.ac.kr" style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>jumoon@snu.ac.kr</a>
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>Jeong Woo Han</strong> - <a href="mailto:jwhan98@snu.ac.kr" style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>jwhan98@snu.ac.kr</a>
              </p>
              <p style={{ marginBottom: '12px', color: '#71717a' }}>
                Seoul National University
              </p>
            </div>
            <p style={{ marginBottom: '16px' }}>
              For bug reports, feature requests, and contributions, visit our{' '}
              <a 
                href="https://github.com/JinukMoon/CatBench" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}
              >
                GitHub repository
              </a>.
            </p>
          </div>
        </div>
      )}

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
        @keyframes slideIn {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>

      {/* Footer */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f4f4f5'
      }}>
        <p style={{ margin: '0 0 12px 0', color: '#71717a', fontSize: '15px' }}>
          Based on: <em style={{ color: '#18181b', fontWeight: '600' }}>Moon et al., Cell Reports Physical Science (2025)</em>
        </p>
        <p style={{ margin: 0 }}>
          <a 
            href="https://github.com/JinukMoon/CatBench" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0d9488', 
              textDecoration: 'none', 
              fontWeight: '600',
              fontSize: '15px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0891b2'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#0d9488'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub Repository
          </a>
        </p>
      </div>
    </div>
  );
};

export default CatBenchLeaderboard;
