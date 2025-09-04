import React, { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle, faEdit } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const EditTransfer = (props) => {
    const [transfer, setTransfer] = useState({
        to: null,
        from: null,
        issueDate: '',
        description: '',
    });
    const [transferItems, setTransferItems] = useState([]);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedItem, setSelectedItem] = useState({
        item: null,
        qty: 1
    });
    const [showPreview, setShowPreview] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState('');
    const overlayRef = useRef(null);
    const navigate = useNavigate();
    const business = JSON.parse(localStorage.getItem('b_user'))?.business;
    const number = props.transfer;

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch items and locations
                const [itemsRes, locationsRes] = await Promise.all([
                    axios.post('http://localhost:8000/main/fetch_items/', { business },
                      { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }),
                    axios.post('http://localhost:8000/main/fetch_locations/', { business },
                      { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } })
                ]);

                // Transform items data
                setItems(itemsRes.data.map(item => ({ 
                    value: item.name, 
                    label: `${item.code} -${item.brand} ${item.name}`,
                    ...item
                })));

                // Transform locations data
                const locationsData = locationsRes.data.map(loc => ({
                    value: loc.id,
                    label: loc.name
                }));
                setLocations(locationsData);

                // Fetch transfer details
                const transferRes = await axios.post(
                    'http://localhost:8000/main/view_transfer/',
                    { business, number },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }}
                );

                // Set transfer data
                const transferData = transferRes.data;
                setTransfer({
                    ...transferData.detail,
                });
                setTransferItems(transferData.items)

            } catch (error) {
                handleApiError(error);
            }
        };

        if (business && number) fetchInitialData();
    }, [business, number]);

    const deleteTransfer = async () => {
        try {
            await axios.post(
                'http://localhost:8000/main/delete_transfer/',
                { 
                    business: business, 
                    number: number,
                    user: JSON.parse(localStorage.getItem('b_user'))?.user 
                },
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('access')}` 
                    } 
                }
            );
            props.onClose();
        } catch (error) {
            handleApiError(error);
        }
    };



    const handleApiError = (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access');
            navigate('/sign_in');
        } else {
            setError(error.response?.data?.message || 'An error occurred');
        }
    };

    const handleTransferChange = (name, value) => {
        setTransfer(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleItemSelect = (selected) => {
        setSelectedItem({
            item: selected.name,
            code: selected.code,
            brand: selected.brand,
            qty: 1
        });
    };

    const addItem = (e) => {
        e.preventDefault();
        if (!selectedItem.item || !selectedItem.qty) {
            setError('Please select an item and quantity');
            return;
        }

        setTransferItems(prev => [...prev, {
            code: selectedItem.item.code,
            name: selectedItem.item.value,
            brand: selectedItem.item.brand,
            qty: selectedItem.qty,
        }]);

        setSelectedItem({
            item: null,
            code: '',
            brand: '',
            qty: 1
        });
    };


    const updateTransfer = async () => {
        if (!transfer.from || !transfer.to) {
            setError('Please select both locations');
            return;
        }
        if (transfer.from.value === transfer.to.value) {
            setError('Cannot transfer between same locations');
            return;
        }
        if (transferItems.length === 0) {
            setError('Please add at least one item');
            return;
        }

        try {
            await axios.post(
                'http://localhost:8000/main/edit_transfer/',
                {
                    business,
                    number,
                    transfer: transfer,
                    transferDetail : transferItems
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } }
            );

            props.onClose();
        } catch (error) {
            handleApiError(error);
        }
    };

    return (
        <div className="ivi_display_mainbox">
            {/* Preview Modal */}
            {showPreview && (
                <div className="confirm_overlay" ref={overlayRef}>
                    <div className="confirm_card">
                        <h3>Transfer Preview</h3>
                        <div className="preview_table_box">
                            <table className="ia_main_table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Code</th>
                                        <th>Brand</th>
                                        <th>Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transferItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.code}</td>
                                            <td>{item.brand}</td>
                                            <td>{item.name}</td>
                                            <td>{item.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="form-actions">
                            <button className="btn_primary" onClick={updateTransfer}>
                                Confirm Changes
                            </button>
                            <button className="btn_danger" onClick={() => setShowPreview(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="confirm_overlay">
                    <div className="confirm_card">
                        <h3>Confirm Delete</h3>
                        <p>Delete transfer #{number}?</p>
                        <div className="confirm_actions">
                            <button className="btn_confirm" onClick={deleteTransfer}>
                                Yes
                            </button>
                            <button className="btn_cancel" onClick={() => setConfirmDelete(false)}>
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ia_submain_box">
                <div className="ia_description_box">
                    <span className="ia_description_word">Edit Transfer #{number}</span>
                    <FontAwesomeIcon 
                        onClick={() => navigate(-1)}
                        className="close-button"
                        icon={faTimesCircle} 
                    />
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="ivi_display_box">
                    <div className="ivi_subboxes">
                        <div className="ivi_holder_box">
                            <label className="ivi_label">Description</label>
                            <input
                                type="text"
                                className="ivi_input"
                                value={transfer.description}
                                onChange={(e) => handleTransferChange('description', e.target.value)}
                            />
                        </div>
                        
                        <div className="ivi_holder_box">
                            <label className="ivi_label">Issue Date</label>
                            <input
                                type="date"
                                className="ivi_input"
                                value={transfer.issueDate}
                                onChange={(e) => handleTransferChange('issueDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="ivi_subboxes">
                        <div className="ivi_holder_box">
                            <label className="ivi_label">From Location</label>
                            <Select
                                options={locations}
                                value={transfer.from}
                                onChange={(selected) => handleTransferChange('from', selected)}
                                className="ivi_select"
                                classNamePrefix="ivi_select"
                            />
                        </div>

                        <div className="ivi_holder_box">
                            <label className="ivi_label">To Location</label>
                            <Select
                                options={locations}
                                value={transfer.to}
                                onChange={(selected) => handleTransferChange('to', selected)}
                                className="ivi_select"
                                classNamePrefix="ivi_select"
                            />
                        </div>
                    </div>
                </div>

                <form onSubmit={addItem} className="add-item-form">
                    <div className="ivi_display_box">
                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Select Item</label>
                                <Select
                                    options={items}
                                    value={selectedItem.item}
                                    onChange={handleItemSelect}
                                    className="ivi_select"
                                    classNamePrefix="ivi_select"
                                />
                            </div>
                            
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Quantity</label>
                                <input
                                    type="number"
                                    className="ivi_input"
                                    value={selectedItem.qty}
                                    min="1"
                                    onChange={(e) => setSelectedItem(prev => ({
                                        ...prev,
                                        qty: Math.max(1, parseInt(e.target.value))
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn_primary">
                            Add Item
                        </button>
                    </div>
                </form>

                <div className="ia_table_box">
                    <table className="ia_main_table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Brand</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th className='action-width'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transferItems.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.code}</td>
                                    <td>{item.brand}</td>
                                    <td>{item.name}</td>
                                    <td>{item.qty}</td>
                                    <td>
                                        <FontAwesomeIcon
                                            icon={faEdit}
                                            className="item_action"
                                            onClick={() => {
                                            setSelectedItem({
                                            item: items.find(i => i.code === item.code),
                                            qty: item.qty
                                            });
                                            setTransferItems(prev => prev.filter((_, i) => i !== index));
                                            }}
                                        />
                                        <FontAwesomeIcon
                                        icon={faTimesCircle}
                                        className="item_action"
                                        onClick={() => setTransferItems(prev => prev.filter((_, i) => i !== index))}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="form-actions">
                    <button 
                        className="btn_primary" 
                        onClick={() => setShowPreview(true)}
                        disabled={transferItems.length === 0}
                    >
                        Review Changes
                    </button>
                    <button 
                        className="btn_danger" 
                        onClick={() => setConfirmDelete(true)}
                    >
                        Delete Transfer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditTransfer;