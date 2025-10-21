import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye, faEdit, faBox } from "@fortawesome/free-solid-svg-icons";
import AddItem from "./addItem";
import ViewItem from "./viewItem";
import EditItem from "./editItem";
import api from "../api";
import Select from "react-select";
import { useNavigate, Routes, Route, useParams, Link } from "react-router-dom";
import "./itemMain.css";
import AccessDenied from "../access";
import ItemHistory from "./itemHistory";
import { toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ItemMain = ({ business, user, access }) => {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState({ value: '', label: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
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
    const fetchItems = async () => {
      try {
        const response = await api.post("fetch_items", { business, page, searchQuery, user, location: location.value });
        if (response?.status === "error") {
          toast.error(response.message || "Something went wrong!");
          return;
        }

        setItems(prev => page === 1 ? response.data.items : [...prev, ...response.data.items]);
        setHasNext(response.data.has_more);
        setLocations(response.data.locations);
        if (!location.value.trim()) setLocation(response.data.locations[0]);

      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          navigate("/sign_in");
        } else {
          toast.error("Failed to fetch items. Please try again.");
        }
      }
    };
    fetchItems();
  }, [navigate, page, searchQuery, location]);

  const observeSecondLast = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNext) setPage(prev => prev + 1);
    });
    if (node) observer.current.observe(node);
  }, [hasNext]);

  useEffect(() => {
    if (items.length >= 2) {
      const index = items.length - 2;
      const row = document.getElementById(`row-${index}`);
      if (row) observeSecondLast(row);
    }
  }, [items, observeSecondLast]);

  return (
    <div className="dashboard-main">
      <div className="journal-header">
        <h1>
          <FontAwesomeIcon icon={faBox} className="header-icon" /> Inventory
        </h1>
      </div>
      <Routes>
        <Route index element={
          <>
            <div className="journal-filters">
              <div className="create_access">
                {(access.create_access || access.admin) && (
                  <Link to="add" className="btn btn-outline">Add Item</Link>
                )}
              </div>
              <div className="ivi_display_box1">
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <Select
                      options={locations}
                      value={location}
                      className="ivi_select"
                      classNamePrefix="ivi_select"
                      placeholder="Select location..."
                      onChange={selected => setLocation(selected)}
                    />
                  </div>
                </div>
                <div className="ivi_subboxes1">
                  <div className="ivi_holder_box1">
                    <input
                      type="search"
                      className="ivi_input"
                      placeholder="Search items..."
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
                    <th>Actions</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Code</th>
                    <th>Model</th>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    {(access.admin || access.purchase_price_access) && <th>Cost</th>}
                    <th>Price</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.code}
                      id={`row-${index}`}
                      className={`table-row ${item.is_active === false ? 'inactive' : ''}`}
                      title={item.is_active === false ? 'Inactive item' : undefined}
                    >
                      <td>
                        <Link to={`view/${item.item_name}`} className="action-button">
                          <FontAwesomeIcon icon={faEye} />
                        </Link>
                        {(access.admin || access.edit_access) && (
                          <Link to={`edit/${item.item_name}`} className="action-button">
                            <FontAwesomeIcon icon={faEdit} />
                          </Link>
                        )}
                      </td>
                      <td>{item.category__name}</td>
                      <td>{item.brand__name}</td>
                      <td>{item.code}</td>
                      <td>{item.model}</td>
                      <td>{item.item_name}</td>
                      <td><Link to={`history/${item.item_name}`} className="quantity-link">{item.quantity}</Link></td>
                      <td>{item.unit__suffix}</td>
                      {(access.admin || access.purchase_price_access) && (
                        <td>GHS {item.purchase_price}</td>
                      )}
                      <td>GHS {item.sales_price}</td>
                      <td>GHS {(item.purchase_price * item.quantity).toFixed(2) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        } />
        {(access.admin || access.create_access) &&
          <Route path="add" element={<AddItem business={business} user={user} />} />
        }
        <Route path="view/:itemCode" element={<ViewItemWrapper access={access} user={user} business={business}/>} />
        <Route path="history/:itemCode" element={<ItemHistoryWrapper business={business} user={user} access={access} location={location.value} />} />
        {(access.admin || access.edit_access) &&
          <Route path="edit/:itemCode" element={<EditItemWrapper business={business} user={user} access={access} />} />
        }
        <Route path="*" element={<AccessDenied />} />
      </Routes>
    </div>
  );
};

const ViewItemWrapper = ({ access, user, business }) => {
  const { itemCode } = useParams();
  return <ViewItem item={itemCode} business={business} access={access} user={user} />;
};

const EditItemWrapper = ({ business, user, access }) => {
  const { itemCode } = useParams();
  return <EditItem item={itemCode} business={business} user={user} access={access} />;
};

const ItemHistoryWrapper = ({ business, user, access, location }) => {
  const { itemCode } = useParams();
  return <ItemHistory itemCode={itemCode} business={business} user={user} access={access} location={location} />;
};

export default ItemMain;
