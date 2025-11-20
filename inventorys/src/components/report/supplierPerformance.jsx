import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign,
  faCalendarAlt,
  faChartBar,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api';
import './itemSummary.css';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import AccessDenied from '../access';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SupplierPerformance = ({ business, user, access }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [activeChart, setActiveChart] = useState('spend');
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const suppliersRes = await api.post('fetch_report_data_purchase_metric', {
          business, user, selectedLocation,
          startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd')
        }
        );

        if (suppliersRes === 'no access') {
          setHasAccess(false);
          return;
        }

        const supplierMap = {};
        suppliersRes.sales.forEach(purchase => {
          const account = purchase.supplier__account || "Unknown";

          if (!supplierMap[account]) {
            supplierMap[account] = {
              name: purchase.supplier__name || "Unknown",
              account: account,
              total_spend: 0,
              order_count: 0,
              last_order_date: purchase.date,
              total_discount: 0,
              total_tax_levy: 0,
              total_amount_paid: 0,
              orders: []
            };
          }

          if (new Date(purchase.date) > new Date(supplierMap[account].last_order_date)) {
            supplierMap[account].last_order_date = purchase.date;
          }

          supplierMap[account].total_spend += purchase.gross_total || 0;
          supplierMap[account].order_count += 1;
          supplierMap[account].total_discount += purchase.discount || 0;
          supplierMap[account].total_tax_levy += purchase.tax_levy || 0;
          supplierMap[account].total_amount_paid += purchase.amount_paid || 0;
          supplierMap[account].orders.push(purchase);
        });

        const today = new Date();
        Object.values(supplierMap).forEach(supplier => {
          const lastOrderDate = new Date(supplier.last_order_date);
          supplier.deliveryDays = Math.floor((today - lastOrderDate) / (1000 * 60 * 60 * 24));
        });

        const supplier = Object.values(supplierMap)


        setSuppliers(supplier);
        setFilteredSuppliers(supplier);
        setLocations(suppliersRes.locations || []);
        if (!location.value.trim()) {
          setLocation(suppliersRes.locations[0] || { value: '', label: '' });
        }
      } catch (error) {
        console.error('Error fetching supplier data:', error);
      }
    };
    fetchData();
  }, [startDate, endDate, selectedLocation]);

  useEffect(() => {
    let result = suppliers;

    if (searchQuery) {
      result = result.filter(supplier =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.account.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (startDate && endDate) {
      result = result.filter(supplier => {
        const lastOrder = new Date(supplier.last_order_date);
        return lastOrder >= startDate && lastOrder <= endDate;
      });
    }

    setFilteredSuppliers(result);
  }, [suppliers, searchQuery, startDate, endDate]);

  const getSpendChartData = () => {
    return filteredSuppliers
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 10)
      .map(supplier => ({
        name: supplier.name,
        spend: (supplier.total_spend).toFixed(2),
        discount: (supplier.total_discount).toFixed(2),
        tax_levy: (supplier.total_tax_levy).toFixed(2),
        orders: supplier.order_count
      }));
  };

  const getOrdersChartData = () => {
    return filteredSuppliers
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 10)
      .map(supplier => ({
        name: supplier.name,
        orders: supplier.order_count,
        spend: supplier.total_spend,
      }));
  };

  const getSpendVsPaidChartData = () => {
    return filteredSuppliers
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 10)
      .map(supplier => ({
        name: supplier.name,
        spend: supplier.total_spend,
        paid: supplier.total_amount_paid,
      }));
  };

  const getOrdersOverTimeChartData = () => {
    const orderMap = {};
    filteredSuppliers.forEach(supplier => {
      supplier.orders.forEach(order => {
        const month = order.date.slice(0, 7); // 'YYYY-MM'
        if (!orderMap[month]) orderMap[month] = 0;
        orderMap[month] += 1;
      });
    });
    return Object.entries(orderMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'spend':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={getSpendChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId={'value'} />
              <YAxis yAxisId={'orders'} orientation="right" />
              <Tooltip />
              <Legend />
              <Bar dataKey="spend" name="Total Spend" fill="#8884d8" yAxisId={'value'} />
              <Bar dataKey="discount" name="Total Discount" fill="#67e8ffff" yAxisId={'value'}/>
              <Bar dataKey="tax_levy" name="Total Tax Levy" fill="#ffc658" yAxisId={'value'}/>
              <Bar dataKey="orders" name="Orders" fill="#82ca9d" yAxisId={'orders'}/>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'orders':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={getOrdersChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId={'value'}/>
              <YAxis yAxisId={'spend'} orientation="right" />
              <Tooltip />
              <Legend />
              <Bar dataKey="spend" name="Total Spend" fill="#82ca9d" yAxisId={'spend'}/>
              <Bar dataKey="orders" name="Orders" fill="#8884d8" yAxisId={'value'}/>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'spendVsPaid':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={getSpendVsPaidChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="spend" name="Total Spend" fill="#8884d8" />
              <Bar dataKey="paid" name="Amount Paid" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'ordersOverTime':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={getOrdersOverTimeChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" name="Orders" stroke="#8884d8" />
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
    <div className="stock-summary-container">
      <div className="summary-header">
        <div className='header-back'>
          <Link to="../" className='back-link'>
            <FontAwesomeIcon icon={faArrowLeft} className='back-icon' />
          </Link>
          <h2>
            Supplier Insights
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
          className={`chart-btn ${activeChart === 'spend' ? 'active' : ''}`}
          onClick={() => setActiveChart('spend')}
        >
          <FontAwesomeIcon icon={faDollarSign} /> Spend
        </button>
    
        <button
          className={`chart-btn ${activeChart === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveChart('orders')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Orders
        </button>
        <button
          className={`chart-btn ${activeChart === 'spendVsPaid' ? 'active' : ''}`}
          onClick={() => setActiveChart('spendVsPaid')}
        >
          <FontAwesomeIcon icon={faChartBar} /> Spend vs Paid
        </button>
        <button
          className={`chart-btn ${activeChart === 'ordersOverTime' ? 'active' : ''}`}
          onClick={() => setActiveChart('ordersOverTime')}
        >
          <FontAwesomeIcon icon={faCalendarAlt} /> Orders Over Time
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="stock-table">
        <h3>Supplier Performance ({filteredSuppliers.length} suppliers)</h3>
        <table className='ia_main_table'>
          <thead className="table-header">
            <tr>
              <th>Supplier</th>
              <th>Account</th>
              <th>Discount</th>
              <th>Tax Levy</th>
              <th>Total Paid</th>
              <th>No. of Purchases</th>
              <th>Total Spent</th>
              <th>Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map(supplier => (
              <tr key={supplier.account} className='table-row'>
                <td>
                  <Link to={`/dashboard/supplier/history/${supplier.account} - ${supplier.name}`}
                    state={{supplier: `${supplier.account} - ${supplier.name}`, business, user, access}}>
                    {supplier.name}
                  </Link>
                </td>
                <td>
                  <Link to={`/dashboard/supplier/history/${supplier.account} - ${supplier.name}`}
                    state={{supplier: `${supplier.account} - ${supplier.name}`, business, user, access}}>
                    {supplier.account}
                  </Link>
                </td>
                <td>GHS {supplier.total_discount.toFixed(2)}</td>
                <td>GHS {supplier.total_tax_levy.toFixed(2)}</td>
                <td>GHS {supplier.total_amount_paid.toFixed(2)}</td>
                <td style={{textAlign: 'center'}}>{supplier.order_count}</td>
                <td>GHS {supplier.total_spend?.toFixed(2)}</td>
                <td>{format(supplier.last_order_date, 'dd/MM/yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierPerformance;