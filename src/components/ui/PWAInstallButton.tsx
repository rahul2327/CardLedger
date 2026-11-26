import React, {useState} from 'react';
import {Download, Smartphone} from 'lucide-react';
import {usePWAInstall} from '../../hooks/usePWAInstall';
import {isNativePlatform} from '../../utils/nativeAndroid';
import {DialogShell} from './DialogShell';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isNativePlatform() || isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-m3-primary-container text-m3-on-primary-container font-medium transition-colors hover:opacity-90 whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-4 text-xs' : 'min-h-[44px] px-5 text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install Offline App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container font-medium transition-colors hover:opacity-90 whitespace-nowrap shrink-0 ${
            compact ? 'min-h-[40px] px-4 text-xs' : 'min-h-[44px] px-5 text-sm'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Install on iOS</span>
        </button>

        <DialogShell
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install CardLedger on iPhone or iPad"
          subtitle="Run completely offline from your home screen"
          maxWidthClass="sm:max-w-md"
        >
          <ol className="space-y-3 text-sm text-m3-on-surface-variant list-decimal list-inside">
            <li>
              Tap the <strong className="text-m3-on-surface">Share</strong> icon in Safari&apos;s toolbar.
            </li>
            <li>
              Scroll down and choose{' '}
              <strong className="text-m3-on-surface">Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong className="text-m3-on-surface">Add</strong> to launch CardLedger as a standalone offline app.
            </li>
          </ol>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="min-h-[44px] px-5 rounded-full bg-m3-primary text-m3-on-primary text-sm font-medium"
            >
              Done
            </button>
          </div>
        </DialogShell>
      </>
    );
  }

  return null;
};
