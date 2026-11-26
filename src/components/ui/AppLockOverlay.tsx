import React from 'react';
import {Fingerprint, Lock} from 'lucide-react';

interface AppLockOverlayProps {
  authenticating: boolean;
  error: string | null;
  onUnlock: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
  authenticating,
  error,
  onUnlock,
}) => {
  return (
    <div
      className="fixed inset-0 z-[100] bg-m3-surface text-m3-on-surface flex flex-col items-center justify-center px-6 text-center pt-safe pb-safe"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-screen-title"
    >
      <div className="max-w-xs w-full flex flex-col items-center">
        <div className="w-16 h-16 rounded-[24px] bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shadow-sm">
          <Lock className="w-7 h-7" />
        </div>

        <h1
          id="lock-screen-title"
          className="mt-5 font-display text-2xl font-semibold tracking-tight text-m3-on-surface"
        >
          CardLedger is locked
        </h1>
        <p className="mt-2 text-[13px] text-m3-on-surface-variant leading-relaxed">
          Verify your fingerprint or phone lock to access your cards and bank balances.
        </p>

        <button
          type="button"
          disabled={authenticating}
          onClick={onUnlock}
          className="mt-7 h-12 px-6 rounded-full bg-m3-primary text-m3-on-primary text-sm font-medium inline-flex items-center justify-center gap-2.5 shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
        >
          <Fingerprint className="w-5 h-5 shrink-0" />
          <span>{authenticating ? 'Verifying...' : 'Unlock with Fingerprint'}</span>
        </button>

        {error && (
          <p className="mt-4 text-xs text-m3-error leading-relaxed">{error}</p>
        )}
      </div>
    </div>
  );
};
