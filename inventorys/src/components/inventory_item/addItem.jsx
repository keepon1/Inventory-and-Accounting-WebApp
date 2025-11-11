import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faTimesCircle as redcircle, faEdit } from "@fortawesome/free-regular-svg-icons";
import './addItem.css';
import Select from 'react-select';
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AddItem = (props) => {
    const [itemDetail, setItemDetail] = useState({
        price: 0.00, brand: {value: '', label: ''}, name: '', unit: {value:'', label:''}, model: '',
        status: { value: 'active', label: 'Active' }, category: {value:'', label:''},
        reorder: '', description: ''
    });
    const [fullList, setFullList] = useState([]);
    const [category, setCategory] = useState([{ value: '', label: '' }]);
    const [unit, setUnit] = useState([{ value: '', label: '' }]);
    const [brand, setBrand] = useState([{ value: '', label: '' }]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const checkExistingItems = (field, value) =>
        fullList.some(item => item[field].toLowerCase() === value.toLowerCase());

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const [catRes, unitRes, brandRes] = await Promise.all([
                    api.post('fetch_category', { business: props.business }),
                    api.post('fetch_unit', { business: props.business }),
                    api.post('fetch_brand', { business: props.business })
                ]);
                setCategory(catRes.length ? catRes : [{ value: '', label: '' }]);
                setUnit(unitRes.length ? unitRes : [{ value: '', label: '' }]);
                setBrand(brandRes.length ? brandRes : [{ value: '', label: '' }]);
            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchLocations();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItemDetail(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPreview = async (e) => {
        e.preventDefault();

        if (!itemDetail.name.trim()) {
            toast.error("Item name is required");
            return;
        }
        if (!itemDetail.unit.value.trim()) {
            toast.error("Unit is required");
            return;
        }
        if (!itemDetail.category.value.trim()) {
            toast.error("Category is required");
            return;
        }

        if (!itemDetail.brand.value.trim()) {
            toast.error("Brand is required");
            return;
        }

        const nameExists = checkExistingItems('name', itemDetail.name);

        if (nameExists) {
            if (nameExists) toast.error("Item name already exists!");
            return;
        }

        if (loading) {
            toast.info('Please wait, verifying item');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                name: itemDetail.name,
                business: props.business,
                status: itemDetail.status?.value || ''
            };

            const response = await api.post('verify_item', payload);

            if (response.status === "success") {
                setFullList(prev => [...prev, itemDetail]);
                resetForm();
                toast.success(response.message || "Item added to preview list");
                setLoading(false);
            } else {
                toast.error(response.message || "Failed to verify item");
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            navigate('/sign_in');
        }
    };

    const resetForm = () => {
        setItemDetail({
            code: '', brand: { value: '', label: ''}, name: '', unit: {value:'', label:''}, model: '',
            status: { value: 'active', label: 'Active' }, category: {value:'', label:''},
            reorder: '', description: '', price: 0.00
        });
    };

    const removePreviewItem = (index) => {
        setFullList(prev => prev.filter((_, i) => i !== index));
        toast.info("Item removed from preview list");
    };

    const editPreviewItem = (index) => {
        const item = fullList[index];
        setItemDetail({ ...item });
        removePreviewItem(index);
        toast.info("Item moved back to form for editing");
    };

    const addItems = async () => {
        if (fullList.length < 1){
            toast.info('At least 1 item should be added');
            return;
        }

        if (loading) {
            toast.info('Please wait, saving items');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            fullList.forEach(item => {
                formData.append('price', item.price || '');
                formData.append('brand', item.brand?.value || '');
                formData.append('name', item.name.trim() || '');
                formData.append('model', item.model || '');
                formData.append('description', item.description || '');
                formData.append('reorder', item.reorder || 0);
                formData.append('category', item.category?.value || '');
                formData.append('unit', item.unit?.value || '');
                formData.append('status', item.status?.value || '');
            });

            formData.append('business', props.business);
            formData.append('user', props.user);

            const response = await api.post('add_items', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === "success") {
                toast.success(response.message || "Items saved successfully!");
                navigate(-1);
            } else {
                setLoading(false);
                toast.error(response.message || "Failed to save items");
            }
        } catch (error) {
            setLoading(false);
            navigate('/sign_in');
        }
    };

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    return (
        <div className="ivi_display_mainbox">
            <div className="ia_submain_box">
                <div className="ia_description_box">
                    <div className="header-back">
                        <Link to="../" className="back-link">
                            <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                        </Link>
                        <h2 className="ia_description_word">Add Inventory Items</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmitPreview}>
                    <div className="ivi_display_box">
                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Item Name*</label>
                                <input type="text" name="name" value={itemDetail.name} onChange={handleChange} className="ivi_input" />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Brand</label>
                                <Select options={brand} value={itemDetail.brand} onChange={selected => setItemDetail({ ...itemDetail, brand: selected })} className="ivi_select" classNamePrefix="ivi_select" />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Model Number</label>
                                <input type="text" name="model" value={itemDetail.model} onChange={handleChange} className="ivi_input" />
                            </div>
                        </div>

                        <div className="ivi_subboxes"> 
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Description</label>
                                <input type="text" name="description" value={itemDetail.description} onChange={handleChange} className="ivi_input" />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Status</label>
                                <Select
                                    options={statusOptions}
                                    value={itemDetail.status}
                                    onChange={selected => setItemDetail({ ...itemDetail, status: selected })}
                                    className="ivi_select"
                                    classNamePrefix="ivi_select"
                                />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Sales Price</label>
                                <input type="number" step={0.01} min={0.00} className="ivi_input" onChange={handleChange} name="price" value={itemDetail.price} />
                            </div>
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Category</label>
                                <Select options={category} value={itemDetail.category} onChange={selected => setItemDetail({ ...itemDetail, category: selected })} className="ivi_select" classNamePrefix="ivi_select" />
                            </div>
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Unit</label>
                                <Select options={unit} value={itemDetail.unit} onChange={selected => setItemDetail({ ...itemDetail, unit: selected })} className="ivi_select" classNamePrefix="ivi_select" />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Reorder Level</label>
                                <input type="number" className="ivi_input" onChange={handleChange} name="reorder" value={itemDetail.reorder} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-outline">Preview</button>
                    </div>
                </form>

                <div className="ia_table_box">
                    <table className="ia_main_table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Brand</th>
                                <th>Model No.</th>
                                <th>Item Name</th>
                                <th>Status</th>
                                <th>Description</th>
                                <th>Unit</th>
                                <th>Sales Price</th>
                                <th>Reorder level</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullList.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.category.value}</td>
                                    <td>{item.brand.value}</td>
                                    <td>{item.model}</td>
                                    <td>{item.name}</td>
                                    <td>{item.status?.label || item.status?.value}</td>
                                    <td>{item.description}</td>
                                    <td>{item.unit.value}</td>
                                    <td> GHS {item.price}</td>
                                    <td>{item.reorder}</td>
                                    <td>
                                        <FontAwesomeIcon onClick={() => editPreviewItem(index)} className="item_action" icon={faEdit} />
                                        <FontAwesomeIcon onClick={() => removePreviewItem(index)} className="item_action" icon={redcircle} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="ia_add_item_mbox">
                    <button className="btn btn-outline" onClick={addItems}>Save Items</button>
                </div>
            </div>
        </div>
    );
};

export default AddItem;
