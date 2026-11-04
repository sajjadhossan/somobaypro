import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Image as ImageIcon, Camera, CheckCircle2, 
  AlertCircle, Building2, User, Calendar, CreditCard, ChevronDown, 
  RotateCcw, Bot, ShieldCheck, Loader2, Mic, MicOff, Volume2, VolumeX,
  GripVertical, KeyRound, Settings, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  imagePreview?: string;
  draftSubmission?: any;
}

export const AIAssistantModal: React.FC = () => {
  const { user, society } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `👋 আসসালামু আলাইকুম ${user?.fullNameBn || 'সম্মানিত সদস্য'}!\n\nআমি **Somobay AI** — আপনার ডিজিটাল সমবায় ও স্মার্ট ভয়েস সহকারী।\n\nআপনি আমাকে মুখে বাংলায় **ভয়েস কমান্ড** দিতে পারেন, অথবা ব্যাংকে জমা দেওয়া **রসিদের ছবি (Deposit Slip)** দিলে সরাসরি চাঁদা এন্ট্রি ড্রাফট প্রস্তুত করতে পারি।`,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // Draggable Floating Button State
  const [btnPosition, setBtnPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDataRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0, moved: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Gemini API Key Management State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [aiStatus, setAiStatus] = useState<{ active: boolean; model: string }>({ active: false, model: 'gemini-2.0-flash' });
  const [savingKey, setSavingKey] = useState(false);

  // Auto Voice Submit Tracker
  const lastVoiceTranscriptRef = useRef('');
  const voiceAutoSpeakRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check AI Status (Gemini active or local)
  const fetchAiStatus = async () => {
    try {
      const token = localStorage.getItem('pkss_token');
      const res = await fetch('/api/ai/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch AI status');
    }
  };

  useEffect(() => {
    fetchAiStatus();
  }, []);

  // Voice Silence Timer & Audio Cue Helper
  const silenceTimerRef = useRef<any>(null);

  const playAudioTone = (f1: number, f2: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD';

      recognition.onstart = () => {
        setIsListening(true);
        lastVoiceTranscriptRef.current = '';
        playAudioTone(523, 784); // Mic ON chime
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputMessage(transcript);
        lastVoiceTranscriptRef.current = transcript;

        // Auto-submit after 1.8 seconds of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 1800);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const spokenText = lastVoiceTranscriptRef.current?.trim();
        if (spokenText && spokenText.length > 1) {
          playAudioTone(784, 1046); // Mic OFF chime
          lastVoiceTranscriptRef.current = '';
          voiceAutoSpeakRef.current = true;
          handleSendMessage(spokenText);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // Draggable Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      moved: false,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragDataRef.current.startX;
    const dy = e.clientY - dragDataRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragDataRef.current.moved = true;
    }
    const btnW = buttonRef.current?.offsetWidth || 150;
    const btnH = buttonRef.current?.offsetHeight || 50;
    const maxX = window.innerWidth - btnW - 10;
    const maxY = window.innerHeight - btnH - 10;

    const newX = Math.max(10, Math.min(maxX, dragDataRef.current.initX + dx));
    const newY = Math.max(10, Math.min(maxY, dragDataRef.current.initY + dy));
    setBtnPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleButtonClick = () => {
    if (dragDataRef.current.moved) {
      dragDataRef.current.moved = false;
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      alert('অনুগ্রহ করে একটি বৈধ Gemini API Key প্রদান করুন।');
      return;
    }
    setSavingKey(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const res = await fetch('/api/ai/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: apiKeyInput.trim(), model: 'gemini-2.0-flash' }),
      });
      if (res.ok) {
        alert('Google Gemini API Key সফলভাবে সেট করা হয়েছে! এখন এআই সুপার ফাস্ট কাজ করবে।');
        setShowApiKeyModal(false);
        setApiKeyInput('');
        fetchAiStatus();
      } else {
        const err = await res.json();
        alert(err.error || 'API Key সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch {
      alert('সার্ভার যোগাযোগ ত্রুটি।');
    } finally {
      setSavingKey(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('আপনার ব্রাউজারে ভয়েস স্পিচ রেকগনিশন সক্রিয় নেই। ক্রোম ব্রাউজার ব্যবহার করুন।');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition', err);
        setIsListening(false);
      }
    }
  };

  const speakMessage = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (currentlySpeakingId === id) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown asterisks, backticks, hashes, and formatting
    const clean = text
      .replace(/[*#_`~>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n\s*\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Search for best native Bengali voice
    try {
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('bn') ||
          v.lang.toLowerCase().includes('bd') ||
          v.name.toLowerCase().includes('bangla') ||
          v.name.toLowerCase().includes('bengali')
      );
      if (bnVoice) {
        utterance.voice = bnVoice;
      }
    } catch {}

    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);
    setCurrentlySpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMimeType(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() && !selectedImage) return;

    const userMsgId = 'msg-' + Date.now();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: message.trim() || 'ব্যাংক জমা রসিদ বিশ্লেষণ করুন।',
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      imagePreview: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputMessage('');
    const currentImage = selectedImage;
    const currentMime = imageMimeType;
    setSelectedImage(null);
    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem('pkss_token');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newUserMsg.text,
          imageBase64: currentImage,
          mimeType: currentMime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsgId = 'ai-' + Date.now();
        const aiMsg: Message = {
          id: aiMsgId,
          sender: 'ai',
          text: data.reply || 'বিশ্লেষণ সম্পন্ন হয়েছে।',
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          draftSubmission: data.draftSubmission || null,
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (voiceAutoSpeakRef.current && data.reply) {
          voiceAutoSpeakRef.current = false;
          speakMessage(aiMsgId, data.reply);
        }
      } else {
        const errData = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            sender: 'ai',
            text: `⚠️ দুঃখিত, এআই প্রসেসিংয়ে ত্রুটি ঘটেছে: ${errData.error || 'সার্ভার রেসপন্স করেনি'}`,
            timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: '⚠️ নেটওয়ার্ক ত্রুটি। সার্ভারের সাথে যোগাযোগ করা যায়নি।',
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmDraft = async (draft: any) => {
    setSubmittingDraft(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const res = await fetch('/api/payments/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: 'confirmed-' + Date.now(),
            sender: 'ai',
            text: `🎉 **জমা সফলভাবে সম্পন্ন হয়েছে!**\n\nসাবমিশন ট্র্যাকিং নং: **${data.submissionNumber}**।\nসদস্য: **${draft.memberName}** (${draft.targetMemberId})\nপরিমাণ: **৳${Number(draft.amount).toLocaleString('bn-BD')}**\n\nকোষাধ্যক্ষ ও সুপার এডমিনের ড্যাশবোর্ডে ভেরিফিকেশনের জন্য চলে গেছে এবং তাৎক্ষণিক ১-মিনিট টেলিগ্রাম ব্যাকআপ সম্পন্ন হয়েছে।`,
            timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const data = await res.json();
        alert(data.error || 'জমা সাবমিশন ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      alert('সার্ভার যোগাযোগ ত্রুটি।');
    } finally {
      setSubmittingDraft(false);
    }
  };

  return (
    <>
      {/* Floating Draggable Launcher Button with Voice Indicator */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={
          btnPosition
            ? { left: `${btnPosition.x}px`, top: `${btnPosition.y}px`, right: 'auto', bottom: 'auto' }
            : undefined
        }
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-3 py-2.5 sm:px-3.5 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 text-white rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-300/40 select-none touch-none transition-shadow ${
          isDragging ? 'cursor-grabbing scale-105 shadow-emerald-500/50' : 'cursor-grab'
        } group`}
        title="Somobay AI স্মার্ট ভয়েস সহকারী (আঙুল দিয়ে স্ক্রিনের যেকোনো জায়গায় সরিয়ে রাখতে পারবেন)"
      >
        <GripVertical className="w-4 h-4 text-emerald-200/70 group-hover:text-white" />
        <div className="relative">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
        </div>
        <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight">
          <span>{isOpen ? 'সহকারী বন্ধ' : 'Somobay AI'}</span>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-medium text-emerald-100">
            <Mic className="w-3 h-3 text-emerald-200" />
            <span className="hidden sm:inline">ভয়েস</span>
          </div>
        </div>
      </button>

      {/* Chat Window Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 sm:inset-auto sm:bottom-20 sm:right-6 z-50 w-full sm:w-[440px] sm:max-h-[640px] bg-white sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-white">Somobay AI</h3>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                    aiStatus.active 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {aiStatus.active ? 'Gemini 2.0' : 'লোকাল মোড'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  স্লিপ ওসিআর ও স্মার্ট ভয়েস সহকারী
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className={`p-1.5 rounded-xl transition ${
                  aiStatus.active
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                }`}
                title={aiStatus.active ? 'Gemini API কনফিগারেশন' : 'ফ্রি Gemini API Key যুক্ত করুন'}
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => handleSendMessage('কার কার বকেয়া চাঁদা আছে দেখাও')}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200 whitespace-nowrap transition font-medium shadow-2xs"
            >
              📋 বকেয়া তালিকা
            </button>
            <button
              onClick={() => handleSendMessage('সমিতির মোট কতজন সক্রিয় সদস্য আছেন?')}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-full border border-slate-200 whitespace-nowrap transition font-medium shadow-2xs"
            >
              👥 সদস্য সংখ্যা
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200 whitespace-nowrap transition font-bold shadow-2xs flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>রসিদ স্ক্যান</span>
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2 shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {/* Image attachment preview if any */}
                  {m.imagePreview && (
                    <div className="rounded-xl overflow-hidden border border-black/10 bg-black/5 max-h-48 mb-2">
                      <img src={m.imagePreview} alt="Attached Slip" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Message Text */}
                  <div className="whitespace-pre-line leading-relaxed text-xs">
                    {m.text}
                  </div>

                  {/* Draft Submission Voucher Card */}
                  {m.draftSubmission && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-2.5 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                        <span className="font-bold text-[11px] text-emerald-950 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          প্রস্তাবিত ব্যাংক জমা ভাউচার
                        </span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          এআই ড্রাফট
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">সদস্যের নাম:</span>
                          <span className="font-bold">{m.draftSubmission.memberName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">সদস্য আইডি:</span>
                          <span className="font-mono font-bold text-emerald-800">{m.draftSubmission.targetMemberId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">জমার পরিমাণ:</span>
                          <span className="font-bold text-emerald-700 text-xs">৳{Number(m.draftSubmission.amount).toLocaleString('bn-BD')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">জমার মাস:</span>
                          <span className="font-mono font-semibold">{m.draftSubmission.paymentMonths}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">জমাদানকারী:</span>
                          <span className="font-semibold">{m.draftSubmission.depositorName || 'নিজ'} ({m.draftSubmission.depositorRelation || 'নিজ'})</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ব্যাংক ও ট্রানজেকশন:</span>
                          <span className="font-medium text-[10px] truncate block">{m.draftSubmission.memberBankName || 'সোনালী ব্যাংক'} • {m.draftSubmission.transactionId || 'N/A'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmDraft(m.draftSubmission)}
                        disabled={submittingDraft}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {submittingDraft ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>এন্ট্রি সংরক্ষণ হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>১-ক্লিকে নিশ্চিত ও সাবমিট করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
                  <span>{m.timestamp}</span>
                  {m.sender === 'ai' && (
                    <button
                      type="button"
                      onClick={() => speakMessage(m.id, m.text)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1"
                      title={currentlySpeakingId === m.id ? 'ভয়েস বন্ধ করুন' : 'ভয়েসে শুনুন (Read aloud)'}
                    >
                      {currentlySpeakingId === m.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          <span className="text-[9px] text-red-500 font-bold">থামুন</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span className="text-[9px]">শুনুন</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs w-fit shadow-xs">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>Somobay AI স্লিপ ও ডাটা বিশ্লেষণ করছে...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Image Preview bar before send */}
          {selectedImage && (
            <div className="p-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-300" />
                <span className="text-xs text-emerald-900 font-medium">রসিদের ছবি সংযুক্ত হয়েছে</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-red-600 hover:bg-red-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice Listening Active Wave Banner */}
          {isListening && (
            <div className="px-3.5 py-2 bg-gradient-to-r from-red-500/10 via-rose-500/15 to-emerald-500/10 border-t border-red-300 text-red-700 text-xs flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5 h-4">
                  <span className="w-1 bg-red-600 rounded-full animate-[bounce_0.6s_infinite_100ms] h-3" />
                  <span className="w-1 bg-red-600 rounded-full animate-[bounce_0.6s_infinite_200ms] h-4" />
                  <span className="w-1 bg-red-600 rounded-full animate-[bounce_0.6s_infinite_300ms] h-2" />
                  <span className="w-1 bg-red-600 rounded-full animate-[bounce_0.6s_infinite_400ms] h-4" />
                </div>
                <span className="font-bold text-slate-900 text-[11px]">শুনছি... বাংলায় স্পষ্ট বলুন (বলার পর অটো সেন্ড হবে)</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded-lg font-bold shadow-xs transition"
              >
                শেষ করুন
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                title="ব্যাংক জমা স্লিপ আপলোড করুন"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/40'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
                title={isListening ? 'ভয়েস ইনপুট বন্ধ করুন' : 'বাংলায় ভয়েস ইনপুট দিন (Voice Input)'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'শুনছি... বলুন...' : 'মুখে বলুন বা লিখে জানান...'}
                className={`flex-1 p-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 outline-none transition ${
                  isListening ? 'border-red-400 ring-2 ring-red-200 bg-red-50/30' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isAnalyzing || (!inputMessage.trim() && !selectedImage)}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Gemini API Key Setup Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Google Gemini 2.0 API Key সেটআপ
                </h3>
                <p className="text-[11px] text-slate-500">
                  {aiStatus.active ? '✅ বর্তমানে একটি API Key সক্রিয় আছে' : '⚠️ বর্তমানে লোকাল অফলাইন মোডে আছে'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              গুগল জেমিনির অ্যাডভান্সড মাল্টিমোডাল ভিশন এবং সুপারফাস্ট বাংলা ভয়েস এনএলইউ সক্রিয় করতে আপনার ফ্রি API Key প্রদান করুন। এটি সম্পূর্ণ বিনামূল্যে পাওয়া যায়।
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Gemini API Key *
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>ফ্রি API Key তৈরি করুন</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="submit"
                  disabled={savingKey}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  {savingKey ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
