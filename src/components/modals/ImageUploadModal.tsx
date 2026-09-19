import React, { useState, useRef } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
  UploadCloud,
  X,
  Sparkles,
  Plane,
  Building,
  Calendar,
  Train,
} from 'lucide-react';
import { analyzeImageWithAi } from '../../services/ai/aiClient';
import {
  getSampleFlightExtraction,
  getSampleHotelExtraction,
  getSampleTrainExtraction,
  getSampleCalendarExtraction,
  VisionExtractionResult,
} from '../../services/ai/visionExtractor';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractedReady: (result: VisionExtractionResult) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractedReady,
}) => {
  const { t, lang } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setIsLoading(true);
    setStatusMessage(
      lang === 'es' ? `Escaneando ${file.name}...` : `Scanning ${file.name}...`
    );

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const result = await analyzeImageWithAi(dataUrl, file.name, (status) =>
          setStatusMessage(status)
        );
        onExtractedReady(result);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = (type: 'flight' | 'hotel' | 'train' | 'calendar') => {
    setIsLoading(true);
    setStatusMessage(
      lang === 'es' ? 'Analizando documento de muestra...' : 'Analyzing sample document...'
    );

    setTimeout(() => {
      let result: VisionExtractionResult;
      if (type === 'flight') result = getSampleFlightExtraction();
      else if (type === 'hotel') result = getSampleHotelExtraction();
      else if (type === 'train') result = getSampleTrainExtraction();
      else result = getSampleCalendarExtraction();

      setIsLoading(false);
      onExtractedReady(result);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-upload-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <UploadCloud className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 id="image-upload-modal-title" className="text-base font-bold text-slate-100">
                {t.modals.upload.title}
              </h2>
              <p className="text-xs text-slate-400">{t.modals.upload.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) processFile(e.target.files[0]);
            }}
          />

          <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6 text-emerald-400" />
          </div>

          <p className="font-semibold text-slate-200 text-sm mb-1">
            {t.modals.upload.dropTitle}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t.modals.upload.dropSubtitle}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
            <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Quick Sample Presets */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-slate-300 block">
            {t.modals.upload.sampleTitle}
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSampleClick('calendar')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-xs text-slate-300"
            >
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">{t.modals.upload.calendarSample}</p>
                <p className="text-[10px] text-slate-500">{t.modals.upload.calendarSub}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSampleClick('flight')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-xs text-slate-300"
            >
              <Plane className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">{t.modals.upload.flightSample}</p>
                <p className="text-[10px] text-slate-500">{t.modals.upload.flightSub}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSampleClick('hotel')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-xs text-slate-300"
            >
              <Building className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">{t.modals.upload.hotelSample}</p>
                <p className="text-[10px] text-slate-500">{t.modals.upload.hotelSub}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSampleClick('train')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-xs text-slate-300"
            >
              <Train className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">{t.modals.upload.trainSample}</p>
                <p className="text-[10px] text-slate-500">{t.modals.upload.trainSub}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
