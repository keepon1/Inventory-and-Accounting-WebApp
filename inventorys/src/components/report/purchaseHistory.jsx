import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faDollarSign,
  faUsers,
  faTrainTram,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { format, set, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PurchaseMetric = ({ business, user }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('expenses');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data] = await Promise.all([
          api.post('fetch_report_data_purchase_metric', { business, user, selectedLocation,
          startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') }),
        ]);
        setSales(data.sales);
        setFilteredSales(data.sales);
        setLocations(data.locations);
        if (!location.value.trim()){
            setLocation(data.locations[0])
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };
    fetchData();
  }, [selectedLocation, startDate, endDate]);

  useEffect(() => {
    let result = sales;
    
    if (searchQuery) {
      result = result.filter(sale =>
        sale.supplier__name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    
    setFilteredSales(result);
  }, [sales, searchQuery]);

  const getRevenueChartData = () => {
    return filteredSales
      .sort((a, b) => b.net_total - a.net_total)
      .slice(0, 10)
      .map(sale => ({
        name: sale.code,
        supplier: sale.supplier__name,
        expenses: sale.gross_total,
        quantity: sale.total_quantity
      }));
  };

  const getTrendChartData = () => {
    if (!filteredSales.length) return [];

    const dates = filteredSales.map(sale =>
      typeof sale.date === 'string' ? parseISO(sale.date) : sale.date
    );
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    let groupFormat = 'dd/MM/yyyy';
    if (diffDays > 31 && diffDays <= 365) {
      groupFormat = 'MMM yyyy';
    } else if (diffDays > 365) {
      groupFormat = 'yyyy';
    }

    const trendMap = {};
    filteredSales.forEach(sale => {
      const dateObj = typeof sale.date === 'string' ? parseISO(sale.date) : sale.date;
      const period = format(dateObj, groupFormat);
      if (!trendMap[period]) {
        trendMap[period] = { expenses: 0, orders: 0 };
      }
      trendMap[period].expenses += sale.gross_total;
      trendMap[period].orders += 1;
    });

    const sortFn = (a, b) => {
      if (groupFormat === 'dd/MM/yyyy') {
        const [da, ma, ya] = a.period.split('/').map(Number);
        const [db, mb, yb] = b.period.split('/').map(Number);
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
      }
      if (groupFormat === 'MMM yyyy') {
        return new Date(a.period) - new Date(b.period);
      }
      return Number(a.period) - Number(b.period);
    };

    return Object.entries(trendMap)
      .map(([period, data]) => ({
        period,
        ...data
      }))
      .sort(sortFn);
  };

  const getCustomerChartData = () => {
    const customerMap = {};
    filteredSales.forEach(sale => {
      if (!customerMap[sale.supplier__name]) {
        customerMap[sale.supplier__name] = 0;
      }
      customerMap[sale.supplier__name] += sale.gross_total;
    });
    
    return Object.entries(customerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'expenses':
        return (
          <div>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Top 10 Purchase</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={getRevenueChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="expenses" name="Expenses" fill="#8884d8" />
              <Bar dataKey="quantity" name="Quantity" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        );
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={getTrendChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.2}
                name="Expenses"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#ff7300"
                fill="#ff7300"
                fillOpacity={0.15}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'suppliers':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={getCustomerChartData()}
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
                {getCustomerChartData().map((entry, index) => (
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
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Purchase Metrics
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
          className={`chart-btn ${activeChart === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveChart('expenses')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Expenses
        </button>
        <button 
          className={`chart-btn ${activeChart === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveChart('trend')}
        >
          <FontAwesomeIcon icon={faChartLine} /> Trend
        </button>
        <button 
          className={`chart-btn ${activeChart === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveChart('suppliers')}
        >
          <FontAwesomeIcon icon={faUsers} /> Suppliers
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Purchase Summary ({filteredSales.length} transactions)</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Suppliers</th>
              <th>Items</th>
              <th>Total Invoice</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.code}>
                <td>{format(sale.date, 'dd/MM/yyyy')}</td>
                <td>{sale.code}</td>
                <td>{sale.supplier__name}</td>
                <td>{sale.total_quantity}</td>
                <td>GHS {sale.gross_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseMetric;