// src/utils/billManager.js
import { db } from "../firebase";
import {
    doc, getDoc, setDoc, updateDoc,
    collection, addDoc, query, where, getDocs
} from "firebase/firestore";
import { PAYG_PRICES } from "./paygPricing";
import { getYearMonth } from "./trackUsage";

// Generate bill for previous month
export const generateMonthlyBill = async (userId) => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey = getYearMonth(prevMonth);

    // Check if bill already generated for this month
    const billQuery = query(
        collection(db, "bills"),
        where("userId", "==", userId),
        where("month", "==", monthKey)
    );
    const existing = await getDocs(billQuery);
    if (!existing.empty) return existing.docs[0].data();

    // Get usage for previous month
    const usageRef = doc(db, "usage", `${userId}_${monthKey}`);
    const usageSnap = await getDoc(usageRef);
    const usage = usageSnap.exists() ? usageSnap.data() : {};

    // Count PAYG lands (isPayg === true)
    const landsQuery = query(
        collection(db, "lands"),
        where("userId", "==", userId),
        where("isPayg", "==", true)
    );
    const landsSnap = await getDocs(landsQuery);
    const paygLandCount = landsSnap.size;

    // Build bill items
    const items = [];

    // 1. Base charge — ₹30 per PAYG land per month
    if (paygLandCount > 0) {
        items.push({
            feature: "extraLand",
            label: `Extra Lands (${paygLandCount} lands × ₹30/month)`,
            quantity: paygLandCount,
            unitPrice: 30,
            total: paygLandCount * 30,
        });
    }

    // 2. Feature usage charges for PAYG lands only (tracked in usage doc)
    Object.entries(PAYG_PRICES).forEach(([key, { label, price }]) => {
        if (key === "extraLand") return; // Handled separately above
        const count = usage[`${key}Count`] || 0;
        if (count > 0) {
            items.push({
                feature: key,
                label,
                quantity: count,
                unitPrice: price,
                total: count * price,
            });
        }
    });

    // If no charges at all return null
    if (items.length === 0) return null;

    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

    // Due date is 5th of current month
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);
    // Grace period — stop services after 8th
    const stopDate = new Date(now.getFullYear(), now.getMonth(), 8);

    const bill = {
        userId,
        month: monthKey,
        generatedDate: now.toISOString(),
        dueDate: dueDate.toISOString(),
        stopDate: stopDate.toISOString(),
        status: "unpaid",
        items,
        totalAmount,
        paygLandCount,
        razorpayOrderId: null,
        razorpayPaymentId: null,
    };

    const billRef = await addDoc(collection(db, "bills"), bill);

    // Update user with current bill reference
    await updateDoc(doc(db, "users", userId), {
        currentBillId: billRef.id,
        billStatus: "unpaid",
        billDueDate: dueDate.toISOString(),
        billStopDate: stopDate.toISOString(),
    });

    return { id: billRef.id, ...bill };
};

// Get unpaid bill for user
export const getUnpaidBill = async (userId) => {
    // Generate previous month's bill if not already generated
    try {
        await generateMonthlyBill(userId);
    } catch (err) {
        console.error("Error generating bill:", err);
    }

    const q = query(
        collection(db, "bills"),
        where("userId", "==", userId),
        where("status", "==", "unpaid")
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Check if services should be stopped
export const isServiceStopped = (userDoc) => {
    if (userDoc?.plan !== "payg") return false;
    if (userDoc?.billStatus !== "unpaid") return false;
    if (!userDoc?.billStopDate) return false;

    return new Date() > new Date(userDoc.billStopDate);
};

// Mark bill as paid
export const markBillPaid = async (userId, billId, paymentId) => {
    await updateDoc(doc(db, "bills", billId), {
        status: "paid",
        razorpayPaymentId: paymentId,
        paidAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, "users", userId), {
        billStatus: "paid",
        currentBillId: null,
    });
};

// Get all billing history statements for a user
export const getAllBills = async (userId) => {
    const q = query(
        collection(db, "bills"),
        where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const bills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return bills.sort((a, b) => b.month.localeCompare(a.month));
};