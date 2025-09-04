import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExchangeAlt,
  faChartLine,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faExclamationTriangle,
  faWarehouse
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const TransferRecommendations = ({ business, user }) => {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationItems, setLocationItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeChart, setActiveChart] = useState('quantity');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, locationsRes, locationItemsRes] = await Promise.all([
          api.post('fetch_items', { business, page: 0 }),
          api.post('fetch_locations', { business }),
          api.post('fetch_location_items', { business })
        ]);
        
        setItems(itemsRes);
        setLocations(locationsRes);
        setLocationItems(locationItemsRes);
        
        // Generate recommendations based on inventory levels
        const recs = generateTransferRecommendations(itemsRes, locationsRes, locationItemsRes);
        setRecommendations(recs);
        setFilteredRecommendations(recs);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [business]);

  const generateTransferRecommendations = (items, locations, locationItems) => {
    const recommendations = [];
    
    // For each item, check distribution across locations
    items.forEach(item => {
      const itemLocations = locationItems.filter(li => li.item_name.id === item.id);
      
      // Only process items that exist in multiple locations
      if (itemLocations.length > 1) {
        // Find locations with surplus and deficit
        const surplusLocations = itemLocations.filter(li => li.quantity > item.reorder_level * 1.5);
        const deficitLocations = itemLocations.filter(li => li.quantity < item.reorder_level);
        
        // Generate transfer recommendations
        surplusLocations.forEach(fromLoc => {
          deficitLocations.forEach(toLoc => {
            const maxTransfer = fromLoc.quantity - item.reorder_level;
            const needed = item.reorder_level - toLoc.quantity;
            const transferQty = Math.min(maxTransfer, needed);
            
            if (transferQty > 0) {
              recommendations.push({
                item: item,
                fromLocation: fromLoc.location,
                toLocation: toLoc.location,
                quantity: transferQty,
                urgency: toLoc.quantity / item.reorder_level, // Lower = more urgent
                value: transferQty * item.purchase_price
              });
            }
          });
        });
      }
    });
    
    return recommendations.sort((a, b) => a.urgency - b.urgency);
  };

  useEffect(() => {
    let result = recommendations;
    
    if (searchQuery) {
      result = result.filter(rec =>
        rec.item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.item.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedLocation !== 'all') {
      result = result.filter(rec => 
        rec.fromLocation.id === selectedLocation || 
        rec.toLocation.id === selectedLocation
      );
    }
    
    if (startDate && endDate) {
      result = result.filter(rec => {
        const itemDate = new Date(rec.item.creation_date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    setFilteredRecommendations(result);
  }, [recommendations, searchQuery, selectedLocation, startDate, endDate]);

  const getQuantityChartData = () => {
    return filteredRecommendations
      .slice(0, 10)
      .map(rec => ({
        name: rec.item.item_name,
        quantity: rec.quantity,
        fromLocation: rec.fromLocation.location_name,
        toLocation: rec.toLocation.location_name
      }));
  };

  const getValueChartData = () => {
    return filteredRecommendations
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(rec => ({
        name: rec.item.item_name,
        value: rec.value,
        fromLocation: rec.fromLocation.location_name,
        toLocation: rec.toLocation.location_name
      }));
  };

  const getLocationDistributionData = () => {
    const locationMap = {};
    
    filteredRecommendations.forEach(rec => {
      const fromLoc = rec.fromLocation.location_name;
      const toLoc = rec.toLocation.location_name;
      
      locationMap[fromLoc] = (locationMap[fromLoc] || 0) - rec.quantity;
      locationMap[toLoc] = (locationMap[toLoc] || 0) + rec.quantity;
    });
    
    return Object.entries(locationMap).map(([name, value]) => ({ 
      name, 
      value: Math.abs(value),
      type: value > 0 ? 'Receiving' : 'Sending'
    }));
  };

  const getUrgentRecommendations = () => {
    return filteredRecommendations.filter(rec => rec.urgency < 0.5);
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'quantity':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getQuantityChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" name="Transfer Quantity" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'value':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getValueChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Transfer Value ($)" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'location':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getLocationDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getLocationDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const executeTransfer = async (recommendation) => {
    try {
      const transferData = {
        business,
        from_loc: recommendation.fromLocation.id,
        to_loc: recommendation.toLocation.id,
        items: [{
          item_id: recommendation.item.id,
          quantity: recommendation.quantity
        }],
        description: `Automated transfer based on recommendation`
      };
      
      await api.post('create_transfer', transferData);
      // Refresh data after transfer
      const [itemsRes, locationItemsRes] = await Promise.all([
        api.post('fetch_items', { business, page: 0 }),
        api.post('fetch_location_items', { business })
      ]);
      
      setItems(itemsRes);
      setLocationItems(locationItemsRes);
      const recs = generateTransferRecommendations(itemsRes, locations, locationItemsRes);
      setRecommendations(recs);
      setFilteredRecommendations(recs);
      
      alert('Transfer executed successfully!');
    } catch (error) {
      console.error('Error executing transfer:', error);
      alert('Failed to execute transfer');
    }
  };

  return (
    <div className="transfer-recommendations-container">
      <div className="summary-header">
        <h1>
          <FontAwesomeIcon icon={faExchangeAlt} className="header-icon" />
          Transfer Recommendations
        </h1>
        <div className="header-controls">
          <button className="btn btn-outline">
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <input
            className='ivi_input'
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <Select 
            options={[
              { value: 'all', label: 'All Locations' },
              ...locations.map(loc => ({ value: loc.id, label: loc.location_name }))
            ]}
            onChange={e => setSelectedLocation(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Filter by location"
          />
        </div>
        
        <div className="filter-group">
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start Date"
            className="ivi_input"
          />
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="End Date"
            className="ivi_input"
          />
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'quantity' ? 'active' : ''}`}
          onClick={() => setActiveChart('quantity')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Quantity
        </button>
        <button 
          className={`chart-btn ${activeChart === 'value' ? 'active' : ''}`}
          onClick={() => setActiveChart('value')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Value
        </button>
        <button 
          className={`chart-btn ${activeChart === 'location' ? 'active' : ''}`}
          onClick={() => setActiveChart('location')}
        >
          <FontAwesomeIcon icon={faWarehouse} /> Locations
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Urgent Transfer Recommendations ({getUrgentRecommendations().length})
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          {getUrgentRecommendations().length > 0 ? (
            <div className="alerts-grid">
              {getUrgentRecommendations().map((rec, index) => (
                <div key={index} className="alert-item">
                  <div className="alert-header">
                    <span className="item-name">{rec.item.item_name}</span>
                    <span className="item-code">{rec.item.code}</span>
                  </div>
                  <div className="alert-details">
                    <span>From: {rec.fromLocation.location_name}</span>
                    <span>To: {rec.toLocation.location_name}</span>
                    <span>Quantity: {rec.quantity}</span>
                    <span>Urgency: {rec.urgency < 0.3 ? 'High' : rec.urgency < 0.5 ? 'Medium' : 'Low'}</span>
                  </div>
                  <button 
                    className="btn btn-primary execute-btn"
                    onClick={() => executeTransfer(rec)}
                  >
                    Execute Transfer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-alerts">No urgent transfer recommendations</p>
          )}
        </div>
      </div>

      <div className="recommendations-table">
        <h3>All Transfer Recommendations ({filteredRecommendations.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>From Location</th>
              <th>To Location</th>
              <th>Quantity</th>
              <th>Value</th>
              <th>Urgency</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecommendations.map((rec, index) => (
              <tr key={index}>
                <td>{rec.item.item_name}</td>
                <td>{rec.item.code}</td>
                <td>{rec.fromLocation.location_name}</td>
                <td>{rec.toLocation.location_name}</td>
                <td>{rec.quantity}</td>
                <td>${rec.value.toFixed(2)}</td>
                <td className={`urgency-${rec.urgency < 0.3 ? 'high' : rec.urgency < 0.5 ? 'medium' : 'low'}`}>
                  {rec.urgency < 0.3 ? 'High' : rec.urgency < 0.5 ? 'Medium' : 'Low'}
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => executeTransfer(rec)}
                  >
                    Transfer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransferRecommendations;