// src/components/BillBanner.js
const GREEN = "#2d6a4f";

function BillBanner({ bill, onViewBill }) {
    const isOverdue = new Date() > new Date(bill.dueDate);
    const isStopDate = new Date() > new Date(bill.stopDate);

    return (
        <div style={{
            background: isStopDate ? "#fff5f5" : isOverdue ? "#fff8f0" : "#fff8f0",
            border: `1px solid ${isStopDate ? "#fecaca" : "#fde8c8"}`,
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
        }}>
            <div>
                <span style={{ fontSize: "13px", fontWeight: "600", color: isStopDate ? "#dc2626" : "#92400e" }}>
                    {isStopDate ? "🚫 Services stopped — " : isOverdue ? "⚠️ Bill overdue — " : "🧾 Bill pending — "}
                    ₹{bill.totalAmount} due for {bill.month}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "8px" }}>
                    Due: {new Date(bill.dueDate).toLocaleDateString("en-IN")}
                </span>
            </div>
            <button
                onClick={onViewBill}
                style={{
                    background: isStopDate ? "#dc2626" : "#e09f3e",
                    color: "white", border: "none",
                    padding: "6px 16px", borderRadius: "8px",
                    cursor: "pointer", fontSize: "13px",
                    fontWeight: "600", fontFamily: "DM Sans, sans-serif",
                    whiteSpace: "nowrap",
                }}
            >
                💳 Pay Now
            </button>
        </div>
    );
}

export default BillBanner;