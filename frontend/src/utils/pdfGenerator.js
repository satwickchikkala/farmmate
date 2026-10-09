// src/utils/pdfGenerator.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateStatementPDF = (bill, user = {}) => {
    if (!bill) return;

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const primaryColor = [27, 67, 50]; // #1b4332 Dark Green
    const textColor = [31, 41, 55];    // #1f2937
    const mutedColor = [107, 114, 128]; // #6b7280

    const billDateObj = new Date(`${bill.month}-01`);
    const formattedMonth = billDateObj.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
    });

    const isPaid = bill.status === "paid";
    const isOverdue = !isPaid && new Date() > new Date(bill.dueDate);
    const statusText = isPaid ? "PAID" : isOverdue ? "OVERDUE" : "UNPAID";

    // 1. Top Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("FARMMATE TECHNOLOGIES", 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("MONTHLY ACCOUNT STATEMENT", 196, 15, { align: "right" });

    // 2. Statement Metadata Block
    let y = 32;

    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Statement for ${formattedMonth}`, 14, y);

    const invoiceNo = `INV-${bill.month.replace("-", "")}-${(bill.id || "0000").slice(0, 6).toUpperCase()}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(`Statement No: ${invoiceNo}`, 14, y + 5);
    doc.text(`Generated Date: ${bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString("en-IN") : "N/A"}`, 14, y + 10);

    // Status Badge Box
    const badgeColor = isPaid ? [220, 252, 231] : isOverdue ? [254, 226, 226] : [254, 243, 199];
    const badgeTextColor = isPaid ? [21, 128, 61] : isOverdue ? [153, 27, 27] : [146, 64, 14];

    doc.setFillColor(...badgeColor);
    doc.roundedRect(156, y - 4, 40, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...badgeTextColor);
    doc.text(statusText, 176, y + 4, { align: "center" });

    // 3. 2-Column Details Box (Customer Info & Payment Details)
    y = 52;

    // Left Box: Customer Info
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, y, 88, 34, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text("BILLED TO / ACCOUNT DETAILS", 18, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textColor);
    const userName = user.displayName || user.name || "Valued Farmer";
    const userEmail = user.email || "N/A";
    const uid = user.uid ? `${user.uid.slice(0, 12)}...` : "N/A";

    doc.text(`Account Holder: ${userName}`, 18, y + 14);
    doc.text(`Email: ${userEmail}`, 18, y + 20);
    doc.text(`User ID: ${uid}`, 18, y + 26);

    // Right Box: Statement & Payment Details
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(108, y, 88, 34, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text("PAYMENT INFORMATION", 112, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textColor);

    doc.text(`Due Date: ${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-IN") : "N/A"}`, 112, y + 14);
    doc.text(`Payment Ref ID: ${bill.razorpayPaymentId || "Pending / Unpaid"}`, 112, y + 20);
    doc.text(`Payment Date: ${bill.paidAt ? new Date(bill.paidAt).toLocaleDateString("en-IN") : "N/A"}`, 112, y + 26);

    // 4. Credit Card Style 4-Box Summary Card
    y = 92;
    const boxWidth = 43;
    const gap = 3.3;

    const summaryBoxes = [
        { label: "PREVIOUS BALANCE", val: "₹0.00", bg: [248, 250, 252], textCol: textColor },
        { label: "NEW USAGE CHARGES", val: `₹${bill.totalAmount || 0}`, bg: [248, 250, 252], textCol: textColor },
        { label: "PAYMENTS RECEIVED", val: `₹${isPaid ? bill.totalAmount : 0}`, bg: [240, 253, 244], textCol: [21, 128, 61] },
        { label: "TOTAL BALANCE DUE", val: `₹${isPaid ? 0 : bill.totalAmount}`, bg: isPaid ? [248, 250, 252] : [254, 242, 242], textCol: isPaid ? textColor : [185, 28, 28] },
    ];

    summaryBoxes.forEach((b, i) => {
        const bx = 14 + i * (boxWidth + gap);
        doc.setFillColor(...b.bg);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(bx, y, boxWidth, 20, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...mutedColor);
        doc.text(b.label, bx + boxWidth / 2, y + 6, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...b.textCol);
        doc.text(b.val, bx + boxWidth / 2, y + 15, { align: "center" });
    });

    // 5. Itemized Breakdown Table
    y = 120;
    const tableBody = (bill.items || []).map((item, idx) => [
        idx + 1,
        item.label,
        item.quantity,
        `₹${item.unitPrice}`,
        `₹${item.total}`,
    ]);

    autoTable(doc, {
        startY: y,
        head: [["#", "SERVICE / ITEM DESCRIPTION", "QTY", "UNIT RATE (INR)", "AMOUNT (INR)"]],
        body: tableBody,
        theme: "grid",
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            halign: "left",
        },
        bodyStyles: {
            fontSize: 8.5,
            textColor: textColor,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 95 },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 28, halign: "right" },
            4: { cellWidth: 29, halign: "right", fontStyle: "bold" },
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
    });

    // 6. Summary Totals Box (Right aligned below table)
    let finalY = doc.lastAutoTable.finalY + 8;

    if (finalY > 240) {
        doc.addPage();
        finalY = 20;
    }

    const summaryBoxX = 118;
    const summaryBoxW = 78;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(summaryBoxX, finalY, summaryBoxW, 30, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...textColor);
    doc.text("Subtotal Charges:", summaryBoxX + 6, finalY + 7);
    doc.text(`₹${bill.totalAmount}`, summaryBoxX + summaryBoxW - 6, finalY + 7, { align: "right" });

    doc.text("Taxes & GST (0% Included):", summaryBoxX + 6, finalY + 13);
    doc.text("₹0.00", summaryBoxX + summaryBoxW - 6, finalY + 13, { align: "right" });

    doc.setDrawColor(209, 213, 219);
    doc.line(summaryBoxX + 6, finalY + 17, summaryBoxX + summaryBoxW - 6, finalY + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("Total Billed Amount:", summaryBoxX + 6, finalY + 24);
    doc.text(`₹${bill.totalAmount}`, summaryBoxX + summaryBoxW - 6, finalY + 24, { align: "right" });

    // 7. Footer & Authorization Note
    const footerY = 272;

    doc.setDrawColor(229, 231, 235);
    doc.line(14, footerY - 4, 196, footerY - 4);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text("Note: This is a computer-generated monthly statement issued by FarmMate Technologies.", 14, footerY);
    doc.text("For any queries or support regarding this invoice, please email support@farmmate.com", 14, footerY + 4);

    doc.setFont("helvetica", "normal");
    doc.text("Page 1 of 1", 196, footerY + 4, { align: "right" });

    // 8. Trigger Download
    doc.save(`FarmMate_Statement_${bill.month}.pdf`);
};
