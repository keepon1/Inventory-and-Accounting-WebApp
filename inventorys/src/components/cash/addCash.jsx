import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import enableKeyboardScrollFix from "../../utils/scroll";
import { toast } from "react-toastify";

const AddCashReceipt = ({business, user}) => {
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        debitAccount: null,
        creditAccount: null,
        referenceType: null,
        reference: null,
        description: '',
        amount: 0,
        external: '',
    });
    
    const [accounts, setAccounts] = useState([]);
    const [unpaid, setUnpaid] = useState([]);
    const [creditAccounts, setCreditAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();
    
    const referenceTypes = [
        { value: 'sales', label: 'Inventory Sales' },
        { value: 'others', label: 'Other Income' },
        { value: 'loan', label: 'Loan Received' },
        { value: 'capital', label: 'Owner Capital' },
    ];

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await api.post(
                    'fetch_accounts',
                    { business, user},
                );

                if (response.status === 'error') {
                    toast.error(response.message || 'Failed to fetch accounts');
                    return;
                }
                
                const formattedAccounts = response.filter(acc => acc.account_type__code === '10100' || acc.account_type__code === '10200' || acc.account_type__code === '10500')
                .map(acc => ({
                    value: acc.code,
                    label: `${acc.code} - ${acc.name}`,
                }));
                
                setAccounts(formattedAccounts);
            } catch (error) {
                toast.error('An error occurred while fetching accounts'); 
                console.error('Fetch error:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchAccounts();

    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleAccountChange = async(name, selected) => {
        setEntry(prev => ({ ...prev, [name]: selected }));
        if (name === 'referenceType'){
            try{
                const response = await api.post('get_accounts', {business, user, type:selected.value});
                setCreditAccounts(response.data_1);
                setUnpaid(response.data_2)
                setEntry(prev => ({ ...prev, creditAccount: null, reference:null }));
            }
            catch{

            }
        }
    };

    const addEntry = (e) => {
        e.preventDefault();
        setFormError('');

        if (!entry.debitAccount) {
            toast.info('Debit account is required');
            return;
        }
        
        if (!entry.creditAccount) {
            toast.info('Credit account is required');
            return;
        }

        if (entry.debitAccount.value === entry.creditAccount.value) {
            toast.info('Debit and credit accounts must be different');
            return;
        }
        
        if (!entry.referenceType) {
            toast.info('Reference type is required');
            return;
        }
        
        if (entry.amount <= 0) {
            toast.info('Amount must be positive');
            return;
        }

        setEntries(prev => [...prev, entry]);
        
        setEntry({
            date: new Date().toISOString().split('T')[0],
            debitAccount: null,
            creditAccount: null,
            referenceType: {value: '', label:''},
            reference: '',
            description: '',
            amount: 0,
            external: '',
        });
    };

    const removeEntry = (index) => {
        setEntries(prev => prev.filter((_, i) => i !== index));
    };

    const editEntry = (index) => {
        const item = entries[index];
        setEntry({ ...item });
        removeEntry(index);
    };

    const saveJournal = async () => {

        try {
            const payload = {
                entries: entries.map(entry => ({
                    date: entry.date,
                    debit_account: entry.debitAccount.value,
                    credit_account: entry.creditAccount.value,
                    reference_type: entry.referenceType.value,
                    reference: typeof entry.reference === 'object' ? entry.reference?.value : entry.reference,
                    description: entry.description,
                    amount: parseFloat(entry.amount),
                    external: entry.external,
                })),
                business,
                user
            };
            
            const response = await api.post('add_cash_receipts', payload);
            console.log("Save response:", response);
            if(response.status === 'success'){
                toast.success(response.message || 'Cash receipt journal posted successfully');
                navigate(-1);
            }else{
                toast.error(response.message || 'Failed to save journal');
            }
        } catch (error) {
            toast.error('An error occurred while saving journal');
            console.error("Save error:", error);
            if (error.response?.status === 401) {
                localStorage.removeItem('access');
                navigate('/sign_in');
            } else if (error.response) {
                setFormError(error.response || 'Failed to save journal');
            }
        }
    };

    const totalAmount = entries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);

    return (
        <div className="ivi_display_mainbox">
            <div className="ia_submain_box">
                <div className="ia_description_box">
                    <div className="header-back">
                        <Link to="../" className="back-link">
                            <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                        </Link>
                        <h2 className="ia_description_word">Cash Receipt Journal</h2>
                    </div>
                </div>

                <form onSubmit={addEntry}>
                    <div className="ivi_display_box">
                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Date*</label>
                                <input 
                                    type="date" 
                                    name="date" 
                                    value={entry.date} 
                                    onChange={handleChange} 
                                    className="ivi_input" 
                                />
                            </div>
                            
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Debit Account*</label>
                                <Select 
                                    options={accounts} 
                                    value={entry.debitAccount}
                                    onChange={(selected) => handleAccountChange('debitAccount', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">External Document No</label>
                                <input 
                                    type="text" 
                                    name="external" 
                                    value={entry.external} 
                                    onChange={handleChange} 
                                    className="ivi_input"
                                />
                            </div>
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Reference Type*</label>
                                <Select 
                                    options={referenceTypes} 
                                    value={entry.referenceType}
                                    onChange={(selected) => handleAccountChange('referenceType', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                />
                            </div>
                            

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Reference Invoice #</label>
                                <CreatableSelect
                                    isClearable
                                    options={unpaid}
                                    value={entry.reference}
                                    onChange={(selected) => handleAccountChange('reference', selected)}
                                    onCreateOption={(inputValue) => {
                                        const newOption = { label: inputValue, value: inputValue };
                                        setUnpaid(prev => [...prev, newOption]);
                                        handleAccountChange('reference', newOption);
                                    }}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Description</label>
                                <input 
                                    type="text" 
                                    name="description" 
                                    value={entry.description} 
                                    onChange={handleChange} 
                                    className="ivi_input" 
                                />
                            </div>
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Amount*</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="0.01"
                                    name="amount" 
                                    value={entry.amount} 
                                    onChange={handleChange} 
                                    className="ivi_input" 
                                />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Credit Account*</label>
                                <Select 
                                    options={creditAccounts} 
                                    value={entry.creditAccount}
                                    onChange={(selected) => handleAccountChange('creditAccount', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-outline">
                            Add Entry
                        </button>
                        {formError && <div className="error-message mt-2">{formError}</div>}
                    </div>
                </form>

                <div className="ia_table_box mt-4">
                    <table className="ia_main_table w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Debit Account</th>
                                <th className="p-2 text-left">Credit Account</th>
                                <th className="p-2 text-left">Ref Type</th>
                                <th className="p-2 text-left">Reference</th>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{entry.date}</td>
                                    <td className="p-2">{entry.debitAccount?.label}</td>
                                    <td className="p-2">{entry.creditAccount?.label}</td>
                                    <td className="p-2">{entry.referenceType?.label}</td>
                                    <td className="p-2">
                                        {typeof entry.reference === 'object' ? entry.reference?.label : entry.reference}
                                    </td>
                                    <td className="p-2">{entry.description}</td>
                                    <td className="p-2 text-right">{parseFloat(entry.amount).toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <FontAwesomeIcon 
                                            onClick={() => editEntry(index)} 
                                            className="item_action text-blue-500 hover:text-blue-700 cursor-pointer mx-1" 
                                            icon={faEdit} 
                                        />
                                        <FontAwesomeIcon 
                                            onClick={() => removeEntry(index)} 
                                            className="item_action text-red-500 hover:text-red-700 cursor-pointer mx-1" 
                                            icon={faTimesCircle} 
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-semibold">
                            <tr>
                                <td colSpan="6" className="p-2 text-right">Total:</td>
                                <td className="p-2 text-right">{totalAmount.toFixed(2)}</td>
                                <td className="p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="ia_add_item_mbox mt-6">
                    <button 
                        className={`btn btn-outline flex items-center justify-center ${
                            entries.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                        }`}
                        onClick={saveJournal}
                        disabled={entries.length === 0}
                    >

                        Post Cash Receipt Journal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCashReceipt;