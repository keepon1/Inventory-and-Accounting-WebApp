import React, {useEffect, useRef, useState} from "react";
import api from "../api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import Select from "react-select";
import './editItem.css';
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const EditItem = ({item, business, user, access, item_view_control, state}) => {
    const [itemInfo, setItemInfo] = useState({
        code: '', brand: '', name: '', unit: {value:'', label:''}, model: '',
        imageFile: null, imagePreview: null, category: {value:'', label:''},
        reorder: '', description: ''
    });
    const [oldInfo, setOldInfo] = useState();
    const [category, setCategory] = useState([{value:'', label:''}]);
    const [unit, setUnit] = useState([{value:'', label:''}]);
    const [codeError, setCodeError] = useState('');
    const [nameError, setNameError] = useState('');
    const [imageError, setImageError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const overlayaddRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoryRes, unitRes, itemRes] = await Promise.all([
                    api.post('fetch_category', {business, user }),
                    api.post('fetch_unit', { business, user }),
                    api.post('view_item', { business, item, user })
                ]);

                if (categoryRes.status === "success") {
                    setCategory(categoryRes.data);
                }
                if (unitRes.status === "success") {
                    setUnit(unitRes.data);
                }
                if (itemRes.status === "success") {
                    setItemInfo(itemRes.data);
                    setOldInfo(itemRes.data);
                } else {
                    toast.error(itemRes.message || "Failed to fetch item");
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                } else {
                    toast.error("Error fetching data");
                }
            }
        };
        fetchData();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItemInfo(prev => ({ ...prev, [name]: value }));
        if(name === 'code') setCodeError('');
        if(name === 'name') setNameError('');

        if (name === 'images') {
            setImageError('');
            const file = e.target.files[0];
            if (file) {
                setItemInfo(prev => ({
                    ...prev,
                    imageFile: file,
                    imagePreview: URL.createObjectURL(file)
                }));
            }
            return;
        }
    };

    const validateForm = () => {
        let isValid = true;
        if(!itemInfo.name.trim()) {
            setNameError('Item name is required');
            isValid = false;
        }
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const submitter = e.nativeEvent.submitter.name;
        
        if(submitter === 'update') {
            if(!validateForm()) return;
            try {
                const formData = new FormData();
                formData.append('newCode', itemInfo.code);
                formData.append('newName', itemInfo.name);
                formData.append('newDescription', itemInfo.description);
                formData.append('newModel', itemInfo.model);
                formData.append('newBrand', itemInfo.brand);
                formData.append('newImage', itemInfo.imageFile);
                formData.append('newUnit', itemInfo.unit.value);
                formData.append('newCategory', itemInfo.category.value);
                formData.append('newReorder', itemInfo.reorder);
                formData.append('oldCode', oldInfo.code);
                formData.append('oldName', oldInfo.name);
                formData.append('business', business);
                formData.append('user', user);

                const response = await api.post('update_item', formData);

                if (response.status === "success") {
                    toast.success(response.message || "Item updated successfully");
                    navigate(-1);
                } else {
                    handleValidationErrors(response.message);
                }
            } catch (error) {
                handleApiError(error);
            }
        } else {
            setConfirmDelete(true);
        }
    };

    const handleValidationErrors = (errorType) => {
        if (errorType === 'code_exist') setCodeError('Item code already exists!');
        if (errorType === 'name_exist') setNameError('Item name already exists!');
        if (errorType === 'invalid_image_type') setImageError('Invalid Image Type!');
        else toast.error(errorType || "Update failed");
    };

    const handleDelete = async (confirm) => {
        if(!confirm) return setConfirmDelete(false);
        
        try {
            const response = await api.post('delete_item', { itemDetail: itemInfo, item, business });
            if (response.status === "success") {
                toast.success(response.message || "Item deleted successfully");
                item_view_control(state);
            } else {
                toast.error(response.message || "Delete failed");
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleApiError = (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access');
            navigate('/sign_in');
        } else {
            toast.error("Something went wrong");
        }
    };

    return (
        <div className="ivi_display_mainbox">
            {confirmDelete && (
                <div className="confirm_overlay" ref={overlayaddRef}>
                    <div className="confirm_card">
                        <h3>Confirm Delete</h3>
                        <p>Are you sure you want to delete {item}?</p>
                        <div className="confirm_actions">
                            <button className="btn_confirm" onClick={() => handleDelete(true)}>Yes</button>
                            <button className="btn_cancel" onClick={() => handleDelete(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ia_submain_box">
                <div className="ia_description_box">
                    <div className="ia_description">
                        <span className="ia_description_word">Edit Item</span>
                    </div>
                    <div className="inner_close">
                        <FontAwesomeIcon 
                            onClick={() => navigate(-1)}
                            className="close-button"
                            icon={faTimesCircle} 
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="ivi_display_box">
                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Item Code</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={itemInfo.code}
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                                {codeError && <div className="error-message">{codeError}</div>}
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Brand</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={itemInfo.brand}
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Model Number</label>
                                <input
                                    type="text"
                                    name="model"
                                    value={itemInfo.model}
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                            </div>
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Item Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={itemInfo.name}
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                                {nameError && <div className="error-message">{nameError}</div>}
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Description</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={itemInfo.description}
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    name="images"
                                    onChange={handleChange}
                                    className="ivi_input"
                                />
                                {imageError && <div className="error-message">{imageError}</div>}
                            </div>
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Category</label>
                                <Select 
                                    options={category} 
                                    value={itemInfo.category} 
                                    onChange={selected => setItemInfo({...itemInfo, category:selected})}
                                    className="ivi_select"
                                    classNamePrefix="ivi_select"
                                    required
                                />
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Unit Of Measurement</label>
                                <Select 
                                    options={unit} 
                                    value={itemInfo.unit} 
                                    onChange={selected => setItemInfo({...itemInfo, unit:selected})}
                                    className="ivi_select"
                                    classNamePrefix="ivi_select"
                                    required
                                />
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Reorder Level</label>
                                <input
                                    type="number"
                                    value={itemInfo.reorder}
                                    className="ivi_input"
                                    onChange={handleChange}
                                    name="reorder"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {(access.admin || access.edit_access) && (
                        <div className="form-actions">
                            <button type="submit" name="update" className="btn btn-outline">
                                Update Item
                            </button>
                            <button type="submit" name="delete" className="btn btn-outline-red">
                                Delete Item
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default EditItem;
