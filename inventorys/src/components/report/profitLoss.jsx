import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faArrowDown,
  faChartLine,
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

const ProfitAndLoss = ({ business, user }) => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const [plData, setPlData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState(startOfYear);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('overview');
  const [timeframe, setTimeframe] = useState('monthly');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plRes = await api.post('fetch_profit_loss', { business, user,
          timeframe, startDate:format(startDate, 'yyyy-MM-dd'), endDate:format(endDate, 'yyyy-MM-dd')
         });

        if (plRes === 'no access') {
          setHasAccess(false);
          return;
        }

        setPlData(plRes);
        setFilteredData(plRes);
      } catch (error) {
        console.error('Error fetching P&L data:', error);
      }
    };
    fetchData();
  }, [timeframe, startDate, endDate]);


  const getOverviewData = () => {
    return filteredData.map(item => ({
      period: item.period,
      revenue: item.revenue,
      cogs: item.cogs,
      profit: (item.revenue - item.cogs).toFixed()
    }));
  };

  const getExpenseData = () => {
    const expenseMap = {};
    filteredData.forEach(item => {
      Object.entries(item.expenses).forEach(([category, amount]) => {
        if (!expenseMap[category]) {
          expenseMap[category] = 0;
        }
        expenseMap[category] += amount;
      });
    });
    
    return Object.entries(expenseMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getTrendData = () => {
    return filteredData.map(item => ({
      period: item.period,
      revenue: (item.revenue).toFixed(),
      profit: (item.revenue - item.cogs).toFixed(),
      margin: `${(((item.revenue - item.cogs) / item.revenue) * 100).toFixed()}%`
    }));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'overview':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getOverviewData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
              <Bar dataKey="cogs" name="COGS" fill="#ff7300" />
              <Bar dataKey="profit" name="Gross Profit" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'expenses':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getExpenseData()}
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
                {getExpenseData().map((entry, index) => (
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
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
              <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#ff7300" name="Margin" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

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
            Profit & Loss Statement
          </h2>
        </div>
      </div>

      <div className="journal-filters">
        <div className="create_access"></div>

        <div className="ivi_display_box1">       
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' }
                ]}
                onChange={e => setTimeframe(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Timeframe"
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
                dateFormat={'dd/MM/yyyy'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="chart-selector">
        <button 
          className={`chart-btn ${activeChart === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveChart('overview')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Overview
        </button>
        <button 
          className={`chart-btn ${activeChart === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveChart('expenses')}
        >
          <FontAwesomeIcon icon={faArrowDown} /> Expenses
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
        <h3>Profit & Loss Details</h3>
        <table>
          <thead className="table-header">
            <tr>
              <th>Period</th>
              <th>Revenue</th>
              <th>COGS</th>
              <th>Gross Profit</th>
              <th>Expenses</th>
              <th>Net Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.period} className="table-row">
                <td>{item.period}</td>
                <td>GHS {item.revenue.toFixed(2)}</td>
                <td>GHS {item.cogs.toFixed(2)}</td>
                <td>GHS {(item.revenue - item.cogs).toFixed(2)}</td>
                <td>GHS {item.total_expenses.toFixed(2)}</td>
                <td>GHS {item.net_profit.toFixed(2)}</td>
                <td>{((item.net_profit / item.revenue) * 100 || 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfitAndLoss;