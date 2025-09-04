import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit } from "@fortawesome/free-solid-svg-icons";
import Select from 'react-select';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LEVIES = [
  { value: 'VAT', label: 'VAT (15%)', percentage: 15 },
  { value: 'COVID_LEVY', label: 'COVID-19 Levy (1%)', percentage: 1 },
  { value: 'GETFUND', label: 'GetFund (2.5%)', percentage: 2.5 },
  { value: 'NHIS', label: 'NHIS (2.5%)', percentage: 2.5 }
];

const EditSales = (props) => {
  const [sales, setSales] = useState({
    customer: '',
    contact: '',
    address: '',
    issueDate: '',
    dueDate: '',
    description: '',
    location: null,
    discount: 0,
    levies: [],
  });
  
  const [salesItems, setSalesItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentItem, setCurrentItem] = useState({ item: null, qty: 1, price: 0 });
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const user = props.user;
  const business = props.business;
  const sale = props.sale;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [saleRes, itemsRes, locationsRes] = await Promise.all([
            axios.post('http://localhost:8000/main/view_sale/', { business, number: sale },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }),
            axios.post('http://localhost:8000/main/fetch_items/', { business },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }),
            axios.post('http://localhost:8000/main/fetch_locations/', { business },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }),
        ]);

        const saleData = saleRes.data;
        setSales({
          ...saleData.customer,
          location: {value: saleData.customer.loc, label: saleData.customer.loc},
          levies: saleData.levies
        });
        setSalesItems(saleData.items);

        setAllItems(itemsRes.data.map(item => ({
          value: item.name, 
          label: `${item.code} - ${item.brand} ${item.name}`,
          ...item
        })));
        
        setLocations(locationsRes.data);

      } catch (error) {
        if (error.response?.status === 401) navigate('/sign_in');
      }
    };
    fetchData();
  }, [business, sale, navigate]);


  const calculateTotals = () => {
    const subtotal = salesItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = subtotal * (sales.discount / 100);
    const netTotal = subtotal - discountAmount;
    
    const levyTotal = sales.levies.reduce((sum, levy) => {
      return sum + (netTotal * (levy.percentage / 100));
    }, 0);

    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      netTotal: netTotal.toFixed(2),
      levyTotal: levyTotal.toFixed(2),
      grandTotal: (netTotal + levyTotal).toFixed(2)
    };
  };

  const handleAddItem = async () => {
    if (!sales.location) {
      setErrors({ location: 'Please select a location' });
      return;
    }
    
    if (!currentItem.item || currentItem.qty < 1) {
      setErrors({ items: 'Please select an item and quantity' });
      return;
    }

    try {
      const verificationResponse = await axios.post(
        'http://localhost:8000/main/verify_sales_quantity/',
        {
          business,
          loc: sales.location.value,
          item: currentItem.item.name,
          qty: currentItem.qty
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }
      );

      if (verificationResponse.data === 'error') {
        setErrors({ items: 'Insufficient quantity in location' });
        return;
      }

      setSalesItems(prev => [...prev, {
          code: currentItem.item.code,
          name: currentItem.item.value,
          brand: currentItem.item.brand,
          qty: currentItem.qty,
          price: currentItem.price
        }]
      );
      
      setCurrentItem({ item: null, qty: 1, price: 0 });
      setErrors({});
    } catch (error) {
      if (error.response?.status === 401) navigate('/sign_in');
    }
  };

  const handleSubmit = async () => {
    if (!sales.items.length) {
      setErrors({ items: 'Please add at least one item' });
      return;
    }

    try {
      await axios.post(
        'http://localhost:8000/main/edit_sale/',
        { 
          business,
          user,
          sale,
          ...sales,
          totals: calculateTotals(),
          levies: sales.levies
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }}
      );
      navigate(-1);
    } catch (error) {
      if (error.response?.status === 401) navigate('/sign_in');
    }
  };

  const deleteSale = async () => {
    try {
      await axios.post(
        'http://localhost:8000/main/delete_sale/',
        { business, user, sale },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }}
      );
      navigate(-1);
    } catch (error) {
      if (error.response?.status === 401) navigate('/sign_in');
    }
  };

  return (
    <div className="ivi_display_mainbox">
      <div className="ia_submain_box">
        <div className="ia_description_box">
          <h2 className="ia_description_word">Edit Sales Invoice #{sale}</h2>
          <FontAwesomeIcon 
            icon={faTimesCircle} 
            className="close-button"
            onClick={() => navigate(-1)}
          />
        </div>

        {/* Customer Details Section */}
        <div className="ivi_display_box">
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Customer Name</label>
              <input
                type="text"
                className="ivi_input"
                value={sales.customer}
                onChange={e => setSales(prev => ({...prev, customer: e.target.value}))}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Contact</label>
              <input
                type="text"
                className="ivi_input"
                value={sales.contact}
                onChange={e => setSales(prev => ({...prev, contact: e.target.value}))}
              />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Address</label>
              <input
                type="text"
                className="ivi_input"
                value={sales.address}
                onChange={e => setSales(prev => ({...prev, address: e.target.value}))}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Location*</label>
              <Select
                options={locations}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={sales.location}
                onChange={selected => setSales(prev => ({...prev, location: selected}))}
              />
            </div>
          </div>

          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Discount (%)</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                max="100"
                value={sales.discount}
                onChange={e => setSales(prev => ({...prev, discount: e.target.value}))}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Levies</label>
              <Select
                isMulti
                options={LEVIES}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={sales.levies}
                onChange={selected => setSales(prev => ({...prev, levies: selected}))}
              />
            </div>
          </div>
        </div>

        {/* Item Selection Section */}
        <div className="ivi_display_box" style={{ marginTop: '2rem' }}>
          <div className="ivi_subboxes">
            <div className="ivi_holder_box">
              <label className="ivi_label">Select Item*</label>
              <Select
                options={allItems}
                className="ivi_select"
                classNamePrefix="ivi_select"
                value={currentItem.item}
                onChange={selected => setCurrentItem(prev => ({...prev, item: selected}))}
              />
            </div>
            
            <div className="ivi_holder_box">
              <label className="ivi_label">Quantity*</label>
              <input
                type="number"
                className="ivi_input"
                min="1"
                value={currentItem.qty}
                onChange={e => setCurrentItem(prev => ({...prev, qty: e.target.value}))}
              />
            </div>

            <div className="ivi_holder_box">
              <label className="ivi_label">Price*</label>
              <input
                type="number"
                className="ivi_input"
                min="0"
                value={currentItem.price}
                onChange={e => setCurrentItem(prev => ({...prev, price: e.target.value}))}
              />
            </div>
          </div>
          {errors.items && <div className="error-message">{errors.items}</div>}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="ia_preview"
            onClick={handleAddItem}
          >
            Add Item
          </button>
        </div>

        {/* Items Table */}
        <div className="ia_table_box">
          <table className="ia_main_table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Brand</th>
                <th>Item Name</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.code}</td>
                  <td>{item.brand}</td>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{item.price}</td>
                  <td>{(item.qty * item.price).toFixed(2)}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="item_action"
                      onClick={() => {
                        setCurrentItem({
                          item: allItems.find(i => i.code === item.code),
                          qty: item.qty,
                          price: item.price
                        });
                        setSalesItems(prev => prev.filter((_, i) => i !== index));
                      }}
                    />
                    <FontAwesomeIcon
                      icon={faTimesCircle}
                      className="item_action"
                      onClick={() => setSales(prev => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index)
                      }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="ivi_display_box totals-section">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>₵{calculateTotals().subtotal}</span>
          </div>
          <div className="total-row">
            <span>Discount ({sales.discount}%):</span>
            <span>-₵{calculateTotals().discount}</span>
          </div>
          {sales.levies.map(levy => (
            <div className="total-row" key={levy.value}>
              <span>{levy.label}:</span>
              <span>+₵{(calculateTotals().netTotal * (levy.percentage/100)).toFixed(2)}</span>
            </div>
          ))}
          <div className="total-row grand-total">
            <span>Grand Total:</span>
            <span>₵{calculateTotals().grandTotal}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button className="btn_primary" onClick={() => setShowConfirm(true)}>
            Save Changes
          </button>
          <button 
            className="btn_danger"
            onClick={deleteSale}
          >
            Delete Invoice
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="confirm_overlay">
            <div className="confirm_card">
              <h3>Confirm Changes</h3>
              <p>Are you sure you want to update this invoice?</p>
              <div className="confirm_actions">
                <button className="btn_confirm" onClick={handleSubmit}>
                  Confirm
                </button>
                <button className="btn_cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditSales;