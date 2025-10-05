import { useState, useEffect } from 'react';
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
  faChevronDown,
  faInfoCircle,
  faTruck,
  faShoppingCart,
  faBoxOpen,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StockMovement = ({ business, user }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [transfers, setTransfers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('quantity');
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data] = await Promise.all([
          api.post('fetch_report_data_movements', { business, user, selectedLocation,
             startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') }),
        ]);
        
        const combinedData = [
          ...data.transfers.map(t => ({ ...t, type: 'transfer', date: t.date })),
          ...data.sales.map(s => ({ ...s, type: 'sale', date: s.date })),
          ...data.purchases.map(p => ({ ...p, type: 'purchase', date: p.date }))
        ];
        
        setTransfers(data.transfers);
        setSales(data.sales);
        setPurchases(data.purchases);
        setLocations(data.locations);
        setFilteredData(combinedData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [selectedLocation, startDate, endDate]);

  useEffect(() => {
    let result = [
      ...transfers.map(t => ({ ...t, type: 'transfer', date: t.date })),
      ...sales.map(s => ({ ...s, type: 'sale', date: s.date })),
      ...purchases.map(p => ({ ...p, type: 'purchase', date: p.date }))
    ];
    
    if (searchQuery) {
      result = result.filter(item =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.customer_info__name && item.customer_info__name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }
    
    setFilteredData(result);
  }, [transfers, sales, purchases, searchQuery, selectedType]);

  const getQuantityChartData = () => {
    const locationMap = {};
    
    filteredData.forEach(item => {
      let locationName = '';
      if (item.type === 'transfer') {
        locationName = `From ${item.from_loc__location_name} to ${item.to_loc__location_name}`;
      } else if (item.type === 'sale') {
        locationName = `Sale at ${item.location_address__location_name}`;
      } else if (item.type === 'purchase') {
        locationName = `Purchase at ${item.location_address__location_name}`;
      }
      
      if (locationName) {
        locationMap[locationName] = (locationMap[locationName] || 0) + item.total_quantity;
      }
    });
    
    return Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));
  };

  const getValueChartData = () => {
    const typeMap = {};
    
    filteredData.forEach(item => {
      const typeName = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      const value = item.net_total || item.gross_total || 0;
      typeMap[typeName] = (typeMap[typeName] || 0) + value;
    });
    
    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }));
  };

  const getTypeDistributionData = () => {
    const typeMap = {};
    
    filteredData.forEach(item => {
      typeMap[item.type] = (typeMap[item.type] || 0) + 1;
    });
    
    return Object.entries(typeMap).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
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
              <Bar dataKey="quantity" name="Movement Quantity" fill="#8884d8" />
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
              <Bar dataKey="value" name="Transaction Value" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'type':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={getTypeDistributionData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={60}
                outerRadius={180}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getTypeDistributionData().map((entry, index) => (
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
              <Line type="monotone" dataKey="quantity" stroke="#8884d8" name="Movement Trend" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'transfer':
        return <FontAwesomeIcon icon={faExchangeAlt} className="type-icon transfer" />;
      case 'sale':
        return <FontAwesomeIcon icon={faShoppingCart} className="type-icon sale" />;
      case 'purchase':
        return <FontAwesomeIcon icon={faTruck} className="type-icon purchase" />;
      default:
        return <FontAwesomeIcon icon={faInfoCircle} className="type-icon" />;
    }
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Stock Movement & Transactions
          </h2>
        </div>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>

        <div className="ivi_display_box1">
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start Date"
                className="ivi_input"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
            
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End Date"
                className="ivi_input"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
            
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <input
                className='ivi_input'
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
      
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'transfer', label: 'Transfers' },
                  { value: 'sale', label: 'Sales' },
                  { value: 'purchase', label: 'Purchases' }
                ]}
                onChange={e => setSelectedType(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by type"
              />
            </div>
          </div>
             
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={locations}
                onChange={e => setSelectedLocation(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by location"
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
          className={`chart-btn ${activeChart === 'type' ? 'active' : ''}`}
          onClick={() => setActiveChart('type')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Types
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

      <div className="details-section">
        <div className="details-header" onClick={() => setDetailsCollapsed(!detailsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faBoxOpen} className="details-icon" />
            Transaction Details ({filteredData.length})
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`details-toggle ${detailsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`details-content ${detailsCollapsed ? 'collapsed' : ''}`}>
          {filteredData.length > 0 ? (
            <div className="details-grid">
              {filteredData.map(item => (
                <div key={item.code} className={`detail-item ${item.type}`}>
                  <div className="detail-header">
                    {getTypeIcon(item.type)}
                    <span className="item-date">{item.code}</span>
                    <span className="item-code">{format(item.date, 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="detail-body">
                    <p className="item-description">{item.description || 'No description'}</p>
                    <div className="detail-meta">
                      {item.type === 'transfer' && (
                        <div className='subs-subs'>
                          <span>From: {item.from_loc__location_name}</span>
                          <span>To: {item.to_loc__location_name}</span>
                        </div>
                      )}
                      {item.type === 'sale' && (
                        <div className='subs-subs'>
                          <span>Customer: {item.customer_info__name !== 'Regular Customer' ? item.customer_info__name : item.customer_name}</span>
                          <span>Location: {item.location_address__location_name}</span>
                        </div>
                      )}
                      {item.type === 'purchase' && (
                        <div className='subs-subs'>
                          <span>Supplier: {item.supplier__name || 'N/A'}</span>
                          <span>Location: {item.location_address__location_name}</span>
                        </div>
                      )}
                      <span>Quantity: {item.total_quantity}</span>
                      <span>Value: GHS {(item.net_total || item.gross_total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-details">No transactions found for the selected filters</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockMovement;