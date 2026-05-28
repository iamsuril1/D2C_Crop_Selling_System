import { useEffect } from 'react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'info', confirmText = 'OK', onConfirm }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50', border: 'border-green-200',
          icon: '✓', iconBg: 'bg-green-100', iconText: 'text-green-600',
          button: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
        };
      case 'error':
        return {
          bg: 'bg-red-50', border: 'border-red-200',
          icon: '✗', iconBg: 'bg-red-100', iconText: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50', border: 'border-yellow-200',
          icon: '⚠', iconBg: 'bg-yellow-100', iconText: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
        };
      default:
        return {
          bg: 'bg-blue-50', border: 'border-blue-200',
          icon: 'ℹ', iconBg: 'bg-blue-100', iconText: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    /* On mobile: sheet slides up from bottom. On sm+: centered dialog */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slideUp">
        {/* Header */}
        <div className={`${styles.bg} ${styles.border} border-b px-5 sm:px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xl sm:text-2xl ${styles.iconText}`}>{styles.icon}</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notice')}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 sm:px-6 py-5 sm:py-6">
          <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleConfirm}
            className={`${styles.button} text-white font-semibold px-6 py-2.5 sm:py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm w-full sm:w-auto`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;