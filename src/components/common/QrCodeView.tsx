import React, { useState } from 'react';
import { QrCode, Loader2 } from 'lucide-react';

interface QrCodeViewProps {
  url: string;
  size?: number;
  label?: string;
  className?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  url,
  size = 180,
  label,
  className = '',
}) => {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    url
  )}&margin=10&color=0f172a&bgcolor=ffffff`;

  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800 ${className}`}>
      <div className="relative flex items-center justify-center bg-white p-2 rounded-lg shadow-inner overflow-hidden" style={{ width: size + 16, height: size + 16 }}>
        {!hasLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        )}
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center text-[10px]">
            <QrCode className="w-8 h-8 text-slate-400 mb-1" />
            <span>Escaneo QR disponible</span>
          </div>
        ) : (
          <img
            src={qrApiUrl}
            alt="QR Code"
            width={size}
            height={size}
            onLoad={() => setHasLoaded(true)}
            onError={() => setHasError(true)}
            className={`transition-opacity duration-300 ${hasLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {label && (
        <span className="text-[11px] text-slate-400 mt-2 text-center font-medium flex items-center gap-1">
          <QrCode className="w-3 h-3 text-emerald-400" />
          {label}
        </span>
      )}
    </div>
  );
};
