import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTimesCircle, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { set } from "date-fns";

const LocationItem = ({location, business, user, access }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [waitTimeout, setWaitTimeout] = useState(null);
  const [detail, setDetail] = useState({name:'', category:'', price:0, reorder:0})
  const [showEdit, setShowEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef(null);
  const navigate = useNavigate();
  const editOverlayRef = useRef(null);


  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    setPage(1);

    if (waitTimeout) {
      clearTimeout(waitTimeout);
    }

    const timeout = setTimeout(() => {
      setSearchQuery(e.target.value.trim().toLowerCase());
    }, 500); 

    setWaitTimeout(timeout);
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await api.post(
          'fetch_items',
          { business, page, searchQuery, user, location},
        );
        if (response.status === 'success'){
          setItems(prev => page === 1 ? response.data.items : [...prev, ...response.data.items]);
          setHasNext(response.has_more);
        }else{
          toast.error(response.message || 'Error fetching items');
          return;
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('access');
          navigate('/sign_in');
        }
      }
    };

    fetchItems();
  }, [navigate, page, searchQuery]);

  const handleEditOverlay = (e) => {
    if (editOverlayRef.current && !editOverlayRef.current.contains(e.target)) {
      setShowEdit(false);
    }
  };

  const observeSecondLast = useCallback(node => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNext) {
        setPage(prev => prev + 1);
      }
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

  const openedit = (index) => {
    const info = items[index];
    setDetail({name:info.item_name, category:info.category__name, price:info.sales_price, reorder:info.reorder_level});
    setShowEdit(true);
    document.addEventListener('mousedown', handleEditOverlay);
  }

  const saveEdit = async() => {
    if (detail.price < 0 || detail.reorder < 0 || !detail.name){
      toast.error('Price and Reorder level must be non-negative');
      return;
    }

    if (isNaN(detail.price) || isNaN(detail.reorder)) {
      toast.error('Price and Reorder level must be valid numbers');
      return;
    }

    if (loading) {
      toast.info('Please wait, saving changes');
      return;
    }

    try{
      setLoading(true);
      const response = await api.post('edit_location_item', {location, business, user,
        item:detail.name, price:detail.price, reorder:detail.reorder
      });

      if (response.status === 'success'){
        toast.success(response.message || 'Item updated successfully');
        setShowEdit(false);
        setDetail({name:'', category:'', price:0, reorder:0});

        const updated = await api.post(
          'fetch_items',
          { business, page, searchQuery, user, location},
        );
        if (updated.status === 'success'){
          setItems(prev => page === 1 ? updated.data.items : [...prev, ...updated.data.items]);
          setHasNext(updated.data.has_more);
        }else{
          toast.error(updated.message || 'Error fetching items');
          return;
        }
      }else{
        toast.error(updated.message || 'Error updating item');
        setLoading(false);
        return;
      }
    }
    catch(error){
      if (error.response?.status === 401) {
        navigate('/sign_in');
      }
      toast.error('An error occurred while updating the item');
      setLoading(false);
      console.error('Error details:', error);
      return;
    }
  }

  return (
    <div className="dashboard-main">
      <div className="item-header">
        <div className="create_access">
          {(access.create_access || access.admin) && (
            <div className="header-back">
              <Link to="../" className="back-link">
                <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
              </Link>
              <h2 >
                {location}
              </h2>
            </div>
          )}
        </div>

        <div className="ivi_display_box1">               
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
            <tr>{(access.admin || access.edit_access) &&(
              <th>Edit</th>
            )}
              <th>Category</th>
              <th>Brand</th>
              <th>Code</th>                  
              <th>Model</th>                  
              <th>Name</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Total Cost</th>
              <th>Reorder</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item.code} id={`row-${index}`} className="table-row">
                  {(access.admin || access.edit_access) &&(
                    <td>
                      <button className="action-button" onClick={() => openedit(index)}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    
                    </td>
                  )}
                <td>{item.category__name}</td>
                <td>{item.brand}</td>
                <td>{item.code}</td>
                <td>{item.model}</td>
                <td>{item.item_name}</td>
                <td>{item.quantity}</td>
                <td>{item.unit__suffix}</td>
                <td>GHS {item.sales_price}</td>
                <td>GHS {(item.purchase_price * item.quantity).toFixed(2) || 0}</td>
                <td>{item.reorder_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <div className="modal-overlay">
          <div className="modal" ref={editOverlayRef}>
            <div className="modal-header">
              <h2>{detail.category} - {detail.name}</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowEdit(false)}
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                </button>
            </div>


            <div className="form-group">
              <label className="ivi_label">Sales Price</label>
              <input
                type="number"
                value={detail.price}
                className="ivi_input"
                onChange={(e) => setDetail({...detail, price: e.target.value})}
                min={0}
                step={0.01}
              />
            </div>

            <div className="form-group">
              <label className="ivi_label">Reorder Level</label>
              <input
                type="number"
                value={detail.reorder}
                className="ivi_input"
                onChange={(e) => setDetail({...detail, reorder: e.target.value})}
                min={0}
                step={0.01}
              />
            </div>

            <div>
              <button className="btn btn-primary" onClick={() => saveEdit()}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default LocationItem;