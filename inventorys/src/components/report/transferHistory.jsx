import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSort, 
  faSortUp, 
  faSortDown, 
  faFilter,
  faSearch,
  faCalendarAlt,
  faTruck
} from '@fortawesome/free-solid-svg-icons';

const TransferHistory = () => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const transfers = [
    {
      id: 1,
      item: 'Laptop',
      sku: 'LP-001',
      date: '2024-03-15',
      from: 'Warehouse A',
      to: 'Store 1',
      quantity: 5,
      status: 'Completed',
      initiatedBy: 'John Doe'
    },
    // Add more transfers...
  ];

  const sortedTransfers = [...transfers].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FontAwesomeIcon icon={faSort} />;
    return sortConfig.direction === 'asc' 
      ? <FontAwesomeIcon icon={faSortUp} /> 
      : <FontAwesomeIcon icon={faSortDown} />;
  };

  const filteredTransfers = sortedTransfers.filter(transfer => {
    const matchesDate = (!startDate || new Date(transfer.date) >= startDate) &&
                      (!endDate || new Date(transfer.date) <= endDate);
    const matchesStatus = statusFilter === 'All' || transfer.status === statusFilter;
    const matchesSearch = transfer.item.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDate && matchesStatus && matchesSearch;
  });

  return (
    <div className="transfer-section">
      <div className="filters">
        <div className="filter-group">
          <label><FontAwesomeIcon icon={faCalendarAlt} /> Date Range:</label>
          <div className="date-pickers">
            <input
              selected={startDate}
              onChange={date => setStartDate(date)}
              placeholderText="Start Date"
              type='date'
              className='input-date'
            />
            <input
              selected={endDate}
              onChange={date => setEndDate(date)}
              placeholderText="End Date"
              type='date'
              className='input-date'
            />
          </div>
        </div>

        <div className="filter-group">
          <label><FontAwesomeIcon icon={faFilter} /> Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label><FontAwesomeIcon icon={faSearch} /> Search:</label>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="transfer-table">
          <thead>
            <tr>
              {['date', 'item', 'quantity', 'from', 'to', 'status'].map(header => (
                <th key={header} onClick={() => handleSort(header)}>
                  {header.charAt(0).toUpperCase() + header.slice(1)}
                  {getSortIcon(header)}
                </th>
              ))}
              <th>Initiated By</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.map(transfer => (
              <tr key={transfer.id}>
                <td>{transfer.date}</td>
                <td>{transfer.item}</td>
                <td>{transfer.quantity}</td>
                <td>{transfer.from}</td>
                <td>{transfer.to}</td>
                <td>
                  <span className={`status-badge ${transfer.status.toLowerCase()}`}>
                    <FontAwesomeIcon icon={faTruck} /> {transfer.status}
                  </span>
                </td>
                <td>{transfer.initiatedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransferHistory;