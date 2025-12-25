import {useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import Select from 'react-select';
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { format, set } from 'date-fns'
import { toast } from "react-toastify";

const GLJournal = ({business, user, access}) => {
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        debitAccount: null,
        creditAccount: null,
        reference: '',
        description: '',
        amount: 0
    });
    
    const [accounts, setAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await api.post(
                    'fetch_accounts',
                    { business, user }
                );

                if (response.status === 'error') {
                    toast.error(response.message || 'Failed to fetch accounts');
                    return;
                }

                const disallowed = ["10400", "20100", "20300", "10300", "10600", "40100", "50100"];
                const isManualGLSafe = (acc) =>
                    !disallowed.includes(String(acc.account_type__code));
                
                const formattedAccounts = response.filter(isManualGLSafe)
                .map(acc => ({
                    value: acc.code,
                    label: `${acc.code} - ${acc.name}`,
                    type: acc.account_type__code
                }));
                
                setAccounts(formattedAccounts);
            } catch (error) {
                console.error('Error fetching accounts:', error);
                toast.error('An error occurred while fetching accounts');
                if (error.response?.status === 401) {
                    localStorage.removeItem('access');
                    navigate('/sign_in');
                }
            }
        };
        fetchAccounts();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleAccountChange = (name, selected) => {
        setEntry(prev => ({ ...prev, [name]: selected }));
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
        
        if (entry.amount <= 0) {
            toast.info('Amount must be positive');
            return;
        }

        setEntries(prev => [...prev, entry]);
        
        setEntry({
            date: new Date().toISOString().split('T')[0],
            debitAccount: null,
            creditAccount: null,
            reference: '',
            description: '',
            amount: 0
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

        try {
            setLoading(true);
            if (entries.length === 0) {
                toast.info('No journal entries to save');
                return;
            }

            const totalDebit = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const totalCredit = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

            if (totalDebit !== totalCredit) {
                toast.info('Total debits must equal total credits');
                return;
            }

            const payload = {
                entries: entries.map(entry => ({
                    date: entry.date,
                    debit_account: entry.debitAccount.value,
                    credit_account: entry.creditAccount.value,
                    reference: entry.reference,
                    description: entry.description,
                    amount: parseFloat(entry.amount)
                })),
                business,
                user,
            };

            const response = await api.post('add_journal', payload);

            if (response.status === 'success') {
                toast.success(response.message || 'Journal posted successfully');
                navigate(-1);
            }else{
                toast.error(response.message || 'Failed to post journal');
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            console.error("Save error:", error);
            toast.error('An error occurred while saving the journal');
            if (error.response?.status === 401) {
                navigate('/sign_in');
            }
        }
    };

    const totalDebit = entries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);

    return (
        <div className="ivi_display_mainbox">
            <div className="ia_submain_box">
                <div className="ia_description_box">
                    <div className="header-back">
                        <Link to="../" className="back-link">
                            <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                        </Link>
                        <h2 >General Journal</h2>
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
                                    disabled={access.admin || access.date_access ? false : true}
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
                                <label className="ivi_label">Reference</label>
                                <input 
                                    type="text" 
                                    name="reference" 
                                    value={entry.reference} 
                                    onChange={handleChange} 
                                    className="ivi_input"
                                    required
                                />
                            </div>

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
                        </div>

                        <div className="ivi_subboxes">
                            <div className="ivi_holder_box">
                                <label className="ivi_label">Debit Account*</label>
                                <Select 
                                    options={accounts} 
                                    value={entry.debitAccount}
                                    onChange={(selected) => handleAccountChange('debitAccount', selected)}
                                    className="ivi_select" 
                                    classNamePrefix="ivi_select"
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
                            Add Journal Entry
                        </button>
                        {formError && <div className="error-message">{formError}</div>}
                    </div>
                </form>

                <div className="ia_table_box">
                    <table className="ia_main_table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Description</th>
                                <th>Debit Account</th>
                                <th>Credit Account</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length > 0 ? (
                                entries.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{format(entry.date, 'dd/MM/yyyy')}</td>
                                        <td>{entry.reference}</td>
                                        <td>{entry.description}</td>
                                        <td>{entry.debitAccount?.label}</td>
                                        <td>{entry.creditAccount?.label}</td>
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
                                    <td colSpan="7" className="text-center py-4">
                                        No journal entries yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td colSpan="6" className="text-right">Totals:</td>
                                <td colSpan="2" className="text-right">${totalDebit.toFixed(2)}</td>
                            </tr>
                            
                        </tfoot>
                    </table>
                </div>

                <div className="ia_add_item_mbox">
                    <button 
                        className={`btn btn-outline ${entries.length === 0 || totalDebit !== totalCredit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={saveJournal}
                        disabled={entries.length === 0 || totalDebit !== totalCredit}
                    >
                        Post General Journal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GLJournal;