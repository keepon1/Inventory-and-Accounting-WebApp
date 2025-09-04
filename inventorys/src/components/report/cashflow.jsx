import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faArrowUp,
  faArrowDown,
  faChartLine,
  faFilter,
  faSearch,
  faFileExport,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';

const CashFlow = ({ business, user }) => {
  const [cashFlow, setCashFlow] = useState([]);
  const [filteredFlow, setFilteredFlow] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly');
  const [activeChart, setActiveChart] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const flowRes = await api.post('fetch_cash_flow', { business });
        setCashFlow(flowRes);
        setFilteredFlow(flowRes);
      } catch (error) {
        console.error('Error fetching cash flow data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = cashFlow;
    
    if (startDate && endDate) {
      result = result.filter(flow => {
        const flowDate = new Date(flow.period);
        return flowDate >= startDate && flowDate <= endDate;
      });
    }
    
    setFilteredFlow(result);
  }, [cashFlow, startDate, endDate]);

  const getOverviewData = () => {
    return filteredFlow.map(flow => ({
      period: flow.period,
      inflow: flow.inflow,
      outflow: flow.outflow,
      net: flow.inflow - flow.outflow
    }));
  };

  const getSourceData = () => {
    const sourceMap = {};
    filteredFlow.forEach(flow => {
      Object.entries(flow.sources).forEach(([source, amount]) => {
        if (!sourceMap[source]) {
          sourceMap[source] = 0;
        }
        sourceMap[source] += amount;
      });
    });
    
    return Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getTrendData = () => {
    return filteredFlow.map(flow => ({
      period: flow.period,
      inflow: flow.inflow,
      outflow: flow.outflow,
      balance: flow.balance
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
              <Bar dataKey="inflow" name="Inflow" fill="#82ca9d" />
              <Bar dataKey="outflow" name="Outflow" fill="#ff7300" />
              <Bar dataKey="net" name="Net Flow" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'sources':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getSourceData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getTrendData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="inflow" stroke="#82ca9d" name="Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#ff7300" name="Outflow" />
              <Line type="monotone" dataKey="balance" stroke="#8884d8" name="Balance" />
            </LineChart>
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
          <FontAwesomeIcon icon={faMoneyBillWave} className="header-icon" />
          Cash Flow Statement
        </h3>
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
          <FontAwesomeIcon icon={faMoneyBillWave} /> Overview
        </button>
        <button 
          className={`chart-btn ${activeChart === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveChart('sources')}
        >
          <FontAwesomeIcon icon={faArrowDown} /> Sources
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
        <h3>Cash Flow Details</h3>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Inflow</th>
              <th>Outflow</th>
              <th>Net Flow</th>
              <th>Ending Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlow.map(flow => (
              <tr key={flow.period}>
                <td>{flow.period}</td>
                <td>${flow.inflow.toFixed(2)}</td>
                <td>${flow.outflow.toFixed(2)}</td>
                <td>${(flow.inflow - flow.outflow).toFixed(2)}</td>
                <td>${flow.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlow;