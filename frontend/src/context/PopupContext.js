// src/context/PopupContext.js
import React, { createContext, useContext, useState } from "react";

const PopupContext = createContext();

export const usePopup = () => useContext(PopupContext);

const FONT = "DM Sans, sans-serif";
const GREEN = "#2d6a4f";
const DARK = "#1b4332";

export const PopupProvider = ({ children }) => {
  const [alertData, setAlertData] = useState({ isOpen: false, message: "", title: "Notification" });
  const [confirmData, setConfirmData] = useState({
    isOpen: false,
    message: "",
    title: "Confirm",
    onConfirm: null,
    onCancel: null,
    confirmText: "Yes",
    cancelText: "Cancel",
  });

  const showAlert = (message, title = "Notification") => {
    setAlertData({ isOpen: true, message, title });
  };

  const closeAlert = () => {
    setAlertData({ ...alertData, isOpen: false });
  };

  const showConfirm = (message, onConfirm, onCancel = null, title = "Confirm", confirmText = "Yes", cancelText = "Cancel") => {
    setConfirmData({
      isOpen: true,
      message,
      title,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    });
  };

  const handleConfirmAction = () => {
    if (confirmData.onConfirm) confirmData.onConfirm();
    setConfirmData({ ...confirmData, isOpen: false });
  };

  const handleCancelAction = () => {
    if (confirmData.onCancel) confirmData.onCancel();
    setConfirmData({ ...confirmData, isOpen: false });
  };

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Modals container */}
      {(alertData.isOpen || confirmData.isOpen) && (
        <div style={styles.overlay}>
          {/* Alert Modal */}
          {alertData.isOpen && (
            <div style={styles.modal}>
              <h3 style={styles.title}>{alertData.title}</h3>
              <p style={styles.message}>{alertData.message}</p>
              <div style={styles.buttonContainer}>
                <button onClick={closeAlert} style={styles.primaryBtn}>OK</button>
              </div>
            </div>
          )}

          {/* Confirm Modal */}
          {confirmData.isOpen && !alertData.isOpen && (
            <div style={styles.modal}>
              <h3 style={styles.title}>{confirmData.title}</h3>
              <p style={styles.message} dangerouslySetInnerHTML={{ __html: confirmData.message.replace(/\n/g, "<br/>") }}></p>
              <div style={styles.buttonContainer}>
                <button onClick={handleCancelAction} style={styles.secondaryBtn}>{confirmData.cancelText}</button>
                <button onClick={handleConfirmAction} style={styles.primaryBtn}>{confirmData.confirmText}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </PopupContext.Provider>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  modal: {
    background: "white",
    borderRadius: "16px",
    padding: "24px 32px",
    maxWidth: "400px",
    width: "90%",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    fontFamily: FONT,
    animation: "fadeIn 0.2s ease-out",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    color: DARK,
    fontSize: "22px",
    marginTop: 0,
    marginBottom: "12px",
  },
  message: {
    color: "#4b5563",
    fontSize: "15px",
    lineHeight: "1.5",
    margin: "0 0 24px 0",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  primaryBtn: {
    background: GREEN,
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: FONT,
    transition: "background 0.2s",
  },
  secondaryBtn: {
    background: "#f3f4f6",
    color: "#4b5563",
    border: "1px solid #e5e7eb",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: FONT,
    transition: "background 0.2s",
  },
};

// Inject simple keyframes for modal animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(styleSheet);
