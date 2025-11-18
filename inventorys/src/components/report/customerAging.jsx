import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserClock,
  faCalendarDay,
  faExclamationTriangle,
  faChevronDown,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import AccessDenied from '../access';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const CustomerAgingReport = ({ business, user, access }) => {
  const [location, setLocation] = useState({ value: '', label: '' });
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [agingData, setAgingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date());
  const [activeChart, setActiveChart] = useState('aging');
  const [alertsCollapsed, setAlertsCollapsed] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agingRes] = await Promise.all([
          api.post('fetch_customer_aging', { business, endDate: format(asOfDate, 'yyyy-MM-dd'), user, selectedLocation }),
        ]);

        if (agingRes === 'no access') {
          setHasAccess(false);
          return;
        }

        setAgingData(agingRes.sales || []);
        setFilteredData(agingRes.sales || []);
        setLocations(agingRes.locations || []);
        if (!location.value && agingRes.locations && agingRes.locations.length) {
          setLocation(agingRes.locations[0]);
        }
      } catch (error) {
        console.error('Error fetching aging data:', error);
      }
    };
    fetchData();
  }, [asOfDate, selectedLocation]);

  useEffect(() => {
    let result = agingData;
    if (searchQuery) {
      result = result.filter(item =>
        (item.customer_info__name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customer_info__account || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customer_info__contact || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredData(result);
  }, [agingData, searchQuery]);

  const getAgingChartData = () => {
    const buckets = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      over_90: 0
    };
    filteredData.forEach(item => {
      const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
      buckets.current += b.current;
      buckets.days_30 += b.days_30;
      buckets.days_60 += b.days_60;
      buckets.days_90 += b.days_90;
      buckets.over_90 += b.over_90;
    });
    return [
      { name: 'Current', value: buckets.current },
      { name: '1-30 Days', value: buckets.days_30 },
      { name: '31-60 Days', value: buckets.days_60 },
      { name: '61-90 Days', value: buckets.days_90 },
      { name: 'Over 90 Days', value: buckets.over_90 }
    ];
  };

  const getCustomerChartData = () => {
    return filteredData
      .sort((a, b) => (b.gross_total - b.amount_paid) - (a.gross_total - a.amount_paid))
      .slice(0, 10)
      .map(item => ({
        name: item.customer_info__name,
        total: (item.gross_total - item.amount_paid),
        overdue: (item.days_30 || 0) + (item.days_60 || 0) + (item.days_90 || 0) + (item.over_90 || 0),
        contact: item.customer_info__contact,
        address: item.customer_info__address
      }));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'aging':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getAgingChartData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={170}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getAgingChartData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'customers':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={getCustomerChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10 }}>
                        <strong>{d.name}</strong><br />
                        Contact: {d.contact}<br />
                        Address: {d.address}<br />
                        Total Due: GHS {d.total}<br />
                        Overdue: GHS {d.overdue}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="total" name="Total Due" fill="#8884d8" />
              <Bar dataKey="overdue" name="Overdue" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  function bucketizeAging(due_date, amount_due) {
    let buckets = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      over_90: 0
    };
    if (!due_date || !amount_due) return buckets;
    const today = new Date();
    const due = new Date(due_date);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) buckets.current += amount_due;
    else if (diffDays <= 30) buckets.days_30 += amount_due;
    else if (diffDays <= 60) buckets.days_60 += amount_due;
    else if (diffDays <= 90) buckets.days_90 += amount_due;
    else buckets.over_90 += amount_due;
    return buckets;
  }

  const totalBuckets = filteredData.reduce(
    (acc, item) => {
      const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
      acc.days_30 += b.days_30;
      acc.days_60 += b.days_60;
      acc.days_90 += b.days_90;
      acc.over_90 += b.over_90;
      return acc;
    },
    { days_30: 0, days_60: 0, days_90: 0, over_90: 0 }
  );

  const customerAggregates = {};
  filteredData.forEach(item => {
    const key = item.customer_info__name || item.customer_info__account || item.account;
    if (!customerAggregates[key]) {
      customerAggregates[key] = {
        customer: key,
        code: item.customer_info__account || item.account || 'N/A',
        current: 0,
        days_30: 0,
        days_60: 0,
        days_90: 0,
        over_90: 0,
        total: 0,
      };
    }
    const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
    customerAggregates[key].current += b.current;
    customerAggregates[key].days_30 += b.days_30;
    customerAggregates[key].days_60 += b.days_60;
    customerAggregates[key].days_90 += b.days_90;
    customerAggregates[key].over_90 += b.over_90;
    customerAggregates[key].total += (item.gross_total || 0) - (item.amount_paid || 0);
  });
  const customerRows = Object.values(customerAggregates);

  if (!hasAccess) {
    return <AccessDenied />;
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Customer Aging Report
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
                placeholder="Search customers..."
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
                onChange={loc => {
                  setLocation(loc);
                  setSelectedLocation(loc.value);
                }}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by Location"
              />
            </div>
          </div>

          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <DatePicker
                selected={asOfDate}
                onChange={date => setAsOfDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="As of Date"
                className="ivi_input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'aging' ? 'active' : ''}`}
          onClick={() => setActiveChart('aging')}
        >
          <FontAwesomeIcon icon={faCalendarDay} /> Aging Buckets
        </button>
        <button 
          className={`chart-btn ${activeChart === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveChart('customers')}
        >
          <FontAwesomeIcon icon={faUserClock} /> Customers
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Recievables Summary {`(${filteredData.length})`}
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          <div className="alerts-grid">
            {filteredData.map(item => {
              const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
              return (
                <div className="alert-item" key={item.code}>
                  <div className="alert-header">
                    <span>{item.customer_info__name}</span>
                    <span>
                      <Link to={`/dashboard/sales/view/${item.code}`}
                        state={{sales: item.code, business, user, access}}
                      >
                        {item.code}
                      </Link>
                    </span>
                  </div>
                  <div className="alert-details">
                    <span>Due: {format(item.due_date, 'dd/MM/yyyy')}</span><br />
                    {b.current !== 0 && <span>Current: GHS {b.current.toFixed(2)}<br /></span>}
                    {b.days_30 !== 0 && <span>1-30: GHS {b.days_30.toFixed(2)}<br /></span>}
                    {b.days_60 !== 0 && <span>31-60: GHS {b.days_60.toFixed(2)}<br /></span>}
                    {b.days_90 !== 0 && <span>61-90: GHS {b.days_90.toFixed(2)}<br /></span>}
                    {b.over_90 !== 0 && <span>Over 90: GHS {b.over_90.toFixed(2)}<br /></span>}
                    <span>Total: GHS {((item.gross_total || 0) - (item.amount_paid || 0)).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="stock-table">
        <h3>Aging Details ({customerRows.length} customers)</h3>
        <table className='ia_main_table'>
          <thead className="table-header">
            <tr>
              <th>Customer Code</th>
              <th>Customer</th>
              <th>Current</th>
              <th>1-30 Days</th>
              <th>31-60 Days</th>
              <th>61-90 Days</th>
              <th>Over 90 Days</th>
              <th>Total Due</th>
            </tr>
          </thead>
          <tbody>
            {customerRows.map(row => (
              <tr key={row.code} className="table-row">
                <td>
                  <Link to={`/dashboard/customer/history/${row.code} - ${row.customer}`}
                    state={{customer: `${row.code} - ${row.customer}`, business, user, access}}
                  >
                    {row.code}
                  </Link>
                </td>
                <td>
                  <Link to={`/dashboard/customer/history/${row.code} - ${row.customer}`}
                    state={{customer: `${row.code} - ${row.customer}`, business, user, access}}
                  >
                    {row.customer}
                  </Link>
                </td>
                <td>GHS {row.current.toFixed(2)}</td>
                <td>GHS {row.days_30.toFixed(2)}</td>
                <td>GHS {row.days_60.toFixed(2)}</td>
                <td>GHS {row.days_90.toFixed(2)}</td>
                <td>GHS {row.over_90.toFixed(2)}</td>
                <td>GHS {row.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerAgingReport;