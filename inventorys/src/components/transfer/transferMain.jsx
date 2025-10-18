import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye, faEdit, faTruckMoving } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreateTransfer from "./createTransfer";
import ViewTransfer from "./viewTransfer";
import EditTransfer from "./editTransfer";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TransferMain = ({ business, user, access }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [parsed, setParsed] = useState('{}');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const observer = useRef(null);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    setPage(1);
    if (waitTimeout) clearTimeout(waitTimeout);
    const timeout = setTimeout(() => {
      setSearchQuery(e.target.value.trim().toLowerCase());
    }, 500);
    setWaitTimeout(timeout);
  };

  useEffect(() => {
    // When both dates are selected, send parsed as JSON { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
    if (!startDate || !endDate) {
      setParsed('{}');
      return;
    }
    setPage(1);
    const s = format(startDate, "yyyy-MM-dd");
    const e = format(endDate, "yyyy-MM-dd");
    setParsed(JSON.stringify({ start: s, end: e }));
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const response = await api.post("fetch_transfer", {
          business,
          page,
          searchQuery,
          user,
          parsed,
        });

        if (response.status === "success") {
          const { transfer, has_more } = response.data;
          setTransfers((prev) =>
            page === 1 ? transfer : [...prev, ...transfer]
          );
          setHasNext(has_more);
  
        } else {
          toast.error(response.message || "Failed to fetch transfers");
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          navigate("/sign_in");
        } else {
          toast.error("Unexpected error while fetching transfers");
        }
      }
    };
    fetchTransfers();
  }, [navigate, page, searchQuery, parsed]);

  const observeSecondLast = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNext) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasNext]
  );

  useEffect(() => {
    if (transfers.length >= 2) {
      const index = transfers.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [transfers, observeSecondLast]);


  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faTruckMoving} className="header-icon" /> Transfers
        </h1>
      </div>

      <Routes>
        <Route
          index
          element={
            <>
              <div className="journal-filters">
                <div className="create_access">
                  {(access.admin || access.create_access) && (
                    <Link to="create" className="btn btn-outline">
                      Create Transfer
                    </Link>
                  )}
                </div>
                <div className="ivi_display_box1">
                  <div className="ivi_subboxes1">
                    <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        placeholderText="Start date"
                        dateFormat="dd/MM/yyyy"
                        className="ivi_input"
                        isClearable
                      />
                    </div>
                  </div>
                  <div className="ivi_subboxes1">
                    <div className="ivi_holder_box1" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        placeholderText="End date"
                        dateFormat="dd/MM/yyyy"
                        className="ivi_input"
                        isClearable
                      />
                    </div>
                  </div>
                  <div className="ivi_subboxes1">
                    <div className="ivi_holder_box1">
                      <input
                        type="search"
                        className="ivi_input"
                        placeholder="Search transfers..."
                        value={searchInput}
                        onChange={handleSearch}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="items-table-box">
                <table className="items-table">
                  <thead className="table-header">
                    <tr>
                      <th>View</th>
                      <th>Transfer No</th>
                      <th>Date</th>
                      <th>From Location</th>
                      <th>To Location</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transfers.map((transfer, index) => (
                      <tr
                        key={transfer.code}
                        id={`row-${index}`}
                        className="table-row"
                      >
                        <td>
                          <Link
                            to={`view/${transfer.code}`}
                            className="action-button"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Link>
                        </td>
                        <td>{transfer.code}</td>
                        <td>{format(new Date(transfer.date), "dd/MM/yyyy")}</td>
                        <td>{transfer.from_loc__location_name}</td>
                        <td>{transfer.to_loc__location_name}</td>
                        <td>{transfer.description}</td>
                        <td>{transfer.total_quantity}</td>
                        <td>{transfer.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          }
        />
        {(access.admin || access.create_access) && (
          <Route
            path="create"
            element={<CreateTransfer business={business} user={user} access={access} />}
          />
        )}
        <Route
          path="view/:transferNumber"
          element={<ViewTransferWrapper business={business} transfers={transfers} user={user} access={access} />}
        />
        {(access.admin || access.edit_access) && (
          <Route
            path="edit/:transferNumber"
            element={
              <EditTransferWrapper
                transfers={transfers}
                business={business}
                user={user}
                access={access}
              />
            }
          />
        )}
        <Route path="*" element={<AccessDenied />} />
      </Routes>
    </div>
  );
};

const ViewTransferWrapper = ({ access, user, business }) => {
  const { transferNumber } = useParams();
  return <ViewTransfer business={business} transfer={transferNumber} access={access} user={user} />;
};

const EditTransferWrapper = ({ business, user }) => {
  const { transferNumber } = useParams();
  return <EditTransfer transfer={transferNumber} business={business} user={user} />;
};

export default TransferMain;
