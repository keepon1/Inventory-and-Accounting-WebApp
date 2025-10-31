import React, { useEffect, useState } from "react";
import api from "../api";
import { data, useNavigate } from "react-router-dom";
import Select from 'react-select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes, faChartLine, faDollarSign,
  faBoxOpen, faPercentage, faArrowUp, faArrowDown
} from "@fortawesome/free-solid-svg-icons";
import './dashMain.css';

const DashMain = ({business, user}) => {
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    totalQuantity: 0,
    sales: { sale: 0, qty: 0, profit: 0 },
    totalSales: { month: 0, today: 0, trend: 'down' },
    totalPurchases: { month: 0, today: 0, trend: 'up' },
    totalTransfers: { 
      monthIn: 0, 
      monthOut: 0, 
      todayIn: 0, 
      todayOut: 0,
      monthTrend: 'up',
      todayTrend: 'down'
    },
    totalItemsInStock: 0,
  });

  const [additionalData, setAdditionalData] = useState({
    purchasesVsSalesData: [],
    stockByCategoryData: [],
    stockByBrandData: [],
    topSellingItems: [],
    lowStockItems: [],
  });

  const navigate = useNavigate();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.post(
          'dashboard_stock',
          { business, user, selectedLocation },
        );

        if (typeof response == 'object'){
          
          const data = response.dashboard_data;
          const category = response.category;
          const brand = response.brand;
          const total_quantity = response.total_quantity;
          const low_stock = response.low_stock

          setMetrics({
            totalTransfers: {
              monthIn: data.month_in,
              monthOut: data.month_out,
              todayIn: data.day_in,
              todayOut: data.day_out,
              monthTrend: 'up',
              todayTrend: 'down'
            },
            totalSales: {
              month: data.month_sales,
              today: data.day_sales,
              trend: 'down'
            },
            totalPurchases: {
              month: data.month_purchase,
              today: data.day_purchase,
              trend: 'up'
            },
            totalItemsInStock: total_quantity.total_quantity
          });

          setAdditionalData({
            purchasesVsSalesData: data.purchase_vs_sales,
            stockByCategoryData: category,
            stockByBrandData: brand,
            topSellingItems: data.top_items,
            lowStockItems:low_stock
          });
          
          setLocations(response.locations);
          if (!location.value.trim()){
            setLocation(response.locations[0])
          }
        }

      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };

    fetchDashboardData();
  }, [selectedLocation]);

  const renderTrendIcon = (trend) => {
    return trend === 'up' ? (
      <FontAwesomeIcon icon={faArrowUp} className="trend-up" />
    ) : (
      <FontAwesomeIcon icon={faArrowDown} className="trend-down" />
    );
  };

  return (
    <div className="dashboard-main">
      <div className="dashboard-header1">
        <div className="dashboard-header2">
          <h1>
            <FontAwesomeIcon icon={faChartLine} /> Business Dashboard
          </h1>
        </div>
        <div className="ivi_display_box1">
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select
                options={locations}
                value={location}
                onChange={e => {setLocation(e); setSelectedLocation(e.label);}}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Select Location"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className="metric-value">
            GHS₵ {metrics.totalSales.month.toLocaleString()} / GHS₵ {metrics.totalSales.today.toLocaleString()}
            {renderTrendIcon(metrics.totalSales.trend)}
          </div>
          <div className="metric-label">Total Sales This Month / Today</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className="metric-value">
            GHS₵ {metrics.totalPurchases.month.toLocaleString()} / GHS₵ {metrics.totalPurchases.today.toLocaleString()}
            {renderTrendIcon(metrics.totalPurchases.trend)}
          </div>
          <div className="metric-label">Total Purchases This Month / Today</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <FontAwesomeIcon icon={faBoxes} />
          </div>
          <div className="metric-value">
            <span className="transfer-value">
              {metrics.totalTransfers.monthIn.toLocaleString()} 
              {renderTrendIcon(metrics.totalTransfers.monthTrend)}
            </span>
            <span> / </span>
            <span className="transfer-value">
              {metrics.totalTransfers.monthOut.toLocaleString()}
              {renderTrendIcon(metrics.totalTransfers.todayTrend)}
            </span>
          </div>
          <div className="metric-label">Total Quantities IN / OUT This Month</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <FontAwesomeIcon icon={faBoxes} />
          </div>
          <div className="metric-value">
            <span className="transfer-value">
              {metrics.totalTransfers.todayIn.toLocaleString()}
              {renderTrendIcon(metrics.totalTransfers.monthTrend)}
            </span>
            <span> / </span>
            <span className="transfer-value">
              {metrics.totalTransfers.todayOut.toLocaleString()}
              {renderTrendIcon(metrics.totalTransfers.todayTrend)}
            </span>
          </div>
          <div className="metric-label">Total Quantities IN / OUT Today</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <FontAwesomeIcon icon={faBoxOpen} />
          </div>
          <div className="metric-value">{metrics.totalItemsInStock.toLocaleString()}</div>
          <div className="metric-label">Total Items in Stock</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Sales Trend (Daily)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={additionalData.purchasesVsSalesData}>
              <XAxis dataKey="day" />
              <YAxis yAxisId='value' />
              <YAxis yAxisId='quantity' orientation="right" />
              <Tooltip />
              <Line dataKey="sales_value" stroke="#4361ee" strokeWidth={2} yAxisId='value' />
              <Line dataKey="sales_quantity" stroke="#95e751ff" strokeWidth={2} yAxisId='quantity' />
            </LineChart>
          </ResponsiveContainer>
        </div>

        
        <div className="ia_table_box">
          <h3>Top 10 Selling Items This Month</h3>
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item</th>
                <th>Code</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {additionalData.topSellingItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.category}</td>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td className="text-right">{item.total_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ia_table_box">
          <h3>Low Stock Items</h3>
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Reorder</th>
                <th>Stock</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {additionalData.lowStockItems.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td className="text-right">{item.reorder}</td>
                  <td className="text-right">{item.stock}</td>
                  <td className="text-right">{item.difference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-card">
          <h3>Purchases vs Sales</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={additionalData.purchasesVsSalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId='value'/>
              <YAxis yAxisId='quantity' orientation="right" />
              <Tooltip />
              <Legend />

              <Bar dataKey="purchase_value" stackId="p" fill="#ef48d0ff" name="Purchase Value" yAxisId="value" />
              <Bar dataKey="sales_value" stackId="p" fill="#4361ee" name="Sales Value" yAxisId="value" />
              <Bar dataKey="purchase_quantity" stackId="s" fill="#4cc9f0" name="Purchase Quantity" yAxisId="quantity"/>
              <Bar dataKey="sales_quantity" stackId="s" fill="#7209b7" name="Sales Quantity" yAxisId="quantity"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Stock by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={additionalData.stockByCategoryData}
                dataKey="values"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={65}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {additionalData.stockByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Pie
                data={additionalData.stockByCategoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={30}
                labelLine={false}
                legendType="none"
              >
                {additionalData.stockByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => {
                const dataKey = props.dataKey;
                return [`${dataKey === 'value' ? 'Quantity: ' : 'Value: GHS '}${value}`, name];
              }}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Stock by brands</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={additionalData.stockByBrandData}
                dataKey="values"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={65}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {additionalData.stockByBrandData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Pie
                data={additionalData.stockByBrandData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={30}
                labelLine={false}
                legendType="none"
              >
                {additionalData.stockByBrandData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => {
                const dataKey = props.dataKey;
                return [`${dataKey === 'value' ? 'Quantity: ' : 'Value: GHS '}${value}`, name];
              }}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashMain;