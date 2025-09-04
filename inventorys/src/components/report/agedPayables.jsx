import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoiceDollar,
  faCalendarDay,
  faExclamationTriangle,
  faFileExport,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AgedPayables = ({ business, user }) => {
  const [location, setLocation] = useState({ value: '', label: '' });
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [payables, setPayables] = useState([]);
  const [filteredPayables, setFilteredPayables] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date());
  const [activeChart, setActiveChart] = useState('aging');
  const [alertsCollapsed, setAlertsCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const payablesRes = await api.post('fetch_supplier_performance', { business, endDate: format(asOfDate, 'yyyy-MM-dd'), user, selectedLocation });

        setPayables(payablesRes.sales || []);
        setFilteredPayables(payablesRes.sales || []);
        setLocations(payablesRes.locations || []);
        if (!location.value.trim()) {
          setLocation(payablesRes.locations[0]);
        }
      } catch (error) {
        console.error('Error fetching payables data:', error);
      }
    };
    fetchData();
  }, [asOfDate]);

  useEffect(() => {
    let result = payables;
    if (searchQuery) {
      result = result.filter(item =>
        (item.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.account || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier__contact || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredPayables(result);
  }, [payables, searchQuery]);

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

  const getAgingChartData = () => {
    const buckets = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      over_90: 0
    };
    filteredPayables.forEach(item => {
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

  const getSupplierChartData = () => {
    return filteredPayables
      .sort((a, b) => ((b.gross_total - b.amount_paid) - (a.gross_total - a.amount_paid)))
      .slice(0, 10)
      .map(item => ({
        name: item.supplier__name,
        total: (item.gross_total - item.amount_paid),
        overdue: (item.days_30 || 0) + (item.days_60 || 0) + (item.days_90 || 0) + (item.over_90 || 0),
        contact: item.supplier__contact,
      }));
  };

  const getSupplierStackedChartData = () => {
    const suppliers = {};
    filteredPayables.forEach(item => {
      const supplier = item.supplier__name || item.supplier_name || item.account;
      if (!suppliers[supplier]) suppliers[supplier] = [];
      suppliers[supplier].push({
        code: item.code,
        value: (item.gross_total || 0) - (item.amount_paid || 0),
      });
    });

    return Object.entries(suppliers).map(([supplier, txns]) => {
      const row = { supplier };
      txns.forEach(txn => {
        row[txn.code] = txn.value;
      });
      return row;
    });
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
      case 'suppliers':
        const chartData = getSupplierStackedChartData();
        const allCodes = Array.from(new Set(filteredPayables.map(i => i.code)));
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supplier" />
              <YAxis />
              <Tooltip />
              <Legend />
              {allCodes.map((code, idx) => (
                <Bar
                  key={code}
                  dataKey={code}
                  stackId="a"
                  name={code}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const supplierAggregates = {};
  filteredPayables.forEach(item => {
    const key = item.supplier__name || item.supplier_name || item.account;
    if (!supplierAggregates[key]) {
      supplierAggregates[key] = {
        supplier: key,
        current: 0,
        days_30: 0,
        days_60: 0,
        days_90: 0,
        over_90: 0,
        total: 0,
      };
    }
    const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
    supplierAggregates[key].current += b.current;
    supplierAggregates[key].days_30 += b.days_30;
    supplierAggregates[key].days_60 += b.days_60;
    supplierAggregates[key].days_90 += b.days_90;
    supplierAggregates[key].over_90 += b.over_90;
    supplierAggregates[key].total += (item.gross_total || 0) - (item.amount_paid || 0);
  });
  const supplierRows = Object.values(supplierAggregates);

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h3>
          <FontAwesomeIcon icon={faFileInvoiceDollar} className="header-icon" />
          Aged Payables Report
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
                placeholder="Search suppliers..."
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
          className={`chart-btn ${activeChart === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveChart('suppliers')}
        >
          <FontAwesomeIcon icon={faFileInvoiceDollar} /> Suppliers
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="alerts-section">
        <div className="alerts-header" onClick={() => setAlertsCollapsed(!alertsCollapsed)}>
          <h3>
            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
            Payables Summary {`(${filteredPayables.length})`}
          </h3>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`alert-toggle ${alertsCollapsed ? 'collapsed' : ''}`} 
          />
        </div>
        <div className={`alerts-content ${alertsCollapsed ? 'collapsed' : ''}`}>
          <div className="alerts-grid">
            {filteredPayables.map(item => {
              const b = bucketizeAging(item.due_date, (item.gross_total || 0) - (item.amount_paid || 0));
              return (
                <div className="alert-item" key={item.code}>
                  <div className="alert-header">
                    <span>{item.supplier__name}<br /></span>
                    <span>{item.code}</span>
                  </div>
                  <div className="alert-details">
                    <span>Due: {item.due_date}</span>
                    {b.current !== 0 && <span>Current: ${b.current.toFixed(2)}<br /></span>}
                    {b.days_30 !== 0 && <span>1-30: ${b.days_30.toFixed(2)}<br /></span>}
                    {b.days_60 !== 0 && <span>31-60: ${b.days_60.toFixed(2)}<br /></span>}
                    {b.days_90 !== 0 && <span>61-90: ${b.days_90.toFixed(2)}<br /></span>}
                    {b.over_90 !== 0 && <span>Over 90: ${b.over_90.toFixed(2)}<br /></span>}
                    <span>Total: ${((item.gross_total || 0) - (item.amount_paid || 0)).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="stock-table">
        <h3>Payables Details ({supplierRows.length} suppliers)</h3>
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Current</th>
              <th>1-30 Days</th>
              <th>31-60 Days</th>
              <th>61-90 Days</th>
              <th>Over 90 Days</th>
              <th>Total Due</th>
            </tr>
          </thead>
          <tbody>
            {supplierRows.map(row => (
              <tr key={row.supplier}>
                <td>{row.supplier}</td>
                <td>${row.current.toFixed(2)}</td>
                <td>${row.days_30.toFixed(2)}</td>
                <td>${row.days_60.toFixed(2)}</td>
                <td>${row.days_90.toFixed(2)}</td>
                <td>${row.over_90.toFixed(2)}</td>
                <td>${row.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgedPayables;