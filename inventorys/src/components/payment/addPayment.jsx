import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns"
import { toast } from "react-toastify";

const PaymentJournal = ({business, user}) => {
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
    const [account, setAccount] = useState([]);
    const [unpaid, setUnpaid] = useState([]);
    const [entries, setEntries] = useState([]);
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const referenceTypes = [
        { value: 'purchase', label: 'Supplier Payment' },
        { value: 'expense', label: 'Expense Payment' },
        { value: 'loan', label: 'Loan Payment' },
        { value: 'tax', label: 'Tax Payment' },
        { value: 'salary', label: 'Salary Payment' },
        { value: 'other', label: 'Other Payment' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accRes] = await Promise.all([
                    api.post(
                        'fetch_accounts',
                        { business, user },
                    ),
                ]);

                if (accRes.status === 'error') {
                    toast.error(accRes.message || 'Failed to fetch accounts');
                    return;
                }
                
                const formattedAccounts = accRes.filter(acc => acc.account_type__code === '10100' || acc.account_type__code === '10200' || acc.account_type__code === '10500')
                .map(acc => ({
                    value: acc.code,
                    label: `${acc.code} - ${acc.name}`,
                }));
                
                setAccounts(formattedAccounts);
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error('An error occurred while fetching accounts');
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchData();
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
                setAccount(response.data_1);
                setUnpaid(response.data_2)
                setEntry(prev => ({ ...prev, debitAccount: null , reference:null}));
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
            referenceType: null,
            reference: null,
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
        setEntry({ 
            date: item.date,
            debitAccount: item.debitAccount,
            creditAccount: item.creditAccount,
            referenceType: item.referenceType,
            reference: item.reference,
            description: item.description,
            amount: item.amount
        });
        removeEntry(index);
    };

    const saveJournal = async () => {
        if (loading) {
            toast.info('Please wait, saving journal');
            return;
        }

        if (entries.length === 0) {
            toast.info('No entries to save');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                entries: entries.map(entry => ({
                    date: entry.date,
                    debit_account: entry.debitAccount.value,
                    credit_account: entry.creditAccount.value,
                    reference_type: entry.referenceType.value,
                    reference: entry.reference.value,
                    description: entry.description,
                    amount: parseFloat(entry.amount),
                    external: entry.external,
                })),
                business,
                user
            };

            const response = await api.post('add_payments', payload);
            
            if(response.status === 'success'){
                toast.success(response.message || 'Payment journal posted successfully');
                navigate(-1);
            }else{
                setFormError(response.message || 'Failed to save journal');
                setLoading(false);
                return;
            }

        } catch (error) {
            toast.error('An error occurred while saving the journal');
            setLoading(false);
            console.error("Save error:", error);
            if (error.response?.status === 401) {
                navigate('/sign_in');
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
                        <h2>Payment Journal</h2>
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
                                    required 
                                />
                            </div>
                            
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Debit Account*</label>
                                <Select 
                                    options={account} 
                                    value={entry.debitAccount}
                                    onChange={(selected) => handleAccountChange('debitAccount', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                    required
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
                                    required
                                />
                            </div>

                            <div className="ivi_holder_box">
                                <label className="ivi_label">Reference Number*</label>
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
                                    required
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
                                    required 
                                />
                            </div>
                            
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Credit Account*</label>
                                <Select 
                                    options={accounts} 
                                    value={entry.creditAccount}
                                    onChange={(selected) => handleAccountChange('creditAccount', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-outline">
                            Add Entry
                        </button>
                        {formError && <div className="error-message">{formError}</div>}
                    </div>
                </form>

                <div className="ia_table_box">
                    <table className="ia_main_table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Vendor</th>
                                <th>Debit Account</th>
                                <th>Credit Account</th>
                                <th>Type</th>
                                <th>Reference</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length > 0 ? (
                                entries.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{format(entry.date, 'dd/MM/yyyy')}</td>
                                        <td>{entry.vendor ? entry.vendor.label : 'N/A'}</td>
                                        <td>{entry.debitAccount?.label}</td>
                                        <td>{entry.creditAccount?.label}</td>
                                        <td>{entry.referenceType?.label}</td>
                                        <td>{entry.reference?.label}</td>
                                        <td>{entry.description}</td>
                                        <td className="text-right">GHS {parseFloat(entry.amount).toFixed(2)}</td>
                                        <td>
                                            <FontAwesomeIcon 
                                                onClick={() => editEntry(index)} 
                                                className="item_action" 
                                                icon={faEdit} 
                                            />
                                            <FontAwesomeIcon 
                                                onClick={() => removeEntry(index)} 
                                                className="item_action text-red-500 ml-2" 
                                                icon={faTrashAlt} 
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center py-4">
                                        No payment entries yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td colSpan="6" className="text-right">Total:</td>
                                <td colSpan="2" className="text-right">GHS {totalAmount.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="ia_add_item_mbox">
                    <button 
                        className={`btn btn-outline ${entries.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={saveJournal}
                        disabled={entries.length === 0}
                    >
                        Post Payment Journal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentJournal;