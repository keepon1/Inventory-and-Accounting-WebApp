import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faDollarSign,
  faBox,
  faArrowLeft,
  faFilter,
  faExclamationTriangle,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SalesRecords = ({ business, user }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [salesData, setSalesData] = useState({
    records: [],
    summary: {},
    charts: {}
  });
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('items');
  const [expandedItems, setExpandedItems] = useState({});
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [selectedLocation, startDate, endDate]);

  const fetchSalesData = async () => {
    try {
      const response = await api.post('fetch_sales_records', { 
        business, 
        user, 
        selectedLocation,
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0] 
      });

      console.log('Sales Records Response:', response);
      setSalesData(response.sales || { records: [], summary: {}, charts: {} });
      setFilteredRecords(response.sales.records || []);
      setLocations(response.locations || []);
      
      if (response.locations && response.locations.length > 0 && !location.value) {
        setLocation(response.locations[0]);
      }
    } catch (error) {
      console.error('Error fetching sales records:', error);
    }
  };

  useEffect(() => {
    let result = salesData.records || [];
    
    if (searchQuery) {
      result = result.filter(record =>
        record.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.invoice_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredRecords(result);
  }, [salesData.records, searchQuery]);

  const toggleExpand = (invoiceCode) => {
    setExpandedItems(prev => ({
      ...prev,
      [invoiceCode]: !prev[invoiceCode]
    }));
  };

  const renderChart = () => {
    if (!salesData.charts) return null;

    switch (activeChart) {
      case 'items':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Top Selling Items</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesData.charts.topItems || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, dataKey) => {
                    if (dataKey === "quantity1") {
                      return [value, "Quantity"];
                    }
                    if (dataKey === "revenue") {
                      return [`$${value}`, "Revenue"];
                    }
                    return value;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="quantity1" name="Quantity" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'categories':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sales by Category</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={salesData.charts.byCategory || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  innerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {(salesData.charts.byCategory || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      case 'trend':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sales Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesData.charts.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'profit':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Profit by Item</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesData.charts.profitByItem || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={val => `$${val}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={val => `${val}%`} />
                
                <Tooltip
                  formatter={(value, dataKey) => {
                    if (dataKey === "profit") return [`$${value}`, "Profit"];
                    if (dataKey === "margin") return [`${value}%`, "Margin"];
                    return [value, dataKey];
                  }}
                />
                <Legend />

                <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#4caf50" />
                <Bar yAxisId="right" dataKey="margin" name="Margin %" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      default:
        return null;
    }
  };

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    if (!acc[record.invoice_code]) {
      acc[record.invoice_code] = {
        invoice_code: record.invoice_code,
        sale_date: record.sale_date,
        customer_name: record.customer_name,
        total_amount: 0,
        total_profit: 0,
        items: []
      };
    }
    
    acc[record.invoice_code].items.push(record);
    acc[record.invoice_code].total_amount += record.total_price;
    acc[record.invoice_code].total_profit += (record.total_price - (record.cost_price * record.quantity1));
    
    return acc;
  }, {});

  const invoiceList = Object.values(groupedRecords).sort((a, b) => 
    new Date(b.sale_date) - new Date(a.sale_date)
  );

  const totals = filteredRecords.reduce(
    (acc, record) => {
      const cost = record.cost_price * record.quantity1;
      const profit = record.total_price - cost;

      acc.quantity += record.quantity1;
      acc.totalPrice += record.total_price;
      acc.cost += cost;
      acc.profit += profit;

      return acc;
    },
    { quantity: 0, totalPrice: 0, cost: 0, profit: 0 }
  );

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Sales Records
          </h2>
        </div>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>

        <div className="ivi_display_box1">
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <input
                className='ivi_input'
                type="text"
                placeholder="Search items, invoices, or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={locations}
                value={location}
                onChange={e => {setLocation(e); setSelectedLocation(e.value)}}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Select Location"
              />
            </div>
          </div>
          
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
                dateFormat={"dd/MM/yyyy"}
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
                dateFormat={"dd/MM/yyyy"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'items' ? 'active' : ''}`}
          onClick={() => setActiveChart('items')}
        >
          <FontAwesomeIcon icon={faBox} /> Top Items
        </button>
        <button 
          className={`chart-btn ${activeChart === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveChart('categories')}
        >
          <FontAwesomeIcon icon={faFilter} /> Categories
        </button>
        <button 
          className={`chart-btn ${activeChart === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveChart('trend')}
        >
          <FontAwesomeIcon icon={faChartLine} /> Trend
        </button>
        <button 
          className={`chart-btn ${activeChart === 'profit' ? 'active' : ''}`}
          onClick={() => setActiveChart('profit')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Profit
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="details-section">
        <div className="details-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            Sales Invoices {`(${invoiceList.length})`}
          </h3>
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className={`details-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
            />
        </div>

        <div className={`details-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          <div className="details-grid">
            {invoiceList.map(inv => (
              <div className="detail-item" key={inv.invoice_code}>
                <div className="detail-header">
                  <span>{inv.customer === ''}</span>
                  <span>{inv.invoice_code}</span>
                </div>
                <div className="alert-details">
                  <span>Date: {new Date(inv.sale_date).toLocaleDateString()}</span><br />
                  <span>Total: ${inv.total_amount.toFixed(2)}</span><br />
                  <span>Profit: ${inv.total_profit.toFixed(2)}</span><br />
                  <span>Items: {inv.items.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stock-table">
          <h3>Sales Records ({filteredRecords.length} items across {invoiceList.length} invoices)</h3>
          <table className='ia_main_table'>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
                <th>Cost</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {invoiceList.flatMap(inv =>
                inv.items.map(item => {
                  const cost = item.cost_price * item.quantity1;
                  const profit = item.total_price - cost;
                  return (
                    <tr key={`${inv.invoice_code}-${item.item_name1}`}>
                      <td>{new Date(inv.sale_date).toLocaleDateString()}</td>
                      <td>{inv.invoice_code}</td>
                      <td>{inv.customer_name}</td>
                      <td>{item.item_name1}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity1}</td>
                      <td>${item.unit_price.toFixed(2)}</td>
                      <td>${item.total_price.toFixed(2)}</td>
                      <td>${cost.toFixed(2)}</td>
                      <td className={profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                        ${profit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                <td>{totals.quantity}</td>
                <td></td>
                <td>${totals.totalPrice.toFixed(2)}</td>
                <td>${totals.cost.toFixed(2)}</td>
                <td className={totals.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                  ${totals.profit.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesRecords;