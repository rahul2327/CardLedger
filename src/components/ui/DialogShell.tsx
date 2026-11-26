import React, {useEffect} from 'react';
import {X} from 'lucide-react';

interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const DialogShell: React.FC<DialogShellProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'sm:max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4 transition-opacity duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="m3-dialog-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-m3-surface-lowest dark:bg-m3-surface-container text-m3-on-surface shadow-2xl border border-m3-outline-variant/70 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-m3-outline-variant" />
        </div>

        <div className="flex items-start justify-between gap-4 px-6 pt-4 sm:pt-6 pb-4 border-b border-m3-outline-variant/60">
          <div className="min-w-0">
            <h2
              id="m3-dialog-title"
              className="text-lg sm:text-xl font-semibold tracking-tight text-m3-on-surface"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-m3-on-surface-variant">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 pb-safe">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  checkboxLabel,
  checkboxChecked = false,
  onCheckboxChange,
}) => {
  return (
    <DialogShell open={open} onClose={onClose} title={title} maxWidthClass="sm:max-w-md">
      <p className="text-sm leading-relaxed text-m3-on-surface-variant">{message}</p>

      {checkboxLabel && onCheckboxChange && (
        <label className="mt-4 flex items-start gap-3 p-3.5 rounded-2xl bg-m3-surface-low cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checkboxChecked}
            onChange={(e) => onCheckboxChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-m3-outline accent-m3-primary shrink-0"
          />
          <span className="text-sm text-m3-on-surface">{checkboxLabel}</span>
        </label>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-5 rounded-full text-sm font-medium text-m3-on-surface-variant hover:bg-m3-surface-high transition-colors whitespace-nowrap shrink-0"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-[44px] px-5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            destructive
              ? 'bg-m3-error text-m3-on-error hover:opacity-90'
              : 'bg-m3-primary text-m3-on-primary hover:opacity-90'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
};
