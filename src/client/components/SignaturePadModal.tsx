import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureDataUrl: string) => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(user?.fullNameEn || user?.fullNameBn || '');

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a'; // Deep ink black/navy
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, signatureMode]);

  if (!isOpen) return null;

  // Touch / Mouse coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
      localStorage.setItem(`pkss_sig_${user?.memberId}`, dataUrl);
      onClose();
    } else {
      // Generate stylized calligraphic signature onto hidden canvas
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(typedName, 20, 60);
        const dataUrl = canvas.toDataURL('image/png');
        onSaveSignature(dataUrl);
        localStorage.setItem(`pkss_sig_${user?.memberId}`, dataUrl);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 my-auto animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border-b pb-3">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">ডিজিটাল স্বাক্ষর কনফিগারেশন</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            সমিতির সকল প্রিন্ট ডকুমেন্টস, রসিদ ও নথিতে স্বয়ংক্রিয়ভাবে সিল ও এই স্বাক্ষর বসে যাবে।
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setSignatureMode('draw')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              signatureMode === 'draw' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-500'
            }`}
          >
            ক্যানভাসে সরাসরি সাইন করুন (Draw)
          </button>
          <button
            onClick={() => setSignatureMode('type')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              signatureMode === 'type' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-500'
            }`}
          >
            ক্যালিগ্রাফিক স্টাইল সাইন (Type)
          </button>
        </div>

        {signatureMode === 'draw' ? (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 overflow-hidden relative touch-none">
              <canvas
                ref={canvasRef}
                width={360}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 cursor-crosshair bg-transparent"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                  এখানে আঙুল বা মাউস দিয়ে স্বাক্ষর আঁকুন
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পুনরায় আঁকুন (Clear)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">স্বাক্ষরে আপনার নাম লিখুন</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium"
              />
            </div>
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 text-center">
              <span className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">প্রিভিউ:</span>
              <span className="font-serif italic text-2xl text-slate-900 font-bold tracking-wide">
                {typedName || 'Your Signature'}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>স্বাক্ষর সংরক্ষণ ও নিশ্চিত করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
