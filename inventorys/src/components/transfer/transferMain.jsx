import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEye, faEdit, faTruckMoving } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Routes, Route, Link, useParams } from "react-router-dom";
import CreateTransfer from "./createTransfer";
import ViewTransfer from "./viewTransfer";
import EditTransfer from "./editTransfer";
import { handleDateSearch, isCompleteInput } from "../../utils/dateformat";
import AccessDenied from "../access";
import { format } from "date-fns";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TransferMain = ({ business, user, access }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchDateInput, setSearchDateInput] = useState('');
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
    const trimmed = searchDateInput.trim();
    if (!trimmed) {
      setParsed('{}');
      return;
    }
    if (isCompleteInput(trimmed)) {
      try {
        setPage(1);
        const result = handleDateSearch(trimmed);
        setParsed(JSON.stringify(result));
      } catch {
        setParsed('{}');
      }
    }
  }, [searchDateInput]);

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
                    <div className="ivi_holder_box1">
                      <input
                        type="search"
                        className="ivi_input"
                        placeholder="date e.g.p1 or p1...p3 or 01/01/2025"
                        value={searchDateInput}
                        onChange={(e) => setSearchDateInput(e.target.value)}
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
