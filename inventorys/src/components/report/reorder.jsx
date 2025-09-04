import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faExclamationTriangle,
  faBell
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';

const COLORS = ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#8884D8', '#82CA9D'];

const ReorderAnalysis = ({ business, user }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [activeChart, setActiveChart] = useState('quantity');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, categoriesRes, locationsRes] = await Promise.all([
          api.post('fetch_items', { business, page:0 }),
          api.post('fetch_category', { business }),
          api.post('fetch_locations', { business })
        ]);
        setItems(itemsRes);
        setFilteredItems(itemsRes);
        setCategories(categoriesRes);
        setLocations(locationsRes);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [business]);

  useEffect(() => {
    let result = items;
    
    if (searchQuery) {
      result = result.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category__name === selectedCategory);
    }
    
    if (selectedLocation !== 'all') {
      result = result.filter(item => item.location?.id === selectedLocation);
    }
    
    if (selectedUrgency !== 'all') {
      result = result.filter(item => {
        const urgency = calculateUrgency(item);
        return selectedUrgency === 'critical' ? urgency === 'critical' : 
               selectedUrgency === 'warning' ? urgency === 'warning' : true;
      });
    }
    
    setFilteredItems(result);
  }, [items, searchQuery, selectedCategory, selectedLocation, selectedUrgency]);

  const calculateUrgency = (item) => {
    if (item.quantity <= 0) return 'critical';
    if (item.quantity <= item.reorder_level) return 'warning';
    return 'normal';
  };

  const getReorderItems = () => {
    return filteredItems
      .filter(item => item.quantity <= item.reorder_level)
      .sort((a, b) => {
        // Sort critical items first (out of stock), then by urgency
        if (a.quantity <= 0 && b.quantity > 0) return -1;
        if (b.quantity <= 0 && a.quantity > 0) return 1;
        return (a.quantity / a.reorder_level) - (b.quantity / b.reorder_level);
      });
  };

  const getCategoryDistributionData = () => {
    const categoryMap = {};
    
    getReorderItems().forEach(item => {
      const categoryName = item.category__name;
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
    });
    
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }));
  };

  const getValueImpactData = () => {
    const urgencyMap = {
      critical: 0,
      warning: 0
    };
    
    getReorderItems().forEach(item => {
      const urgency = calculateUrgency(item);
      const value = item.quantity * item.purchase_price;
      urgencyMap[urgency] += value;
    });
    
    return Object.entries(urgencyMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      }));
  };

  const getUrgencyDistributionData = () => {
    const urgencyMap = {
      critical: 0,
      warning: 0
    };
    
    getReorderItems().forEach(item => {
      const urgency = calculateUrgency(item);
      urgencyMap[urgency]++;
    });
    
    return Object.entries(urgencyMap)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      }));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'quantity':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getCategoryDistributionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Items Needing Reorder" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'value':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getValueImpactData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, "Inventory Value"]} />
              <Legend />
              <Bar dataKey="value" name="Inventory Value at Risk" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'urgency':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getUrgencyDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getUrgencyDistributionData().map((entry, index) => (
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

  return (
    <div className="stock-summary-container">
      <div className="summary-header">
        <h1>
          <FontAwesomeIcon icon={faBell} className="header-icon" />
          Reorder Analysis
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
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat.name, label: cat.name }))
            ]}
            onChange={e => setSelectedCategory(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Filter by category"
          />
        </div>
        
        <div className="filter-group">
          <Select 
            options={[
              { value: 'all', label: 'All Locations' },
              ...locations.map(loc => ({ value: loc.id, label: loc.name }))
            ]}
            onChange={e => setSelectedLocation(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Filter by location"
          />
        </div>
        
        <div className="filter-group">
          <Select 
            options={[
              { value: 'all', label: 'All Urgency Levels' },
              { value: 'critical', label: 'Critical (Out of Stock)' },
              { value: 'warning', label: 'Warning (Below Reorder Level)' }
            ]}
            onChange={e => setSelectedUrgency(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Filter by urgency"
          />
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'quantity' ? 'active' : ''}`}
          onClick={() => setActiveChart('quantity')}
        >
          <FontAwesomeIcon icon={faChartBar} /> By Category
        </button>
        <button 
          className={`chart-btn ${activeChart === 'value' ? 'active' : ''}`}
          onClick={() => setActiveChart('value')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Value Impact
        </button>
        <button 
          className={`chart-btn ${activeChart === 'urgency' ? 'active' : ''}`}
          onClick={() => setActiveChart('urgency')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Urgency
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Reorder Alerts ({getReorderItems().length})
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          {getReorderItems().length > 0 ? (
            <div className="alerts-grid">
              {getReorderItems().map(item => {
                const urgency = calculateUrgency(item);
                return (
                  <div key={item.code} className={`alert-item ${urgency}`}>
                    <div className="alert-header">
                      <span className="item-name">{item.item_name}</span>
                      <span className="item-code">{item.code}</span>
                      <span className="urgency-badge">{urgency.toUpperCase()}</span>
                    </div>
                    <div className="alert-details">
                      <span>Current: {item.quantity}</span>
                      <span>Reorder Level: {item.reorder_level}</span>
                      <span>Category: {item.category__name}</span>
                      <span>Location: {item.location?.name || 'N/A'}</span>
                      <span>Purchase Value: ${(item.quantity * item.purchase_price).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-alerts">No items below reorder level</p>
          )}
        </div>
      </div>

      <div className="stock-table">
        <h3>Reorder Recommendations ({getReorderItems().length} items)</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Category</th>
              <th>Location</th>
              <th>Current Qty</th>
              <th>Reorder Level</th>
              <th>Urgency</th>
              <th>Purchase Value</th>
              <th>Suggested Order</th>
            </tr>
          </thead>
          <tbody>
            {getReorderItems().map(item => {
              const urgency = calculateUrgency(item);
              const suggestedOrder = Math.max(
                item.reorder_level * 1.5 - item.quantity, // Order 50% more than reorder level
                item.reorder_level // At least the reorder level amount
              );
              
              return (
                <tr key={item.code} className={urgency}>
                  <td>{item.item_name}</td>
                  <td>{item.code}</td>
                  <td>{item.category__name}</td>
                  <td>{item.location?.name || 'N/A'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.reorder_level}</td>
                  <td>{urgency.toUpperCase()}</td>
                  <td>${(item.quantity * item.purchase_price).toFixed(2)}</td>
                  <td>{Math.ceil(suggestedOrder)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReorderAnalysis;