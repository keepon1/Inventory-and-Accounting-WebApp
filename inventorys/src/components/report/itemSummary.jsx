import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes,
  faChartLine,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import "./itemSummary.css"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StockSummary = ({ business, user }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [location, setLocation] = useState({value:'', label:''})
  const [category, setCategory] = useState({value:'', label:''})
  const [locations, setLocations] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
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
        setLocations(itemsRes.locations);
        if (!location.value.trim()){
            setLocation(itemsRes.locations[0])
        }
        setCategories(itemsRes.categories);
        if (!category.value.trim()){
            setCategory(itemsRes.categories[0])
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [location]);

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
    
    if (startDate && endDate) {
      result = result.filter(item => {
        const itemDate = new Date(item.creation_date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    setFilteredItems(result);
  }, [items, searchQuery, selectedCategory]);

  const getQuantityChartData = () => {
    return filteredItems
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        value: item.quantity * item.purchase_price
      }));
  };

  const getValueChartData = () => {
    return filteredItems
      .sort((a, b) => (b.quantity * b.purchase_price) - (a.quantity * a.purchase_price))
      .slice(0, 10)
      .map(item => ({
        name: item.item_name,
        purchaseValue: item.quantity * item.purchase_price,
        salesValue: item.quantity * item.sales_price
      }));
  };

  const getCategoryDistributionData = () => {
    const categoryMap = {};
    
    filteredItems.forEach(item => {
      const categoryName = item.category__name;
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + item.quantity;
    });
    
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const getReorderItems = () => {
    return filteredItems.filter(item => (item.quantity <= item.reorder_level));
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
      case 'category':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={getCategoryDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={60}
                outerRadius={200}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getCategoryDistributionData().map((entry, index) => (
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
            <AreaChart data={getQuantityChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="quantity"
                stroke="#8884d8"
                fill="#5a56a6ff"
                fillOpacity={0.5}
                name="Stock Trend"
              />
            </AreaChart>
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
          <FontAwesomeIcon icon={faBoxes} className="header-icon" />
          Stock Summary & Analytics
        </h3>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>

        <div className="ivi_display_box1">       
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={categories}
                value={category}
                onChange={e => {setSelectedCategory(e.value); setCategory(e)}}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="filter categories"
              />
            </div>
          </div>

          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={locations}
                value={location}
                onChange={e => setLocation(e)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="filter locations"
              />
            </div>
          </div>

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
          className={`chart-btn ${activeChart === 'category' ? 'active' : ''}`}
          onClick={() => setActiveChart('category')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Categories
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
                <div key={item.code} className="alert-item">
                  <div className="alert-header">
                    <span className="item-name">{item.item_name}</span>
                    <span className="item-code">{item.code}</span>
                  </div>
                  <div className="alert-details">
                    <span>Current Quantity: {item.quantity}</span>
                    <span>Reorder Level: {item.reorder_level}</span>
                    <span>Category: {item.category__name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-alerts">No items below reorder level</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockSummary;