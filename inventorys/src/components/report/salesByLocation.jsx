import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMapMarkerAlt,
  faDollarSign,
  faShoppingCart,
  faChartBar,
  faChartPie,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SalesByLocation = ({ business, user }) => {
  const [sales, setSales] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeChart, setActiveChart] = useState('performance');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, locationsRes] = await Promise.all([
          api.post('fetch_sales_by_location', { business }),
          api.post('fetch_locations', { business })
        ]);
        setSales(salesRes);
        setFilteredSales(salesRes);
        setLocations(locationsRes);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = sales;
    
    if (searchQuery) {
      result = result.filter(sale =>
        sale.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedLocation !== 'all') {
      result = result.filter(sale => sale.location_id === selectedLocation);
    }
    
    if (startDate && endDate) {
      result = result.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }
    
    setFilteredSales(result);
  }, [sales, searchQuery, selectedLocation, startDate, endDate]);

  const getLocationPerformanceData = () => {
    const locationMap = {};
    filteredSales.forEach(sale => {
      if (!locationMap[sale.location_id]) {
        locationMap[sale.location_id] = {
          name: sale.location_name,
          revenue: 0,
          orders: 0
        };
      }
      locationMap[sale.location_id].revenue += sale.net_total;
      locationMap[sale.location_id].orders += 1;
    });
    
    return Object.values(locationMap).sort((a, b) => b.revenue - a.revenue);
  };

  const getProductDistributionData = () => {
    const productMap = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productMap[item.item_id]) {
          productMap[item.item_id] = {
            name: item.item_name,
            quantity: 0,
            revenue: 0
          };
        }
        productMap[item.item_id].quantity += item.quantity;
        productMap[item.item_id].revenue += item.quantity * item.price;
      });
    });
    
    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const getTrendData = () => {
    const trendMap = {};
    filteredSales.forEach(sale => {
      const month = new Date(sale.date).toISOString().slice(0, 7);
      if (!trendMap[month]) {
        trendMap[month] = {};
      }
      if (!trendMap[month][sale.location_id]) {
        trendMap[month][sale.location_id] = {
          name: sale.location_name,
          revenue: 0
        };
      }
      trendMap[month][sale.location_id].revenue += sale.net_total;
    });
    
    const months = Object.keys(trendMap).sort();
    return months.map(month => {
      const data = { month };
      Object.entries(trendMap[month]).forEach(([locId, locData]) => {
        data[`loc_${locId}`] = locData.revenue;
      });
      return data;
    });
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getLocationPerformanceData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
              <Bar dataKey="orders" name="Orders" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'products':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getProductDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="revenue"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getProductDistributionData().map((entry, index) => (
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
            <LineChart data={getTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {locations.map((loc, index) => (
                <Line 
                  key={loc.id} 
                  type="monotone" 
                  dataKey={`loc_${loc.id}`} 
                  name={loc.location_name} 
                  stroke={COLORS[index % COLORS.length]} 
                />
              ))}
            </LineChart>
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
          <FontAwesomeIcon icon={faMapMarkerAlt} className="header-icon" />
          Sales By Location
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
            placeholder="Search customers..."
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
            placeholder="Filter by Location"
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
          className={`chart-btn ${activeChart === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveChart('performance')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Performance
        </button>
        <button 
          className={`chart-btn ${activeChart === 'products' ? 'active' : ''}`}
          onClick={() => setActiveChart('products')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Products
        </button>
        <button 
          className={`chart-btn ${activeChart === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveChart('trend')}
        >
          <FontAwesomeIcon icon={faChartLine} /> Trends
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Sales Summary ({filteredSales.length} transactions)</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Location</th>
              <th>Items</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.code}>
                <td>{new Date(sale.date).toLocaleDateString()}</td>
                <td>{sale.code}</td>
                <td>{sale.customer}</td>
                <td>{sale.location_name}</td>
                <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td>${sale.net_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesByLocation;