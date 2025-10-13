import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Select from 'react-select';
import AsyncSelect from "react-select/async";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { customerLoadOptions, itemsLoadOptions, sourceLocationsLoadOptions, taxLevyLoadOptions } from "../../utils/fetchData";
import { toast } from "react-toastify";
import { add, set } from "date-fns";


const CreateSales = ({ business, user, access }) => {
  const [sales, setSales] = useState({
    customer: '',
    address: '',
    contact: '',
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    description: '',
    location: null,
    discount: 0,
    selectedLevi: [],
    saleType: 'regular',
    account: null,
    terms: {value: 'Full Payment', label: 'Full Payment'},
    partPaymentAmount: 0,
  });
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [taxLevy, setTaxLevy] = useState([]);  
  const [locations, setLocations] = useState([]);
  const [currentItem, setCurrentItem] = useState({ item: null, qty: 1, price: 0 });
  const [salesItems, setSalesItems] = useState([]);
  const [termOption, setTermOption] = useState({account:false, amount:false, due:false});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  
  const printRef = useRef();
  const navigate = useNavigate();

  const handleSaleTypeChange = (type) => {
    setSales(prev => ({
      ...prev,
      saleType: type,
      customer: '',
      address: '',
      contact: '',
      customerObject: null,
      account: null,
      description:'',
      dueDate: new Date().toISOString().split("T")[0],
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const loc = typeof access.per_location_access[0] == 'object' ? access.per_location_access[0].location_name : access.per_location_access[0] || `''`;
        if (!loc || loc === "''") {
          toast.error('No location assigned. Please contact admin.');
          return;
        }
        const [itemsRes, locationsRes, taxRes, customerRes, accountRes] = await Promise.all([
          api.post('fetch_items_for_select', {business, user, value:'', location: loc}),
          api.post('fetch_source_locations_for_select', { business, user, value:'' }),
          api.post('fetch_tax_levy', { business, value:'' }),
          api.post('fetch_customer', { business, value:''}),
          api.post('fetch_accounts', { business, type:'payment' }),
        ]);

        if (itemsRes.status === 'error' || locationsRes.status === 'error' || taxRes.status === 'error' || customerRes.status === 'error' || accountRes.status === 'error'){
          toast.error(itemsRes.message || locationsRes.message || taxRes.message || customerRes.message || accountRes.message || 'Failed to fetch initial data');
          return;
        }
    
        setItems(itemsRes.data);
        setTaxLevy(taxRes);
        setCustomer(customerRes);
        const allowed = ['Bank', 'Cash', 'Mobile Money']
        const account = accountRes.filter(acc => allowed.includes(acc.account_type__name))
        .map(acc => ({
          value: acc.code,
          label: `${acc.code} - ${acc.name}`,
          type: acc.account_type__name
        }));
        setAccounts(account);
        setLocations(locationsRes.data);
      } catch (error) {
        toast.error("An error occurred while fetching initial data.");
        if (error.response?.status === 401) navigate('/sign_in');
      }
    };
    fetchData();
  }, []);

  const calculateTotals = () => {
    const subtotal = salesItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountAmount = subtotal * (sales.discount / 100);
    const netTotal = subtotal - discountAmount;
    
    const levyAmount = sales.selectedLevi.reduce((sum, levy) => {
      return sum + (netTotal * (levy.rate / 100));
    }, 0);

    return {
      subtotal,
      discountAmount,
      netTotal,
      levyAmount,
      grandTotal: netTotal + levyAmount
    };
  };

  const handleAddItem = async () => {
    if (!sales.location) {
      toast.info('Please select a location');
      return;
    }

    if (!sales.customer) {
      toast.info('Please select Customer');
      return;
    }

    if (!sales.terms) {
      toast.info('Please select payment terms');
      return;
    }

    if (!sales.account && sales.terms.label !== 'Credit') {
      toast.info('Please select account');
      return;
    }
    
    if (!currentItem.item) {
      toast.info('Please select an item');
      return;
    }

    if (currentItem.qty < 1) {
      toast.info('Quantity must be at least 1');
      return;
    }

    if (currentItem.price < 0) {
      toast.info('Price cannot be negative');
      return;
    }

    if (loading) {
      toast.info('Please wait... adding item');
      return;
    }

    try {
      const matchingItems = salesItems.filter(
      item => item.name === currentItem.item.item_name
      );

      const existingQty = matchingItems.reduce(
      (sum, item) => sum + parseFloat(item.qty), 0
      );
      const totalQty = existingQty + parseFloat(currentItem.qty);

      setLoading(true);
      const verificationResponse = await api.post(
        'verify_sales_quantity',
        {
          business, item:{loc: sales.location.value, item: currentItem.item.item_name, qty: totalQty},
        }
      );

      if (verificationResponse.status === 'error') {
        toast.error(verificationResponse.message || 'Insufficient quantity in location');
        setLoading(false);
        return;
      }

      setSalesItems(prev => [...prev, {
        code: currentItem.item.code,
        name: currentItem.item.value,
        item_name: currentItem.item.value,
        value: currentItem.item.value,
        label: currentItem.item.value,
        brand: currentItem.item.brand,
        unit__suffix: currentItem.item.unit__suffix,
        model: currentItem.item.model,
        category__name: currentItem.item.category__name,
        qty: currentItem.qty,
        price: currentItem.price,
      }]);
      setCurrentItem({ item: null, qty: 1, price: 0 });
      setLoading(false);
      toast.success(verificationResponse.message || "Item added to preview list");

    } catch (error) {
      toast.error("An error occurred while adding the item.");
      setLoading(false);
      console.error('Fetch error:', error);
      if (error.response?.status === 401) navigate('/sign_in');
    }
  };

  const handleSubmit = async (print = false) => {
    if (!salesItems.length) {
      toast.info('Please add at least one item');
      return;
    }

    if (!sales.location) {
      toast.info('Please select a location');
      return;
    }

    if (!sales.customer) {
      toast.info('Please select Customer');
      return;
    }

    if (loading) {
      toast.info('Please wait... submitting');
      return;
    }

    const totals = calculateTotals();

    const formData = new FormData();
    formData.append('user', user);
    formData.append('business', business);
    formData.append('description', sales.description);
    formData.append('customer', typeof sales.customer === 'object' && sales.customer !== null
    ? sales.customer.value
    : sales.customer);
    formData.append('date', sales.issueDate);
    formData.append('dueDate', sales.dueDate);
    formData.append('location', sales.location.value);
    formData.append('discount', sales.discount);
    formData.append('terms', typeof sales.terms === 'object' && sales.terms !== null? sales.terms.value : 'Full Payment');
    formData.append('account', sales.account?.value || `10101 - ''`);
    formData.append('partpayment', sales.partPaymentAmount);
    formData.append('totals', JSON.stringify(totals));
    formData.append('levy', JSON.stringify(sales.selectedLevi));
    formData.append('type', sales.saleType);

    salesItems.forEach((item) =>{
      formData.append('items', JSON.stringify({name:item.name, qty:item.qty, price:item.price}));
    });
    
    try {
      setLoading(true);
      const response = await api.post(
        'add_sales',
        formData,
      );

      if (response.status === 'success'){
        toast.success(response.message || 'Sales was created successfully');
        
        if (print) {
          setPrintData({
            id: response.data.code,
            business,
            user,
            customer: typeof sales.customer === 'object' ? sales.customer.label : sales.customer,
            date: sales.issueDate,
            dueDate: sales.dueDate,
            location: sales.location.label,
            description: sales.description,
            discount: sales.discount,
            terms: typeof sales.terms === 'object' ? sales.terms.label : sales.terms,
            account: sales.account?.label || '',
            partPaymentAmount: sales.partPaymentAmount,
            address: response.data.address,
            phone: response.data.phone,
            email: response.data.email,
            items: salesItems,
            totals: calculateTotals()
          });
          setTimeout(() => {
            window.print();
            navigate(-1);
          }, 500);
        } else {
          navigate(-1);
        }
      } else{
        toast.error(response.message || 'Failed to create sales invoice');
        setLoading(false);
        return;
      }
      
    } catch (error) {
      toast.error("An error occurred while creating the sales invoice.");
      setLoading(false);
      console.error('Fetch error:', error);
      if (error.response?.status === 401) 
        navigate('/sign_in');
    }
  };

  const totals = calculateTotals();

  return (
    <>
      {!printData && (
        <div className="ivi_display_mainbox">
          <div className="ia_submain_box">
            <div className="ia_description_box">
              <div className="header-back">
                <Link to="../" className="back-link">
                  <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                </Link>
                <h2 className="ia_description_word">Create Sales Invoice</h2>
              </div>
            </div>

            <div className="sale-type-selector">
              <label className="sale-type-label">
                <input
                  type="radio"
                  value="regular"
                  checked={sales.saleType === 'regular'}
                  onChange={() => handleSaleTypeChange('regular')}
                />
                Regular Sale
              </label>
              <label className="sale-type-label">
                <input
                  type="radio"
                  value="registered"
                  checked={sales.saleType === 'registered'}
                  onChange={() => handleSaleTypeChange('registered')}
                />
                Sale to Registered Customer
              </label>
            </div>

            <div className="ivi_display_box">
              {sales.saleType === 'regular' ? (
                <>
                <div className="ivi_subboxes">
                    <div className="ivi_holder_box">
                    <label className="ivi_label">Customer Name</label>
                    <input
                        type="text"
                        className="ivi_input"
                        value={sales.customer}
                        onChange={e => [setSales({...sales, customer: e.target.value}), setErrors('')]}
                    />
                    {errors.customer && <div className="error-message">Type customer's name</div>}
                    </div>
                
                    <div className="ivi_holder_box">
                    <label className="ivi_label">Account</label>
                    <Select
                      options={accounts}
                      className="ivi_select"
                      classNamePrefix="ivi_select"
                      value={sales.account}
                      onChange={selected => [setSales({...sales, account: selected}), setErrors('')]}
                      required
                    />
                    {errors.account && <div className="error-message">{errors.account}</div>}
                  </div>
                </div>

                <div className="ivi_subboxes">
                    <div className="ivi_holder_box">
                    <label className="ivi_label">Date</label>
                    <input
                        type="date"
                        className="ivi_input"
                        value={sales.issueDate}
                        onChange={e => setSales({...sales, issueDate: e.target.value})}
                    />
                    </div>  
                
                    <div className="ivi_holder_box">
                      <label className="ivi_label">Location*</label>
                      <AsyncSelect
                        cacheOptions
                        defaultOptions={locations}
                        className="ivi_select"
                        classNamePrefix="ivi_select"
                        loadOptions={sourceLocationsLoadOptions(business, user)}
                        value={sales.location}
                        onChange={selected => [setSales({...sales, location: selected}), setErrors({})]}
                      />
                      {errors.location && <div className="error-message">{errors.locations}</div>}
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
                        onChange={e => setSales({...sales, discount: e.target.value})}
                    />
                    </div>
                
                    <div className="ivi_holder_box">
                      <label className="ivi_label">Taxes / Levies</label>
                      <AsyncSelect
                        isMulti
                        cacheOptions
                        defaultOptions={taxLevy}
                        className="ivi_select"
                        classNamePrefix="ivi_select"
                        loadOptions={taxLevyLoadOptions(business)}
                        value={sales.selectedLevi}
                        onChange={selected => setSales({...sales, selectedLevi: selected})}
                      />
                    </div>                
                </div>
                </>
              ):(
                <>
                <div className="ivi_subboxes">
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Customer</label>
                      <AsyncSelect
                        cacheOptions
                        defaultOptions={customer}
                        className="ivi_select"
                        classNamePrefix="ivi_select"
                        loadOptions={customerLoadOptions(business)}
                        value={sales.supplier}
                        onChange={selected => setSales({...sales, customer: selected})}
                      />
                      {errors.customer && <div className="error-message">{errors.customer}</div>}
                  </div>
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Description</label>
                    <input
                      type="text"
                      className="ivi_input"
                      value={sales.description}
                      onChange={e => setSales({...sales, description: e.target.value})}
                    />
                  </div>
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Payment Terms</label>
                    <Select
                      options={[
                        { value: 'Full Payment', label: 'Full Payment' },
                        { value: 'Part Payment', label: 'Part Payment' },
                        { value: 'Credit', label: 'Credit' },
                      ]}
                      className="ivi_select"
                      classNamePrefix="ivi_select"
                      value={sales.terms}
                      onChange={(selected) => {
                        if (selected.value === 'Full Payment') {
                          setTermOption({ ...termOption, account: true, amount: false, due: false });
                        } else if (selected.value === 'Part Payment') {
                          setTermOption({ ...termOption, account: true, amount: true, due: true });
                        } else if (selected.value === 'Credit') {
                          setTermOption({ ...termOption, account: false, amount: false, due: true });
                        }

                        setSales({ ...sales, terms: selected });
                      }}
                    />
                  </div>
                </div>

                <div className="ivi_subboxes">
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Date</label>
                    <input
                      type="date"
                      className="ivi_input"
                      value={sales.issueDate}
                      onChange={e => setSales({...sales, issueDate: e.target.value})}
                    />
                  </div>
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Location*</label>
                    <AsyncSelect
                      cacheOptions
                      defaultOptions={locations}
                      className="ivi_select"
                      classNamePrefix="ivi_select"
                      loadOptions={sourceLocationsLoadOptions(business, user)}
                      value={sales.location}
                      onChange={selected => [setSales({...sales, location: selected}), setErrors({})]}
                    />
                    {errors.location && <div className="error-message">{errors.locations}</div>}
                  </div>
                  {termOption.account &&
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Payment Method</label>
                    <Select
                      options={accounts}
                      className="ivi_select"
                      classNamePrefix="ivi_select"
                      value={sales.account}
                      onChange={selected => setSales({...sales, account: selected})}
                      required
                    />

                    {errors.account && <div className="error-message">{errors.account}</div>}
                  </div>}

                  {termOption.due &&
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Due Date</label>
                    <input
                      type="date"
                      className="ivi_input"
                      min="0"
                      step="0.01"
                      value={sales.dueDate}
                      onChange={e => setSales({...sales, dueDate: e.target.value})}
                    />
                  </div>}
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
                      onChange={e => setSales({...sales, discount: e.target.value})}
                    />
                  </div>
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Taxes / Levies</label>
                      <AsyncSelect
                        cacheOptions
                        isMulti
                        defaultOptions={taxLevy}
                        className="ivi_select"
                        classNamePrefix="ivi_select"
                        loadOptions={taxLevyLoadOptions(business)}
                        value={sales.selectedLevi}
                        onChange={selected => setSales({...sales, selectedLevi: selected})}
                      />
                  </div>
                  {termOption.amount &&
                  <div className="ivi_holder_box">
                    <label className="ivi_label">Part Payment Amount</label>
                    <input
                      type="number"
                      className="ivi_input"
                      min="0"
                      step="0.01"
                      value={sales.partPaymentAmount}
                      onChange={e => setSales({...sales, partPaymentAmount: e.target.value})}
                    />
                  </div>}
                </div>
                </>
              )}
            </div>

            <div className="ivi_display_box" style={{ marginTop: '1rem' }}>
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Select Item*</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={items}
                    className="ivi_select"
                    classNamePrefix="ivi_select"
                    loadOptions={itemsLoadOptions(business, user, sales.location?.value || `''`)}
                    value={currentItem.item}
                    onChange={selected => [setCurrentItem({...currentItem, item: selected, price:selected.price}), setErrors({})]}
                  />
                  {errors.items && <div className="error-message">{errors.items}</div>}
                </div>
              </div>
                
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Quantity*</label>
                  <input
                    type="number"
                    className="ivi_input"
                    min="1"
                    value={currentItem.qty}
                    onChange={e => [setCurrentItem({...currentItem, qty: e.target.value}), setErrors({})]}
                  />
                  {errors.quantity && <div className="error-message">{errors.quantity}</div>}
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Unit Price*</label>
                  <input
                    type="number"
                    className="ivi_input"
                    min="0"
                    step="0.01"
                    value={currentItem.price}
                    onChange={e => setCurrentItem({...currentItem, price: e.target.value})}
                    disabled={!access.purchase_price_access && !access.admin}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={handleAddItem}
              >
                 Preview
              </button>
            </div>

            <div className="ia_table_box">
              <table className="ia_main_table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Code</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th className='action-width'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category__name}</td>
                      <td>{item.code}</td>
                      <td>{item.brand}</td>
                      <td>{item.model}</td>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit__suffix}</td>
                      <td>GHS {item.price}</td>
                      <td>GHS {(item.qty * item.price).toFixed(2)}</td>
                      <td>
                        <FontAwesomeIcon
                          icon={faEdit}
                          className="item_action"
                          onClick={() => {
                            setCurrentItem({
                              item: salesItems.find(i => i.code === item.code),
                              qty: item.qty,
                              price: item.price
                            });
                            setSalesItems(prev => prev.filter((_, i) => i !== index));
                          }}
                        />
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="item_action"
                          onClick={() => setSalesItems(prev => prev.filter((_, i) => i !== index))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ivi_display_box totals-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>GHS {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Discount ({sales.discount}%):</span>
                <span>- GHS {totals.discountAmount.toFixed(2)}</span>
              </div>
              {sales.selectedLevi.map(levy => (
                <div className="total-row" key={levy.value}>
                  <span>{levy.label}:</span>
                  <span>+ GHS {(totals.netTotal * (levy.rate/100)).toFixed(2)}</span>
                </div>
              ))}
              <div className="total-row grand-total">
                <span>Grand Total:</span>
                <span>{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="ia_add_item_mbox">
              <button className="btn btn-outline" onClick={() => handleSubmit(false)}>
                Create Sales Invoice
              </button>
              <button 
                className="btn btn-outline" 
                style={{ marginLeft: "1rem" }}
                onClick={() => handleSubmit(true)}
              >
                Create & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {printData && (
        <div ref={printRef} className="print-container">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
            <h3 style={{ margin: "0.5rem 0" }}>SALES INVOICE</h3>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ textAlign: "left" }}>
              <h4>Company Info</h4>
              {printData.address && <p><b>Address:</b> {printData.address}</p>}
              {printData.phone && <p><b>Phone:</b> {printData.phone}</p>}
              {printData.email && <p><b>Email:</b> {printData.email}</p>}
              {printData.location && <p><b>Location:</b> {printData.location}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <h3>Invoice To</h3>
              <p><b>Invoice #:</b> {printData.id}</p>
              <p><b>Customer:</b> {printData.customer}</p>
              <p><b>Date:</b> {printData.date}</p>
              <p><b>Due Date:</b> {printData.dueDate}</p>
              <p><b>Payment Terms:</b> {printData.terms}</p>
              {printData.description && <p><b>Description:</b> {printData.description}</p>}
            </div>
          </div>

          <table className="ia_main_table" style={{ marginTop: "1rem", width: "100%" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.qty} {item.unit__suffix}</td>
                  <td>GHS {item.price}</td>
                  <td>GHS {(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem", textAlign: "right" }}>
            <div style={{ display: "inline-block", textAlign: "left" }}>
              <p><b>Subtotal:</b> GHS {printData.totals.subtotal.toFixed(2)}</p>
              <p><b>Discount ({printData.discount}%):</b> - GHS {printData.totals.discountAmount.toFixed(2)}</p>
              {printData.totals.levyAmount > 0 && (
                <p><b>Taxes/Levies:</b> + GHS {printData.totals.levyAmount.toFixed(2)}</p>
              )}
              <p style={{ fontSize: "1.1em", fontWeight: "bold" }}>
                <b>Grand Total:</b> GHS {printData.totals.grandTotal.toFixed(2)}
              </p>
              {printData.partPaymentAmount > 0 && (
                <p><b>Part Payment:</b> GHS {printData.partPaymentAmount.toFixed(2)}</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: "3rem", display: "flex", justifyContent: "space-between" }}>
            <div>
            </div>
            <div>
              <p>{printData.customer}</p>
              <p>____________________</p>
              <p>Customer Signature</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
};

export default CreateSales;