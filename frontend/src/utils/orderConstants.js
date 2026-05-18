export const ORDER_TYPES = {
  NORMAL: "normal",
  BULK:   "bulk",
};

export const NORMAL_MIN_KG = 20;
export const NORMAL_MAX_KG = 99;
export const BULK_MIN_KG   = 100;

export const validateItemOrderType = (orderType, qty, unit = "kg") => {
  if (orderType === ORDER_TYPES.NORMAL) {
    if (qty < NORMAL_MIN_KG)
      return `Normal requires ≥ ${NORMAL_MIN_KG} ${unit} (have ${qty})`;
    if (qty > NORMAL_MAX_KG)
      return `Normal allows ≤ ${NORMAL_MAX_KG} ${unit} — switch to Bulk`;
  } else if (orderType === ORDER_TYPES.BULK) {
    if (qty < BULK_MIN_KG)
      return `Bulk requires ≥ ${BULK_MIN_KG} ${unit} (have ${qty})`;
  } else {
    return `Invalid order type`;
  }
  return null;
};

export const validateOrderTypeQty = validateItemOrderType;