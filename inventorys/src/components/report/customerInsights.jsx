import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, 
  ScatterChart,
  ZAxis,
  Scatter
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faDollarSign,
  faShoppingCart,
  faCalendarAlt,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import api from '../api';
import './itemSummary.css';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const CustomerInsights = ({ business, user }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('value');
  const [segmentBy, setSegmentBy] = useState('revenue');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data] = await Promise.all([
          api.post('fetch_report_data_sales_performance', { business, user, selectedLocation,
          startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') }),
        ]);
        const customerMap = {};
        data.sales.forEach(sale => {
          const account = sale.customer_info__account || 'Unknown';
          if (!customerMap[account]) {
            customerMap[account] = {
              name: sale.customer_info__name,
              account: account,
              last_purchase_date: sale.date,
              order_count: 0,
              total_spent: 0,
              total_discount: 0,
              total_tax_levy: 0,
              total_amount_paid: 0,
              orders: [],
            };
          }
          if (new Date(sale.date) > new Date(customerMap[account].last_purchase_date)) {
            customerMap[account].last_purchase_date = sale.date;
          }
          customerMap[account].order_count += 1;
          customerMap[account].total_spent += sale.gross_total || 0;
          customerMap[account].total_discount += sale.discount || 0;
          customerMap[account].total_tax_levy += sale.tax_levy || 0;
          customerMap[account].total_amount_paid += sale.amount_paid || 0;
          customerMap[account].orders.push(sale);
        });
        const today = new Date();
        Object.values(customerMap).forEach(customer => {
          const lastPurchase = new Date(customer.last_purchase_date);
          customer.recency_days = Math.floor((today - lastPurchase) / (1000 * 60 * 60 * 24));
        });
        const customers = Object.values(customerMap);

        setCustomers(customers || []);
        setFilteredCustomers(customers || []);
        setLocations(data.locations || []);
        if (!location.value.trim()){
            setLocation(data.locations[0] || { value: '', label: '' });
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };
    fetchData();
  }, [selectedLocation, startDate, endDate]);

  useEffect(() => {
    let result = customers;
    
    if (searchQuery) {
      result = result.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.account.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (startDate && endDate) {
      result = result.filter(customer => {
        const lastPurchase = new Date(customer.last_purchase_date);
        return lastPurchase >= startDate && lastPurchase <= endDate;
      });
    }
    
    setFilteredCustomers(result);
  }, [customers, searchQuery, startDate, endDate]);

  const getValueChartData = () => {
    return filteredCustomers
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10)
      .map(customer => ({
        name: customer.name,
        value: (customer.total_spent).toFixed(2),
        discount: (customer.total_discount).toFixed(2),
        tax: (customer.total_tax_levy).toFixed(2),
        orders: customer.order_count
      }));
  };

  const getRFMChartData = () => {
    return filteredCustomers.map(customer => ({
      name: customer.name,
      recency: customer.recency_days,
      frequency: customer.order_count,
      monetary: (customer.total_spent).toFixed(2),
    }));
  };

  const getSegmentChartData = () => {
    const segmentMap = {};
    filteredCustomers.forEach(customer => {
      let segment;
      if (segmentBy === 'revenue') {
        if (customer.total_spent > 1000) segment = 'High Value';
        else if (customer.total_spent > 500) segment = 'Medium Value';
        else segment = 'Low Value';
      } else {
        if (customer.order_count > 10) segment = 'Frequent';
        else if (customer.order_count > 5) segment = 'Regular';
        else segment = 'Occasional';
      }
      
      if (!segmentMap[segment]) {
        segmentMap[segment] = 0;
      }
      segmentMap[segment] += 1;
    });
    
    return Object.entries(segmentMap).map(([name, value]) => ({ name, value }));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'value':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getValueChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Total Spent" fill="#8884d8" stackId="a"/>
              <Bar dataKey="discount" name="Total Discount" fill="#ffc658" stackId="a"/>
              <Bar dataKey="tax" name="Total Tax/Levy" fill="#5ec5d9ff" stackId="a"/>
              <Bar dataKey="orders" name="Orders" fill="#82ca9d" stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'rfm':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="recency"
                name="Recency"
                label={{ value: 'Recency (days since last purchase)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="number"
                dataKey="frequency"
                name="Frequency"
                label={{ value: 'Frequency (orders)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis
                type="number"
                dataKey="monetary"
                name="Monetary"
                range={[50, 500]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10 }}>
                        <strong>{d.name}</strong><br />
                        Recency: {d.recency} days<br />
                        Frequency: {d.frequency} orders<br />
                        Monetary: ${d.monetary}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Scatter
                name="Customers"
                data={getRFMChartData()}
                fill="#8884d8"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'segments':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={getSegmentChartData()}
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
                {getSegmentChartData().map((entry, index) => (
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
        <h3>
          <FontAwesomeIcon icon={faUsers} className="header-icon" />
          Customer Insights
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
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={[
                  { value: 'revenue', label: 'Segment by Revenue' },
                  { value: 'frequency', label: 'Segment by Frequency' }
                ]}
                onChange={e => setSegmentBy(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Segment By"
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
                dateFormat={'dd/MM/yyyy'}
              />
            </div>
          </div>

          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1"></div>
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End Date"
                className="ivi_input"
                dateFormat={'dd/MM/yyyy'}
              />
            </div>
          </div>
        </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'value' ? 'active' : ''}`}
          onClick={() => setActiveChart('value')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Customer Value
        </button>
        <button 
          className={`chart-btn ${activeChart === 'rfm' ? 'active' : ''}`}
          onClick={() => setActiveChart('rfm')}
        >
          <FontAwesomeIcon icon={faShoppingCart} /> RFM Analysis
        </button>
        <button 
          className={`chart-btn ${activeChart === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveChart('segments')}
        >
          <FontAwesomeIcon icon={faUsers} /> Segments
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Customer Summary ({filteredCustomers.length} customers)</h3>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Account</th>
              <th>Last Purchase</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Total Discount</th>
              <th>Total Tax/Levy</th>
              <th>Amount Paid</th>
              <th>Avg. Order</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(customer => (
              <tr key={customer.account}>
                <td>{customer.name}</td>
                <td>{customer.account}</td>
                <td>{new Date(customer.last_purchase_date).toLocaleDateString()}</td>
                <td>{customer.order_count}</td>
                <td>${(customer.total_spent).toFixed(2)}</td>
                <td>${customer.total_discount.toFixed(2)}</td>
                <td>${customer.total_tax_levy.toFixed(2)}</td>
                <td>${customer.total_amount_paid}</td>
                <td>${(customer.total_spent / customer.order_count).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerInsights;