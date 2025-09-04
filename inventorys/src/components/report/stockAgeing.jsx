import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faExclamationTriangle,
  faBoxes
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StockAging = ({ business, user }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({value:'', label:''})
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState('all');
  const [activeChart, setActiveChart] = useState('quantity');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes] = await Promise.all([
          api.post('fetch_items_for_report', { business, user, location:location.value }),
        ]);
        setItems(itemsRes.items);
        setFilteredItems(itemsRes.items);
        setCategories(itemsRes.categories);
        setLocations(itemsRes.locations);
        if (!location.value.trim()){
            setLocation(itemsRes.locations[0])
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [selectedLocation]);

  useEffect(() => {
    let result = items;
    
    if (searchQuery) {
      result = result.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All Categories') {
      result = result.filter(item => item.category__name === selectedCategory);
    }
    
    if (selectedAgingBucket !== 'all') {
      result = result.filter(item => {
        const daysInStock = calculateDaysInStock(item);
        return checkAgingBucket(daysInStock, selectedAgingBucket);
      });
    }
    
    setFilteredItems(result);
  }, [items, searchQuery, selectedCategory, selectedLocation, selectedAgingBucket]);

  const calculateDaysInStock = (item) => {
    if (!item.last_sales) return 0;
    const lastMovement = new Date(item.last_sales);
    const today = new Date();
    return Math.floor((today - lastMovement) / (1000 * 60 * 60 * 24));
  };

  const checkAgingBucket = (days, bucket) => {
    switch(bucket) {
      case '0-30': return days >= 0 && days <= 30;
      case '31-60': return days >= 31 && days <= 60;
      case '61-90': return days >= 61 && days <= 90;
      case '91-180': return days >= 91 && days <= 180;
      case '180+': return days > 180;
      default: return true;
    }
  };

  const getAgingDistributionData = () => {
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '91-180': 0,
      '180+': 0
    };
    
    filteredItems.forEach(item => {
      const days = calculateDaysInStock(item);
      if (days <= 30) buckets['0-30']++;
      else if (days <= 60) buckets['31-60']++;
      else if (days <= 90) buckets['61-90']++;
      else if (days <= 180) buckets['91-180']++;
      else buckets['180+']++;
    });
    
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  };

  const getAgingValueData = () => {
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '91-180': 0,
      '180+': 0
    };
    
    filteredItems.forEach(item => {
      const days = calculateDaysInStock(item);
      const value = item.quantity * item.purchase_price;
      
      if (days <= 30) buckets['0-30'] += value;
      else if (days <= 60) buckets['31-60'] += value;
      else if (days <= 90) buckets['61-90'] += value;
      else if (days <= 180) buckets['91-180'] += value;
      else buckets['180+'] += value;
    });
    
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  };

  const getSlowMovingItems = () => {
    return filteredItems
      .filter(item => calculateDaysInStock(item) > 90)
      .sort((a, b) => calculateDaysInStock(b) - calculateDaysInStock(a));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'quantity':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getAgingDistributionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Item Count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'value':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getAgingValueData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, "Inventory Value"]} />
              <Legend />
              <Bar dataKey="value" name="Inventory Value" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'distribution':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={getAgingDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={180}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getAgingDistributionData().map((entry, index) => (
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
    <div className="dashboard-main">
      <div className="journal-header">
        <h3>
          <FontAwesomeIcon icon={faClock} className="header-icon" />
          Stock Aging Analysis
        </h3>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>

        <div className="ivi_display_box1">       
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <input
                className='ivi_input'
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={categories}
                onChange={e => setSelectedCategory(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by category"
              />
            </div>
          </div>
          
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={locations}
                value={location}
                onChange={e => {setSelectedLocation(e.value); setLocation(e)}}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by location"
              />
            </div>
          </div>
          
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={[
                  { value: 'all', label: 'All Aging Periods' },
                  { value: '0-30', label: '0-30 Days' },
                  { value: '31-60', label: '31-60 Days' },
                  { value: '61-90', label: '61-90 Days' },
                  { value: '91-180', label: '91-180 Days' },
                  { value: '180+', label: '180+ Days' }
                ]}
                onChange={e => setSelectedAgingBucket(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by aging"
              />
            </div>
          </div>
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
          className={`chart-btn ${activeChart === 'distribution' ? 'active' : ''}`}
          onClick={() => setActiveChart('distribution')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Distribution
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Slow-Moving Items ({getSlowMovingItems().length})
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          {getSlowMovingItems().length > 0 ? (
            <div className="alerts-grid">
              {getSlowMovingItems().map(item => (
                <div key={item.code} className="alert-item">
                  <div className="alert-header">
                    <span className="item-name">{item.item_name}</span>
                    <span className="item-code">{item.code}</span>
                  </div>
                  <div className="alert-details">
                    <span>Days in Stock: {calculateDaysInStock(item)}</span>
                    <span>Quantity: {item.quantity}</span>
                    <span>Value: ${(item.quantity * item.purchase_price).toFixed(2)}</span>
                    <span>Location: {location.value === "All Locations" ? "Overall" : location.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-alerts">No slow-moving items found</p>
          )}
        </div>
      </div>

      <div className="stock-table">
        <h3>Inventory Aging Report ({filteredItems.length} items)</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Category</th>
              <th>Last Movement</th>
              <th>Days in Stock</th>
              <th>Quantity</th>
              <th>Purchase Value</th>
              <th>Aging Bucket</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const daysInStock = calculateDaysInStock(item);
              let bucket = '';
              if (daysInStock <= 30) bucket = '0-30';
              else if (daysInStock <= 60) bucket = '31-60';
              else if (daysInStock <= 90) bucket = '61-90';
              else if (daysInStock <= 180) bucket = '91-180';
              else bucket = '180+';
              
              return (
                <tr key={item.code} className={daysInStock > 90 ? 'low-stock' : ''}>
                  <td>{item.item_name}</td>
                  <td>{item.code}</td>
                  <td>{item.category__name}</td>
                  <td>{item.last_sales ? new Date(item.last_sales).toLocaleDateString() : 'N/A'}</td>
                  <td>{daysInStock}</td>
                  <td>{item.quantity}</td>
                  <td>${(item.quantity * item.purchase_price).toFixed(2)}</td>
                  <td>{bucket}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockAging;