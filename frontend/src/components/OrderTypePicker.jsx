import { NORMAL_MIN_KG, NORMAL_MAX_KG, BULK_MIN_KG } from "../utils/orderConstants";
const OrderTypePicker = ({
  orderType,
  onTypeChange,
  totalQty,
  unit = "kg",
  validationError,
}) => {
  const isNormal = orderType === "normal";
  const isBulk   = orderType === "bulk";

  const withinNormal = totalQty >= NORMAL_MIN_KG && totalQty <= NORMAL_MAX_KG;
  const withinBulk   = totalQty >= BULK_MIN_KG;

  const handleSelect = (type) => {
    const snapQty = type === "bulk" ? BULK_MIN_KG : NORMAL_MIN_KG;
    onTypeChange(type, snapQty);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-3 sm:space-y-4">

      {/* Header */}
      <div>
        <h3 className="font-bold text-gray-900 text-sm sm:text-base">Select order type</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Selecting a type sets the quantity to its minimum automatically.
        </p>
      </div>

      {/* Two type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ── Normal ── */}
        <button
          type="button"
          onClick={() => handleSelect("normal")}
          className={`relative rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-150 active:scale-[0.98] ${
            isNormal
              ? "border-green-500 bg-green-50 shadow-sm"
              : "border-gray-200 hover:border-green-300 hover:bg-green-50/40 bg-white"
          }`}
        >
          {/* Selected tick */}
          {isNormal && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}

          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="text-base" aria-hidden="true">🛒</span>
            <span className="font-bold text-gray-900 text-sm">Normal order</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-2.5 sm:mb-3">
            For household or small-business purchases.
          </p>

          <div className="space-y-1 mb-2.5 sm:mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Starts at</span>
              <span className="font-bold text-green-700 text-sm">{NORMAL_MIN_KG} {unit}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Maximum</span>
              <span className="font-semibold text-gray-700">{NORMAL_MAX_KG} {unit}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Pricing</span>
              <span className="font-semibold text-gray-700">Regular price</span>
            </div>
          </div>

          {/* Live qty badge */}
          {isNormal && (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${
                withinNormal
                  ? "bg-green-100 text-green-800"
                  : totalQty < NORMAL_MIN_KG
                  ? "bg-red-50 text-red-600"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {withinNormal
                ? `✓ ${totalQty} ${unit} fits`
                : totalQty < NORMAL_MIN_KG
                ? `Add ${NORMAL_MIN_KG - totalQty} more ${unit}`
                : `${totalQty - NORMAL_MAX_KG} ${unit} over limit`}
            </span>
          )}

          {/* Unselected hint */}
          {!isNormal && (
            <span className="text-xs text-gray-400 italic">
              Tap to start at {NORMAL_MIN_KG} {unit}
            </span>
          )}
        </button>

        {/* ── Bulk ── */}
        <button
          type="button"
          onClick={() => handleSelect("bulk")}
          className={`relative rounded-2xl border-2 p-3.5 sm:p-4 text-left transition-all duration-150 active:scale-[0.98] ${
            isBulk
              ? "border-amber-500 bg-amber-50 shadow-sm"
              : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 bg-white"
          }`}
        >
          {/* Selected tick */}
          {isBulk && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}

          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="text-base" aria-hidden="true">🏭</span>
            <span className="font-bold text-gray-900 text-sm">Bulk order</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-2.5 sm:mb-3">
            For restaurants, hotels, traders and large-scale buyers.
          </p>

          <div className="space-y-1 mb-2.5 sm:mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Starts at</span>
              <span className="font-bold text-amber-700 text-sm">{BULK_MIN_KG} {unit}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Maximum</span>
              <span className="font-semibold text-gray-700">No limit</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Pricing</span>
              <span className="font-semibold text-amber-700">Bulk discount applied</span>
            </div>
          </div>

          {/* Live qty badge */}
          {isBulk && (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${
                withinBulk
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {withinBulk
                ? `✓ ${totalQty} ${unit} qualifies`
                : `Add ${BULK_MIN_KG - totalQty} more ${unit}`}
            </span>
          )}

          {/* Unselected hint */}
          {!isBulk && (
            <span className="text-xs text-gray-400 italic">
              Tap to start at {BULK_MIN_KG} {unit}
            </span>
          )}
        </button>
      </div>

      {/* Quick reference — vertical stack on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span>Normal: {NORMAL_MIN_KG}–{NORMAL_MAX_KG} {unit} · regular price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span>Bulk: {BULK_MIN_KG}+ {unit} · bulk price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span>Same delivery fee</span>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm text-red-700">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

export default OrderTypePicker;