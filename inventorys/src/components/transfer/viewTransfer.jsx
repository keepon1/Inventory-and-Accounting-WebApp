import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faTachometer, faPrint, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { set } from "date-fns";

const ViewTransfer = (props) => {
  const [transfer, setTransfer] = useState({
    number: "",
    from: "",
    to: "",
    issueDate: "",
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
      date: transfer.issueDate,
      status: transfer.status,
      items,
    });
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
                  <input className="ivi_input" value={transfer.issueDate} readOnly title={transfer.issueDate} />
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
        </div>
      )}

      {printData && (
        <div className="print-container">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>{printData.business}</h2>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ textAlign: "left" }}>
              <p><b>Transfer ID:</b> {printData.id}</p>
              <p><b>Description:</b> {printData.description}</p>
              <p><b>User:</b> {printData.user}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p><b>Date:</b> {printData.date}</p>
              <p><b>From:</b> {printData.from}</p>
              <p><b>To:</b> {printData.to}</p>
              <p><b>Status:</b> {printData.status}</p>
            </div>
          </div>

          <table className="ia_main_table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {printData.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
          }
        }
      `}</style>
    </>
  );
};

export default ViewTransfer;
