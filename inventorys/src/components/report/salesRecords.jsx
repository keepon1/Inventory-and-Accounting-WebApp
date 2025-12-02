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
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import AccessDenied from '../access';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SalesRecords = ({ business, user, access }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({value: 'all', label: 'All Categories'});
  const [selectedBrands, setSelectedBrands] = useState({value: 'all', label: 'All Brands'});
  
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
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [selectedLocation, startDate, endDate, selectedCategories, selectedBrands]);

  const fetchSalesData = async () => {
    try {
      const response = await api.post('fetch_sales_records', { 
        business, 
        user, 
        selectedLocation,
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0],
        category: selectedCategories.value,
        brand: selectedBrands.value

      });

      if (response === 'no access') {
        setHasAccess(false);
        return;
      };
      
      setSalesData(response.sales || { records: [], summary: {}, charts: {} });
      setFilteredRecords(response.sales.records || []);
      setLocations(response.locations || []);
      setCategories(response.categories || []);
      setBrands(response.brands || []);
      
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
        record.item_name1.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.invoice_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.brand.toLowerCase().includes(searchQuery.toLowerCase())
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
            <ResponsiveContainer width="100%" height={500}>
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
                      return [`GHS ${value}`, "Revenue"];
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
      case 'brands':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sales by Brand</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={salesData.charts.byBrand || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  yAxisId="value"
                  tickFormatter={(v) => `GHS ${Number(v).toLocaleString()}`}
                  label={{ value: 'Value (GHS)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="quantity"
                  orientation="right"
                  label={{ value: 'Quantity', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name && name.toLowerCase().includes('value')) {
                      return [`GHS ${Number(value).toFixed(2)}`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="value" dataKey="value" name="Revenue" fill="#82ca9d" />
                <Bar yAxisId="value" dataKey="profit" name="Profit" fill="#f26b28ff" />
                <Bar yAxisId="quantity" dataKey="quantity" name="Quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'categories':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sales by Category</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={salesData.charts.byCategory || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  yAxisId="value"
                  tickFormatter={(v) => `GHS ${Number(v).toLocaleString()}`}
                  label={{ value: 'Value (GHS)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="quantity"
                  orientation="right"
                  label={{ value: 'Quantity', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name && name.toLowerCase().includes('value')) {
                      return [`GHS ${Number(value).toFixed(2)}`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="value" dataKey="value" name="Revenue" fill="#ffc658" />
                <Bar yAxisId="value" dataKey="profit" name="Profit" fill="#f26b28ff" />
                <Bar yAxisId="quantity" dataKey="quantity" name="Quantity" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'trend':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Sales Trend</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={salesData.charts.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="revenue" />
                <YAxis yAxisId="profit" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    const labelMap = {
                      revenue: "Revenue",
                      cost: "Cost",
                      profit: "Profit",
                    };
                    return [`GHS ${value.toFixed(2)}`, labelMap[name] || name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#8884d8" yAxisId="revenue" />
                <Bar dataKey="cost" name="Cost" fill="#82ca9d" yAxisId="revenue" />
                <Bar dataKey="profit" name="Profit" fill="#ffc658" yAxisId="profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'profit':
        return (
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Profit by Item</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={salesData.charts.profitByItem || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={val => `GHS ${val}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={val => `${val}%`} />
                
                <Tooltip
                  formatter={(value, dataKey) => {
                    if (dataKey === "profit") return [`GHS ${value}`, "Profit"];
                    if (dataKey === "margin") return [`${value.toFixed(2)}%`, "Margin"];
                    return [value.toFixed(2), dataKey];
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
        customer: record.customer,
        total_amount: 0,
        total_profit: 0,
        items: []
      };
    }
    
    acc[record.invoice_code].items.push(record);
    acc[record.invoice_code].total_amount += record.total_price;
    acc[record.invoice_code].total_profit += record.cost ? (record.total_price - (record.cost_price * record.quantity1)) : 0;
    
    return acc;
  }, {});

  const invoiceList = Object.values(groupedRecords).sort((a, b) => 
    new Date(b.sale_date) - new Date(a.sale_date)
  );

  const totals = filteredRecords.reduce(
    (acc, record) => {
      const cost = record.cost_price * record.quantity1;
      const profit = cost ? record.total_price - record.discount + record.tax - cost : 0;

      acc.quantity += record.quantity1;
      acc.grossTotal += record.total_price;
      acc.totalPrice += record.total_price - record.discount + record.tax;
      acc.cost += cost;
      acc.profit += profit;
      acc.discount += record.discount;
      acc.tax += record.tax;

      return acc;
    },
    { quantity: 0, totalPrice: 0, cost: 0, profit: 0, discount: 0, tax: 0, grossTotal: 0 }
  );

  if (!hasAccess) {
    return <AccessDenied />;
  }

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
            <div className='ivi_holder_box1'>
              <Select
                options={categories}
                value={selectedCategories}
                onChange={e => setSelectedCategories(e)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by Categories"
              />
            </div>
          </div>

          <div className="ivi_subboxes1">
            <div className='ivi_holder_box1'>
              <Select
                options={brands}
                value={selectedBrands}
                onChange={e => setSelectedBrands(e)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by Brands"
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
          className={`chart-btn ${activeChart === 'brands' ? 'active' : ''}`}
          onClick={() => setActiveChart('brands')}
        >
          <FontAwesomeIcon icon={faFilter} /> Brands
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
                  <span>{inv.customer === 'Regular Customer' ? inv.customer_name : inv.customer}</span>
                  <span>{inv.invoice_code}</span>
                </div>
                <div className="alert-details">
                  <span>Date: {format(inv.sale_date, 'dd/MM/yyyy')}</span><br />
                  <span>Total: GHS {inv.total_amount.toFixed(2)}</span><br />
                  <span>Profit: GHS {inv.total_profit.toFixed(2)}</span><br />
                  <span>Items: {inv.items.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stock-table">
          <h3>Sales Records ({filteredRecords.length} items across {invoiceList.length} invoices)</h3>
          <table className='ia_main_table'>
            <thead className="table-header">
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total Price</th>
                <th>Cost</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {invoiceList.flatMap(inv =>
                inv.items.map(item => {
                  const cost = item.cost_price * item.quantity1;
                  const profit = cost ? item.total_price - item.discount + item.tax - cost : 0;
                  return (
                    <tr key={`${inv.invoice_code}-${item.item_name1}`} className="table-row">
                      <td>{format(inv.sale_date, 'dd/MM/yyyy')}</td>
                      <td>
                        <Link to={`/dashboard/sales/view/${inv.invoice_code}`}
                          state={{sales: inv.invoice_code, business, user, access}}>
                          {inv.invoice_code}
                        </Link>
                      </td>
                      <td>{inv.customer === 'Regular Customer' ? inv.customer_name : inv.customer}</td>
                      <td>{item.location}</td>
                      <td>{item.item_name1}</td>
                      <td>{item.category}</td>
                      <td style={{textAlign: 'center'}}>{item.quantity1}</td>
                      <td style={{backgroundColor: '#f5f3f3ff'}}>GHS {item.unit_price.toFixed(2)}</td>
                      <td>GHS {item.discount.toFixed(2)}</td>
                      <td style={{backgroundColor: '#E5E1E1'}}>GHS {(item.total_price - item.discount + item.tax).toFixed(2)}</td>
                      <td>GHS {cost.toFixed(2)}</td>
                      <td className={profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                        GHS {profit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 'large', backgroundColor: '#f5f3f3ff' }}>Totals:</td>
                <td style={{textAlign: 'center' , backgroundColor: '#dfd8d8ff'}}>{totals.quantity}</td>
                <td style={{fontWeight: 'bold', backgroundColor: '#dfd8d8ff'}}>GHS {totals.grossTotal}</td>
                <td style={{fontWeight: 'bold', backgroundColor: '#dfd8d8ff'}}>GHS {totals.discount.toFixed(2)}</td>
                <td style={{fontWeight: 'bold', backgroundColor: '#decbcbff'}}>GHS {totals.totalPrice.toFixed(2)}</td>
                <td style={{fontWeight: 'bold', backgroundColor: '#dfd8d8ff'}}>GHS {totals.cost.toFixed(2)}</td>
                <td className={totals.profit >= 0 ? 'profit-positive' : 'profit-negative'} style={{fontWeight: 'bold', backgroundColor: '#dfd8d8ff'}}>
                  GHS {totals.profit.toFixed(2)}
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