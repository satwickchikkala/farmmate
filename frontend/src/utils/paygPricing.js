// src/utils/paygPricing.js

export const PAYG_PRICES = {
    cropRec: { label: "Crop Recommendation", price: 8 },
    timeline: { label: "Timeline Generation", price: 15 },
    disease: { label: "Disease Detection", price: 12 },
    weather: { label: "Weather Forecast", price: 8 },
    extraLand: { label: "Extra Land (monthly)", price: 30 },
    aiChat: { label: "AI Chat (10 msgs)", price: 10 },
    exportReport: { label: "Export Report", price: 20 },
};

export const MARGIN = 1.0; // already includes margin in above prices