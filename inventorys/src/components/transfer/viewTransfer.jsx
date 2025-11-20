import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faTachometer, faPrint, faArrowLeft, faShareFromSquare, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ViewTransfer = (props) => {
  const [transfer, setTransfer] = useState({
    number: "",
    from: "",
    to: "",
    issueDate: new Date(),
    description: "",
    total: 0,
    createdBy: "",
    category: "",
    model: "",
    unit: "",
    status: "",
  });
  const [items, setItems] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const overlayRef = useRef(null);

  const navigate = useNavigate();
  const transferNumber = props.transfer;
  const access = props.access;
  const user = props.user;
  const business = props.business;

  useEffect(() => {
    const fetchTransfer = async () => {
      try {
        const response = await api.post("view_transfer", {
          business,
          number: transferNumber,
          format: '',
        });

        if (response.status === "success") {
          const { detail, items } = response.data;
          setTransfer({
            number: detail.number,
            from: detail.from,
            to: detail.to,
            issueDate: detail.issueDate,
            description: detail.description,
            total: detail.total,
            createdBy: detail.by,
            category: detail.category,
            model: detail.model,
            unit: detail.unit,
            status: detail.status,
          });
          setItems(items);
        } else {
          toast.error(response.message || "Failed to load transfer");
        }
      } catch (error) {
        toast.error("Error fetching transfer");
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          navigate("/sign_in");
        }
      }
    };
    fetchTransfer();
  }, []);

  const handleCreateOverlayClick = (e) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target)) {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (printData) {
      setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 300);
    }
  }, [printData]);

  const receive = async () => {
    if (transfer.status === "Received") {
      toast.info("This transfer has already been received.");
      return;
    }

    if (loading) {
      toast.info('Please wait... receiving in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("receive_transfer", {
        business,
        number: transfer.number,
        user,
      });

      if (response.status === "success") {
        toast.success(response.message || "Transfer received");
        navigate(-1);
      } else {
        toast.error(response.message || "Failed to receive transfer");
        setLoading(false);
        return;
      }
    } catch {
      toast.error("Error receiving transfer");
      setLoading(false);
      console.error('Error receiving transfer');
    }
  };

  const reject = async () => {
    if (transfer.status === "Received") {
      toast.info("Cannot reject a transfer that has been received.");
      return;
    }

    if (loading) {
      toast.info('Please wait... rejecting in progress');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("reject_transfer", {
        business,
        number: transfer.number,
        user,
      });

      if (response.status === "success") {
        toast.success(response.message || "Transfer rejected");
        navigate(-1);
      } else {
        toast.error(response.message || "Failed to reject transfer");
        setLoading(false);
        return;
      }
    } catch {
      toast.error("Error rejecting transfer");
      setLoading(false);
      console.error('Error rejecting transfer');
    }
  };

  const handlePrint = () => {
    setPrintData({
      id: transfer.number,
      business,
      user: transfer.createdBy,
      description: transfer.description,
      from: transfer.from,
      to: transfer.to,
      date: new Date(transfer.issueDate),
      status: transfer.status,
      items,
      total: items.reduce((sum, item) => sum + Number(item.qty), 0)
    });
  };

  const handleExport = async () => {
    try {
      const response = await api.post("view_transfer", {
        business,
        number: transfer.number,
        format: exportFormat,
      });

      if (response.status === "success") {
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${response.data.file}`;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
      } else {
        toast.error(response.message || "Failed to export transfer");
      }
    } catch (error) {
      toast.error("Error exporting transfer");
      console.error('Error exporting transfer', error);
    }
  };

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
                <h2 className="ia_description_word">Transfer Details</h2>
              </div>
              <div className="journal-controls">
                <button className="share-icon" onClick={() => { setExporting(true); 
                document.addEventListener('mousedown', handleCreateOverlayClick);
                }}>
                    <FontAwesomeIcon icon={faShareFromSquare}/>
                </button>
              </div>
            </div>

            <div className="ivi_display_box">
              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Transfer Number</label>
                  <input className="ivi_input" value={transfer.number} readOnly title={transfer.number} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Description</label>
                  <input className="ivi_input" value={transfer.description} readOnly title={transfer.description} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Created by</label>
                  <input className="ivi_input" value={transfer.createdBy} readOnly title={transfer.createdBy} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Date</label>
                  <input className="ivi_input" value={format(transfer.issueDate, 'dd/MM/yyyy')} readOnly title={format(transfer.issueDate, 'dd/MM/yyyy')} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Total Quantity</label>
                  <input className="ivi_input" value={transfer.total} readOnly title={transfer.total} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">Status</label>
                  <input className="ivi_input" value={transfer.status} readOnly title={transfer.status} />
                </div>
              </div>

              <div className="ivi_subboxes">
                <div className="ivi_holder_box">
                  <label className="ivi_label">Source Location</label>
                  <input className="ivi_input" value={transfer.from} readOnly title={transfer.from} />
                </div>
                <div className="ivi_holder_box">
                  <label className="ivi_label">To Location</label>
                  <input className="ivi_input" value={transfer.to} readOnly title={transfer.to} />
                </div>
              </div>
            </div>

            <div className="ia_table_box">
              <table className="ia_main_table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Code</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category}</td>
                      <td>{item.code}</td>
                      <td>{item.brand}</td>
                      <td>{item.model}</td>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: "bold" }}>Total Quantity:</td>
                    <td style={{ fontWeight: "bold" }}>
                      {items.reduce((sum, item) => sum + Number(item.qty), 0)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="ia_add_item_mbox">
              {transfer.status === "Not Received" &&
                ((access.per_location_access.includes(transfer.to) &&
                  access.receive_access) ||
                  access.admin) && (
                  <>
                    <button className="btn btn-outline" onClick={receive}>
                      <FontAwesomeIcon icon={faReceipt} /> Receive
                    </button>
                    <button className="btn btn-outline-red" onClick={reject}>
                      <FontAwesomeIcon icon={faTachometer} /> Reject
                    </button>
                  </>
                )}
              <button className="btn btn-outline" onClick={handlePrint}>
                <FontAwesomeIcon icon={faPrint} /> Print
              </button>
            </div>
          </div>
          {exporting && (
            <div className="modal-overlay">
              <div className="modal" ref={overlayRef}>
                <div className="modal-header">
                  <h3>Select Format</h3>
                  <button className="modal-close" onClick={() => setExporting(false)}>
                    <FontAwesomeIcon icon={faTimesCircle} />
                  </button>
                </div>
                <div className="modal-content">
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="csv"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <label htmlFor="csv">CSV</label>
                  </div>
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="excel"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={() => setExportFormat('excel')}
                    />
                    <label htmlFor="excel">Excel</label>
                  </div>
                  <div className="export-options">
                    <input
                      type="radio"
                      name="exportFormat"
                      id="pdf"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                    />
                    <label htmlFor="pdf">PDF</label>
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-outline" onClick={handleExport}>
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {printData && (
        <div className="print-container pos80">
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
            <h3 style={{ margin: "2px 0", fontSize: "12px" }}>TRANSFER RECEIPT</h3>
          </div>

          <div className="info-row" style={{ marginBottom: "4px" }}>
            <div style={{ textAlign: "left", width: "60%" }}>
              <div><strong>Transfer#: {printData.id}</strong></div>
              <div><strong>From: {printData.from}</strong></div>
              <div><strong>To: {printData.to}</strong></div>
            </div>
            <div style={{ textAlign: "right", width: "38%" }}>
              <div><strong>Date: {format(printData.date, 'dd/MM/yyyy')}</strong></div>
              <div><strong>Status: {printData.status}</strong></div>
              <div><strong>By: {printData.user}</strong></div>
            </div>
          </div>

          {printData.description && (
            <div style={{ marginBottom: "4px", fontSize: "11px" }}>
              <strong>Desc: {printData.description}</strong>
            </div>
          )}

          <div style={{ borderTop: "1px dashed #000", marginTop: "4px" }} />

          <table className="ia_main_table" style={{ marginTop: "4px", width: "100%", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: "70%" }}>Item</th>
                <th style={{ textAlign: "center", width: "15%" }}>Qty</th>
                <th style={{ textAlign: "right", width: "15%" }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <strong>{item.name}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}><strong>{item.qty}</strong></td>
                  <td style={{ textAlign: "right" }}><strong>{item.unit}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #000", marginTop: "4px", marginBottom: "4px" }} />

          <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "700" }}>
            <div><strong>Total Items: {printData.items.length}</strong></div>
            <div><strong>Total Qty: {printData.total}</strong></div>
          </div>

          <div style={{ marginTop: "8px", textAlign: "center", fontSize: "11px" }}>
            <div><strong>--- TRANSFER RECEIPT ---</strong></div>
          </div>

          <div style={{ marginTop: "6px", textAlign: "center", fontSize: "10px", fontStyle: "italic" }}>
            <div>Please verify items upon receipt</div>
            <div>Report discrepancies immediately</div>
          </div>
        </div>
      )}

      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .pos80, .pos80 * { visibility: visible; }
          .pos80 {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 4mm;
            font-family: "Courier New", monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .pos80 h2, .pos80 h3 { margin: 0; padding: 0; }
          .pos80 .info-row { display: flex; justify-content: space-between; font-size: 11px; }
          .pos80 table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .pos80 thead th { border-bottom: 1px dashed #000; padding-bottom: 2px; }
          .pos80 th, .pos80 td { padding: 2px 0; }
          .pos80 .right { text-align: right; }
        }
      `}</style>
    </>
  );
};

export default ViewTransfer;