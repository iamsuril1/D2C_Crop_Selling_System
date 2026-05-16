export const ORDER_TYPES = {
  NORMAL: "normal",
  BULK:   "bulk",
};

export const NORMAL_MIN_KG = 20;
export const NORMAL_MAX_KG = 99;
export const BULK_MIN_KG   = 100;
export const validateOrderTypeQty = (orderType, totalQty, unit = "kg") => {
  if (orderType === ORDER_TYPES.NORMAL) {
    if (totalQty < NORMAL_MIN_KG) {
      return `Normal orders require at least ${NORMAL_MIN_KG} ${unit}. Add ${NORMAL_MIN_KG - totalQty} more ${unit}, or switch to Bulk.`;
    }
    if (totalQty > NORMAL_MAX_KG) {
      return `Normal orders allow up to ${NORMAL_MAX_KG} ${unit}. You have ${totalQty} ${unit} — switch to Bulk for 100 ${unit}+.`;
    }
  } else if (orderType === ORDER_TYPES.BULK) {
    if (totalQty < BULK_MIN_KG) {
      return `Bulk orders require at least ${BULK_MIN_KG} ${unit}. You have ${totalQty} ${unit}.`;
    }
  } else {
    return `Invalid order type. Choose "normal" or "bulk".`;
  }
  return null;
};