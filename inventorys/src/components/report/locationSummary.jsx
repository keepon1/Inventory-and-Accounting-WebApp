import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWarehouse,
  faChartLine,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './locationSummary.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const LocationSummary = ({ business, user }) => {
  const [locations, setLocations] = useState([]);
  const [locationItems, setLocationItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeChart, setActiveChart] = useState('quantity');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsRes, locationItemsRes] = await Promise.all([
          api.post('fetch_locations', { business }),
          api.post('fetch_location_items', { business })
        ]);
        setLocations(locationsRes);
        setLocationItems(locationItemsRes);
        setFilteredItems(locationItemsRes);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = locationItems;
    
    if (searchQuery) {
      result = result.filter(item =>
        item.item_name__item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_name__code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_name__brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedLocation !== 'all') {
      result = result.filter(item => item.location__location_name === selectedLocation);
    }
    
    if (startDate && endDate) {
      result = result.filter(item => {
        const itemDate = new Date(item.item_name__creation_date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    setFilteredItems(result);
  }, [locationItems, searchQuery, selectedLocation, startDate, endDate]);

  const getQuantityChartData = () => {
    const locationData = {};
    
    filteredItems.forEach(item => {
      const locName = item.location__location_name;
      if (!locationData[locName]) {
        locationData[locName] = 0;
      }
      locationData[locName] += parseFloat(item.quantity);
    });
    
    return Object.entries(locationData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, quantity]) => ({
        name,
        quantity,
        value: quantity * parseFloat(filteredItems.find(i => i.location__location_name === name)?.purchase_price || 0)
      }));
  };

  const getValueChartData = () => {
    const locationData = {};
    
    filteredItems.forEach(item => {
      const locName = item.location__location_name;
      if (!locationData[locName]) {
        locationData[locName] = {
          purchaseValue: 0,
          salesValue: 0
        };
      }
      locationData[locName].purchaseValue += parseFloat(item.quantity) * parseFloat(item.purchase_price);
      locationData[locName].salesValue += parseFloat(item.quantity) * parseFloat(item.sales_price);
    });
    
    return Object.entries(locationData)
      .sort((a, b) => b[1].purchaseValue - a[1].purchaseValue)
      .slice(0, 10)
      .map(([name, values]) => ({
        name,
        ...values
      }));
  };

  const getItemDistributionData = () => {
    const itemMap = {};
    
    filteredItems.forEach(item => {
      const itemName = item.item_name__item_name;
      itemMap[itemName] = (itemMap[itemName] || 0) + parseFloat(item.quantity);
    });
    
    return Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  const getReorderItems = () => {
    return filteredItems.filter(item => (parseFloat(item.quantity) <= parseFloat(item.reorder_level)));
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
              <Bar dataKey="quantity" name="Stock Quantity" fill="#8884d8" />
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
              <Bar dataKey="purchaseValue" name="Purchase Value" fill="#ff7300" />
              <Bar dataKey="salesValue" name="Sales Value" fill="#387908" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'items':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getItemDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getItemDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getQuantityChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="quantity" stroke="#8884d8" name="Stock Trend" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="location-summary-container">
      <div className="summary-header">
        <h1>
          <FontAwesomeIcon icon={faWarehouse} className="header-icon" />
          Location Summary & Analytics
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
              ...locations.map(loc => ({ value: loc.location_name, label: loc.location_name }))
            ]}
            onChange={e => setSelectedLocation(e.value)}
            className="ivi_select"
            classNamePrefix="ivi_select"
            placeholder="Filter locations"
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
          className={`chart-btn ${activeChart === 'items' ? 'active' : ''}`}
          onClick={() => setActiveChart('items')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Items
        </button>
        <button 
          className={`chart-btn ${activeChart === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveChart('trend')}
        >
          <FontAwesomeIcon icon={faChartLine} /> Trend
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
              {getReorderItems().map(item => (
                <div key={`${item.item_name__code}-${item.location__id}`} className="alert-item">
                  <div className="alert-header">
                    <span className="item-name">{item.item_name__item_name}</span>
                    <span className="item-code">{item.item_name__code}</span>
                    <span className="location-name">{item.location__location_name}</span>
                  </div>
                  <div className="alert-details">
                    <span>Current: {item.quantity}</span>
                    <span>Reorder Level: {item.reorder_level}</span>
                    <span>Location: {item.location__location_name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-alerts">No items below reorder level</p>
          )}
        </div>
      </div>

      <div className="location-table">
        <h3>Location Inventory Summary ({filteredItems.length} items)</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Location</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Purchase Value</th>
              <th>Sales Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={`${item.item_name__code}-${item.location__id}`}>
                <td>{item.item_name__item_name}</td>
                <td>{item.item_name__code}</td>
                <td>{item.location__location_name}</td>
                <td className={parseFloat(item.quantity) <= parseFloat(item.reorder_level) ? 'low-stock' : ''}>
                  {item.quantity}
                </td>
                <td>{item.item_name__unit__suffix}</td>
                <td>${(parseFloat(item.quantity) * parseFloat(item.purchase_price)).toFixed(2)}</td>
                <td>${(parseFloat(item.quantity) * parseFloat(item.sales_price)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationSummary;