import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faChartBar,
  faChartPie,
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

const InventoryValuation = ({ business, user }) => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeChart, setActiveChart] = useState('value');
  const [timeframe, setTimeframe] = useState('monthly');
  const [startDate, setStartDate] = useState(startOfYear);
  const [endDate, setEndDate] = useState(today);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, categoriesRes] = await Promise.all([
          api.post('fetch_inventory_valuation', { 
            business, 
            user,
            timeframe,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate,'yyyy-MM-dd'),
            category:selectedCategory
          }),
          api.post('fetch_category', { business, user })
        ]);

        if (inventoryRes === 'no access') {
          setHasAccess(false);
          return;
        }

        setInventory(inventoryRes);
        setFilteredInventory(inventoryRes);
        setCategories(categoriesRes);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    };
    fetchData();
  }, [timeframe, startDate, endDate, selectedCategory]);

  useEffect(() => {
    let result = inventory;
    
    if (searchQuery) {
      result = result.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category__name === selectedCategory);
    }
    
    setFilteredInventory(result);
  }, [inventory, searchQuery, selectedCategory]);

  const getValueChartData = () => {
    return filteredInventory
      .sort((a, b) => (b.quantity * b.purchase_price) - (a.quantity * a.purchase_price))
      .slice(0, 10)
      .map(item => ({
        name: item.item_name,
        purchaseValue: item.quantity * item.purchase_price,
        salesValue: item.quantity * item.sales_price
      }));
  };

  const getCategoryValueData = () => {
    const categoryMap = {};
    filteredInventory.forEach(item => {
      const category = item.category__name || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { purchaseValue: 0, salesValue: 0 };
      }
      categoryMap[category].purchaseValue += item.quantity * item.purchase_price;
      categoryMap[category].salesValue += item.quantity * item.sales_price;
    });
    
    return Object.entries(categoryMap).map(([name, values]) => ({
      name,
      ...values
    })).sort((a, b) => b.purchaseValue - a.purchaseValue);
  };

  const getTurnoverData = () => {
    return filteredInventory
      .filter(item => item.turnover_rate)
      .sort((a, b) => b.turnover_rate - a.turnover_rate)
      .slice(0, 10)
      .map(item => ({
        name: item.item_name,
        turnover: item.turnover_rate,
        quantity: item.quantity
      }));
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
              <Bar dataKey="purchaseValue" name="Purchase Value" fill="#8884d8" />
              <Bar dataKey="salesValue" name="Sales Value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'categories':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getCategoryValueData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="purchaseValue"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getCategoryValueData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'turnover':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getTurnoverData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="turnover" name="Turnover Rate" fill="#8884d8" />
              <Bar dataKey="quantity" name="Quantity Sold" fill="#82ca9d" />
            </BarChart>
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
          <h3>
            Inventory Valuation
          </h3>
        </div>
      </div>

      <div className="journal-filters">
        <div></div>
        <div className="ivi_display_box1">
          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <input
                className='ivi_input'
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="ivi_subboxes1">
            <div className="ivi_holder_box1">
              <Select 
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map(cat => ({ value: cat.value, label: cat.label }))
                ]}
                onChange={e => setSelectedCategory(e.value)}
                className="ivi_select"
                classNamePrefix="ivi_select"
                placeholder="Filter by Category"
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
          className={`chart-btn ${activeChart === 'value' ? 'active' : ''}`}
          onClick={() => setActiveChart('value')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Item Value
        </button>
        <button 
          className={`chart-btn ${activeChart === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveChart('categories')}
        >
          <FontAwesomeIcon icon={faChartPie} /> Categories
        </button>
        <button 
          className={`chart-btn ${activeChart === 'turnover' ? 'active' : ''}`}
          onClick={() => setActiveChart('turnover')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Turnover
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Inventory Valuation ({filteredInventory.length} items)</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Category</th>
              <th>Quantity Sold</th>
              <th>Purchase Value</th>
              <th>Sales Value</th>
              <th>Turnover Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => (
              <tr key={item.code}>
                <td className='text-right'>{item.item_name}</td>
                <td className='text-right'>{item.code}</td>
                <td className='text-right'>{item.category__name}</td>
                <td className='text-right'>{item.quantity}</td>
                <td className='text-right'>GHS {(item.quantity * item.purchase_price).toFixed(2)}</td>
                <td className='text-right'>GHS {(item.quantity * item.sales_price).toFixed(2)}</td>
                <td className='text-right'>{item.turnover_rate ? item.turnover_rate.toFixed(2) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryValuation;
