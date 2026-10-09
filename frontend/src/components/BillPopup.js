// src/components/BillPopup.js
import { useState } from "react";
import axios from "axios";
import { auth } from "../firebase";
import { markBillPaid } from "../utils/billManager";
import API_URL from "../config";
import { usePopup } from "../context/PopupContext";

import { generateStatementPDF } from "../utils/pdfGenerator";

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

function BillPopup({ bill, onPaid, onClose }) {
    const [paying, setPaying] = useState(false);
    const { showAlert } = usePopup();

    const isPaid = bill.status === "paid";
    const isOverdue = !isPaid && new Date() > new Date(bill.dueDate);
    const isStopDate = !isPaid && new Date() > new Date(bill.stopDate);

    const handleDownloadPDF = () => {
        generateStatementPDF(bill, auth.currentUser || {});
    };

    const handlePayNow = async () => {
        setPaying(true);
        try {
            const orderRes = await axios.post(`${API_URL}/create-order`, {
                amount: bill.totalAmount,
                plan: "payg_bill",
                billId: bill.id,
                userId: auth.currentUser.uid,
            });

            const { orderId, keyId, amount } = orderRes.data;

            const options = {
                key: keyId,
                amount: amount,
                currency: "INR",
                name: "FarmMate",
                description: `Bill for ${bill.month}`,
                order_id: orderId,
                handler: async (response) => {
                    await markBillPaid(
                        auth.currentUser.uid,
                        bill.id,
                        response.razorpay_payment_id
                    );
                    showAlert("✅ Payment successful! Services restored.");
                    if (onPaid) onPaid();
                },
                prefill: {
                    email: auth.currentUser.email,
                    name: auth.currentUser.displayName || "",
                },
                theme: { color: GREEN },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            showAlert("Could not initiate payment. Try again.");
        }
        setPaying(false);
    };

  return (
    <div style={S.overlay} onClick={() => onClose && onClose()}>
      <style>{`
        .bill-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
        @media (max-width: 400px) {
          .bill-row { font-size: 11px !important; }
        }
      `}</style>
      <div style={S.popup} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>🧾 FarmMate Statement</h2>
            <p style={S.sub}>Bill for {bill.month}</p>
          </div>
          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "10px" }}>
            {isPaid ? (
              <span style={S.paidBadge}>✅ Paid</span>
            ) : isStopDate ? (
              <span style={S.stopBadge}>🚫 Services Stopped</span>
            ) : isOverdue ? (
              <span style={S.overdueBadge}>⚠️ Overdue</span>
            ) : (
              <span style={S.dueBadge}>
                Due: {new Date(bill.dueDate).toLocaleDateString("en-IN")}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontWeight: "700", color: "#6b7280" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bill items — grocery style */}
        <div style={S.billTable}>
          <div className="bill-row" style={{ fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", borderBottom: "none" }}>
            <span>Service</span>
            <span style={{ textAlign: "center" }}>Qty</span>
            <span style={{ textAlign: "right" }}>Rate</span>
            <span style={{ textAlign: "right" }}>Amount</span>
          </div>
          <div style={S.divider} />

          {bill.items?.map((item, i) => (
            <div key={i} className="bill-row">
              <span style={{ color: "#374151" }}>{item.label}</span>
              <span style={{ color: "#6b7280", textAlign: "center" }}>{item.quantity}</span>
              <span style={{ color: "#6b7280", textAlign: "right" }}>₹{item.unitPrice}</span>
              <span style={{ fontWeight: "600", textAlign: "right" }}>₹{item.total}</span>
            </div>
          ))}

          <div style={S.divider} />

          {/* Total */}
          <div className="bill-row" style={{ fontWeight: "700", fontSize: "16px", borderBottom: "none" }}>
            <span style={{ color: DARK }}>Total Amount</span>
            <span />
            <span />
            <span style={{ color: GREEN, fontSize: "20px", textAlign: "right" }}>₹{bill.totalAmount}</span>
          </div>
        </div>

        {/* Warning if overdue */}
        {!isPaid && isStopDate && (
          <div style={S.stopWarning}>
            🚫 Your services have been stopped due to non-payment.
            Pay now to restore all features immediately.
          </div>
        )}
        {!isPaid && isOverdue && !isStopDate && (
          <div style={S.overdueWarning}>
            ⚠️ Payment is overdue. Services will stop on{" "}
            {new Date(bill.stopDate).toLocaleDateString("en-IN")}.
            Pay now to avoid interruption.
          </div>
        )}

        {/* Pay Now button or Paid status info */}
        {isPaid ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px", textAlign: "center", marginBottom: "12px" }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "700", color: GREEN, fontSize: "15px" }}>
              ✅ Bill Paid in Full
            </p>
            {bill.paidAt && (
              <p style={{ margin: "2px 0", fontSize: "12px", color: "#15803d" }}>
                Paid on: {new Date(bill.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {bill.razorpayPaymentId && (
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6b7280" }}>
                Ref ID: <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>{bill.razorpayPaymentId}</code>
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={handlePayNow}
            disabled={paying}
            style={S.payBtn}
          >
            {paying ? "Opening payment..." : `💳 Pay Now ₹${bill.totalAmount}`}
          </button>
        )}

        {/* Download PDF Statement Action */}
        <button
          onClick={handleDownloadPDF}
          style={{
            width: "100%", padding: "11px",
            background: "#1a6985", color: "white",
            border: "none", borderRadius: "10px",
            fontSize: "14px", fontWeight: "600",
            cursor: "pointer", fontFamily: FONT,
            marginTop: "10px", display: "flex",
            alignItems: "center", justifyContent: "center", gap: "8px"
          }}
        >
          📥 Download PDF Statement
        </button>

        <p style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", margin: "10px 0 0 0" }}>
          Generated: {bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString("en-IN") : "N/A"} •
          Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-IN") : "N/A"}
        </p>
      </div>
    </div>
  );
}

const S = {
    overlay: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 2000,
        fontFamily: FONT,
    },
    popup: {
        background: "white", borderRadius: "16px",
        padding: "28px", maxWidth: "480px",
        width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    },
    header: {
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: "20px",
    },
    title: {
        fontFamily: "Playfair Display, serif",
        fontSize: "22px", color: DARK, margin: 0,
    },
    sub: { color: "#6b7280", fontSize: "13px", margin: "4px 0 0 0" },
    paidBadge: {
        background: "#f0fdf4", color: "#16a34a",
        border: "1px solid #bbf7d0",
        padding: "4px 10px", borderRadius: "8px",
        fontSize: "12px", fontWeight: "600",
    },
    dueBadge: {
        background: "#f0f7f4", color: GREEN,
        padding: "4px 10px", borderRadius: "8px",
        fontSize: "12px", fontWeight: "600",
    },
    overdueBadge: {
        background: "#fff8f0", color: "#e09f3e",
        padding: "4px 10px", borderRadius: "8px",
        fontSize: "12px", fontWeight: "600",
    },
    stopBadge: {
        background: "#fff5f5", color: "#dc2626",
        padding: "4px 10px", borderRadius: "8px",
        fontSize: "12px", fontWeight: "600",
    },
    billTable: {
        background: "#f9fafb", borderRadius: "10px",
        padding: "16px", marginBottom: "16px",
    },
    tableHeader: {
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
        fontSize: "11px", fontWeight: "700",
        color: "#9ca3af", textTransform: "uppercase",
        letterSpacing: "0.5px", marginBottom: "8px",
    },
    tableRow: {
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
        fontSize: "13px", padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
    },
    divider: {
        height: "2px", background: "#e5e7eb",
        margin: "8px 0",
    },
    overdueWarning: {
        background: "#fff8f0", border: "1px solid #fde8c8",
        borderRadius: "8px", padding: "12px 14px",
        fontSize: "13px", color: "#92400e",
        marginBottom: "14px", fontWeight: "500",
    },
    stopWarning: {
        background: "#fff5f5", border: "1px solid #fecaca",
        borderRadius: "8px", padding: "12px 14px",
        fontSize: "13px", color: "#dc2626",
        marginBottom: "14px", fontWeight: "500",
    },
    payBtn: {
        width: "100%", padding: "14px",
        background: `linear-gradient(135deg, ${GREEN}, ${DARK})`,
        color: "white", border: "none",
        borderRadius: "10px", fontSize: "15px",
        fontWeight: "700", cursor: "pointer",
        fontFamily: FONT,
    },
};

export default BillPopup;