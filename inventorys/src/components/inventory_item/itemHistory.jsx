import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBox, faCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useParams, Link } from "react-router-dom";
import "./itemHistory.css";
import { toast } from "react-toastify";
import { format } from 'date-fns';

const ItemHistory = ({ business, user, access }) => {
  const [history, setHistory] = useState([]);
  const [item, setItem] = useState(null);
  const location = localStorage.getItem('historyLocation');
  const { itemCode } = useParams();

  useEffect(() => {
    const fetchItemHistory = async () => {
      try {
        const response = await api.post("fetch_item_history", { 
          business, 
          reference: itemCode,
          user,
          location
        });
        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setItem(response.data.item);
        setHistory(response.data.history);
      } catch (error) {
        console.error("Failed to fetch item history:", error);
        toast.error("Failed to fetch item history. Please try again.");
      }
    };

    fetchItemHistory();
  }, []);

  const formatValueChange = (value, qty) => {
    const v = Number(value);
    const q = Number(qty);
    if (!Number.isFinite(v) || !Number.isFinite(q)) return "-";
    return Math.abs(v * q).toFixed(2);
  };

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <div className="header-back">
          <Link to="../" className="back-link">
              <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
          </Link>
          <h2>
            {item?.item_name || itemCode}
          </h2>
        </div>
      </div>

      <div className="history-table-box">
        <table className="history-table">
          <thead className="table-header">
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Transaction Type</th>
              <th>Reference</th>
              <th>Change</th>
              <th>Value</th>
              <th>Previous Qty</th>
              <th>New Qty</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map((record, index) => (
                <tr key={index} className="table-row">
                  <td>{format(record.date, 'dd/MM/yyyy')}</td>
                  <td>{record.user_name}</td>
                  <td>{record.transaction_type}</td>
                  <td>
                    <Link
                      to={`/dashboard/${record.transaction_type.toLowerCase().split(' ')[0]}/view/${record.reference}`}
                      state={{ [record.transaction_type.toLowerCase().split(' ')[0]]: record.reference, business, user, access }}
                    >
                      {record.reference}
                    </Link>
                  </td>
                  <td style={{textAlign: 'center'}} className={record.quantity_change > 0 ? "positive-change" : "negative-change"}>
                    {record.quantity_change > 0 ? "+" : ""}{record.quantity_change}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    {formatValueChange(record.value, record.quantity_change)}
                  </td>
                  <td style={{textAlign: 'center'}}>{record.previous_quantity}</td>
                  <td style={{textAlign: 'center'}}>{record.new_quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-history">
                  No quantity history found for this item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemHistory;