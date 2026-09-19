import React, { useState, useEffect } from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  Share2,
  Users,
  Copy,
  Check,
  Download,
  MessageCircle,
  X,
  Radio,
  Sparkles,
  QrCode,
  LogOut,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  encodeTripToShareUrl,
  generateTripSummaryText,
  exportTripToFile,
} from '../../services/sharing/shareService';
import { collabEngine } from '../../services/collaboration/collabEngine';
import { CollaborationState } from '../../services/collaboration/types';
import { QrCodeView } from '../common/QrCodeView';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  initialTab?: 'share' | 'collab';
}

const AVATAR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  trip,
  initialTab = 'share',
}) => {
  const { lang, t } = useI18n();
  const modalRef = useModalA11y(isOpen, onClose);

  const [activeTab, setActiveTab] = useState<'share' | 'collab'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedCollabLink, setCopiedCollabLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // Collab state
  const [collabState, setCollabState] = useState<CollaborationState>(collabEngine.getState());
  const [userNameInput, setUserNameInput] = useState(collabState.me.name);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    collabEngine.setCurrentTripRef(trip);
    const unsubscribe = collabEngine.subscribe({
      onStateChange: (newState) => {
        setCollabState(newState);
        setUserNameInput(newState.me.name);
      },
    });
    return unsubscribe;
  }, [trip]);

  if (!isOpen) return null;

  const shareUrl = encodeTripToShareUrl(trip);
  const collabInviteUrl = collabState.roomId
    ? `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}#collab=${collabState.roomId}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopySummary = async () => {
    try {
      const summary = generateTripSummaryText(trip, lang as 'es' | 'en', shareUrl);
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCollabLink = async () => {
    if (!collabInviteUrl) return;
    try {
      await navigator.clipboard.writeText(collabInviteUrl);
      setCopiedCollabLink(true);
      setTimeout(() => setCopiedCollabLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportJson = () => {
    exportTripToFile(trip);
  };

  const handleStartHostRoom = () => {
    if (userNameInput.trim()) {
      collabEngine.setUserName(userNameInput.trim());
    }
    collabEngine.createRoom(userNameInput.trim(), trip);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const code = joinRoomInput.trim().toUpperCase();
    if (!code) {
      setJoinError(lang === 'es' ? 'Ingresa el código de la sala' : 'Please enter the room code');
      return;
    }
    if (userNameInput.trim()) {
      collabEngine.setUserName(userNameInput.trim());
    }
    collabEngine.joinRoom(code, userNameInput.trim());
    setJoinRoomInput('');
  };

  const handleLeaveRoom = () => {
    collabEngine.leaveRoom();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserNameInput(val);
    if (val.trim()) {
      collabEngine.setUserName(val.trim());
    }
  };

  const handleColorChange = (color: string) => {
    collabEngine.setUserColor(color);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {activeTab === 'share' ? <Share2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="share-modal-title" className="text-base font-bold text-slate-100">
                {lang === 'es' ? 'Compartir & Colaborar' : 'Share & Collaborate'}
              </h2>
              <p className="text-xs text-slate-400">
                {trip.name} • {trip.destinations.length} {lang === 'es' ? 'ciudades' : 'cities'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 -mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'share'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Compartir Itinerario' : 'Share Itinerary'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collab')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'collab'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Colaboración en Vivo' : 'Live Collaboration'}</span>
            {collabState.isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>

        {/* Tab 1: Share Itinerary */}
        {activeTab === 'share' && (
          <div className="space-y-4 text-xs">
            {/* Share link box */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium">
                {lang === 'es' ? 'Enlace directo de viaje' : 'Direct travel share link'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-[11px] truncate select-all focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar' : 'Copy')}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'es'
                  ? 'El itinerario completo está autocontenido en el enlace. Cualquiera que lo abra podrá previsualizarlo y guardarlo en su biblioteca.'
                  : 'The entire itinerary is self-contained in the URL. Anyone with this link can preview and save it to their library.'}
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* WhatsApp Summary */}
              <button
                type="button"
                onClick={handleCopySummary}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 flex items-center gap-1">
                    <span>{lang === 'es' ? 'Resumen para WhatsApp' : 'WhatsApp Summary'}</span>
                    {copiedSummary && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {copiedSummary
                      ? (lang === 'es' ? '¡Texto copiado al portapapeles!' : 'Copied to clipboard!')
                      : (lang === 'es' ? 'Copiar texto con emojis y fechas' : 'Copy text with stops & dates')}
                  </div>
                </div>
              </button>

              {/* QR Code toggle */}
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200">
                    {lang === 'es' ? 'Escanear en Móvil (QR)' : 'Scan on Mobile (QR)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {showQrCode
                      ? (lang === 'es' ? 'Ocultar código QR' : 'Hide QR code')
                      : (lang === 'es' ? 'Generar código QR' : 'Display QR code')}
                  </div>
                </div>
              </button>
            </div>

            {/* QR Code view */}
            {showQrCode && (
              <div className="pt-1 animate-fade-in flex justify-center">
                <QrCodeView
                  url={shareUrl}
                  size={160}
                  label={lang === 'es' ? 'Escanea con la cámara de tu smartphone' : 'Scan with your mobile camera'}
                />
              </div>
            )}

            {/* Export file option */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200 text-xs">
                  {lang === 'es' ? 'Descargar archivo de viaje (.json)' : 'Download travel file (.json)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === 'es'
                    ? 'Exporta el itinerario completo para copias de seguridad o importar en otro equipo'
                    : 'Export the complete itinerary for offline backups or importing elsewhere'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'es' ? 'Descargar' : 'Download'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Live Collaboration */}
        {activeTab === 'collab' && (
          <div className="space-y-4 text-xs">
            {/* User Profile Bar */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'es' ? 'Tu Identidad en la Sala' : 'Your Collaborator Identity'}</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  {lang === 'es' ? 'Visible para los demás' : 'Visible to others'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow"
                  style={{ backgroundColor: collabState.me.color }}
                >
                  {userNameInput.slice(0, 1).toUpperCase() || 'V'}
                </div>
                <input
                  type="text"
                  value={userNameInput}
                  onChange={handleNameChange}
                  placeholder={lang === 'es' ? 'Tu nombre o apodo...' : 'Your name or nickname...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 mr-1">
                  {lang === 'es' ? 'Color:' : 'Color:'}
                </span>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      collabState.me.color === c ? 'scale-125 ring-2 ring-white/60' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* If NOT connected: Options to Create or Join */}
            {!collabState.isConnected ? (
              <div className="space-y-3">
                {/* Create Room Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'es' ? 'Iniciar Nueva Sala de Colaboración' : 'Start New Collaboration Room'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'es'
                      ? 'Crea una sala en tiempo real para este viaje. Podrás invitar a otra persona mediante un código de 6 letras o un enlace directo.'
                      : 'Create a live room for this trip. You can invite someone via a 6-character room code or direct link.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartHostRoom}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-colors"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>{lang === 'es' ? 'Crear Sala y Ser Anfitrión' : 'Create Room & Host'}</span>
                  </button>
                </div>

                {/* Join Room Box */}
                <form onSubmit={handleJoinRoom} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>{lang === 'es' ? 'Unirme a una Sala Existente' : 'Join an Existing Room'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'es'
                      ? 'Si alguien ya inició una sala, ingresa el código aquí:'
                      : 'If someone already created a room, enter the code here:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={joinRoomInput}
                      onChange={(e) => {
                        setJoinRoomInput(e.target.value.toUpperCase());
                        setJoinError('');
                      }}
                      placeholder="TRIP-XXXX"
                      maxLength={9}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center font-bold tracking-wider text-sm uppercase focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>{lang === 'es' ? 'Conectar' : 'Connect'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {joinError && (
                    <div className="text-[11px] text-rose-400 font-medium">{joinError}</div>
                  )}
                </form>
              </div>
            ) : (
              /* If CONNECTED: Room active dashboard */
              <div className="space-y-3.5 animate-fade-in">
                {/* Active Room Badge Card */}
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-emerald-300 text-sm font-mono tracking-wide">
                        {collabState.roomId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                        {collabState.isHost
                          ? (lang === 'es' ? 'Anfitrión (Host)' : 'Host')
                          : (lang === 'es' ? 'Invitado (Guest)' : 'Guest')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCollabLink}
                      className="text-emerald-400 hover:text-emerald-200 text-[11px] flex items-center gap-1 font-medium bg-emerald-900/40 hover:bg-emerald-900/80 px-2 py-1 rounded transition-colors"
                    >
                      {copiedCollabLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCollabLink ? (lang === 'es' ? '¡Enlace copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar invitación' : 'Copy invite')}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    {lang === 'es'
                      ? 'Sincronización en tiempo real activa. Cualquier cambio en paradas, fechas u optimizaciones se reflejará al instante para todos.'
                      : 'Live sync is active. Any changes to stops, dates, or optimizations are reflected immediately for everyone.'}
                  </p>
                </div>

                {/* Collaborators list */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>
                      {lang === 'es' ? 'Participantes en la sala' : 'Participants in room'} (
                      {collabState.peers.length + 1})
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                      <ShieldCheck className="w-3 h-3" />
                      {lang === 'es' ? 'Canal encriptado' : 'Encrypted channel'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Self */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                          style={{ backgroundColor: collabState.me.color }}
                        >
                          {collabState.me.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200">{collabState.me.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({lang === 'es' ? 'Tú' : 'You'})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {lang === 'es' ? 'En línea' : 'Online'}
                      </span>
                    </div>

                    {/* Remote Peers */}
                    {collabState.peers.map((peer) => (
                      <div
                        key={peer.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                            style={{ backgroundColor: peer.color }}
                          >
                            {peer.name.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-200">{peer.name}</span>
                          {peer.isHost && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-medium">
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {lang === 'es' ? 'Conectado' : 'Connected'}
                        </span>
                      </div>
                    ))}

                    {collabState.peers.length === 0 && (
                      <div className="p-3 text-center text-[11px] text-slate-500 italic">
                        {lang === 'es'
                          ? 'Esperando a que tu compañero se una con el código ' + collabState.roomId
                          : 'Waiting for collaborator to join with code ' + collabState.roomId}
                      </div>
                    )}
                  </div>
                </div>

                {/* Disconnect button */}
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="w-full py-2 rounded-lg border border-rose-900/60 hover:bg-rose-950/40 text-rose-300 font-medium flex items-center justify-center gap-1.5 transition-colors text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'es' ? 'Salir de la Sala Colaborativa' : 'Leave Collaboration Room'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
