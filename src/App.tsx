/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Mic, 
  Square, 
  History, 
  Settings, 
  ChevronRight, 
  Clock, 
  FileText, 
  Share2, 
  Trash2,
  ArrowLeft,
  Search,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { transcribeAndFormatAudio } from "./lib/gemini";
import { MeetingRecord } from "./types";
import { AudioVisualizer } from "./components/AudioVisualizer";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const [records, setRecords] = useState<MeetingRecord[]>(() => {
    const saved = localStorage.getItem("meeting_records");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<"recorder" | "history">("recorder");
  const [selectedRecord, setSelectedRecord] = useState<MeetingRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("meeting_records", JSON.stringify(records));
  }, [records]);

  // Timer logic
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await processRecording(audioBlob);
        audioStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请确保已授予权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(",")[1];
        
        const formattedText = await transcribeAndFormatAudio(base64Content, "audio/wav");
        
        const newRecord: MeetingRecord = {
          id: Date.now().toString(),
          title: `会议记录 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
          timestamp: new Date().toISOString(),
          duration: duration,
          transcript: "音频已处理",
          formattedText: formattedText
        };
        
        setRecords(prev => [newRecord, ...prev]);
        setSelectedRecord(newRecord);
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Processing error:", err);
      setIsProcessing(false);
      alert("处理音频时出错。");
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecords(records.filter(r => r.id !== id));
    if (selectedRecord?.id === id) setSelectedRecord(null);
  };

  const filteredRecords = records.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.formattedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-app-bg text-text-primary font-sans selection:bg-accent-blue/30 selection:text-white antialiased">
      <div className="max-w-[1200px] mx-auto min-h-screen grid grid-cols-1 md:grid-cols-[340px_1fr] bg-app-bg relative overflow-hidden">
        
        {/* Sidebar - Recorder Controls */}
        <aside className="border-r border-border-subtle p-8 md:p-10 flex flex-col bg-black/30 sticky top-0 md:h-screen z-20">
          <div className="flex items-center gap-2 mb-10 overflow-hidden">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRecording ? "bg-accent-red animate-pulse status-glow" : "bg-text-secondary"
            )} />
            <span className={cn(
              "text-xs font-bold uppercase tracking-[0.2em]",
              isRecording ? "text-accent-red" : "text-text-secondary"
            )}>
              {isRecording ? "正在录音..." : "录音就绪"}
            </span>
          </div>

          <div className="timer-display text-6xl font-extralight tracking-tighter mb-6 font-mono tabular-nums">
            {formatTime(duration)}
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-2 line-clamp-2">
              {isRecording ? "Q4 会议同步录制中" : "准备好开始了吗？"}
            </h2>
            <p className="text-text-secondary text-sm">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <AudioVisualizer isRecording={isRecording} stream={stream} />

          <div className="mt-auto space-y-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={cn(
                "w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all shadow-lg text-lg",
                isRecording 
                  ? "bg-white text-black" 
                  : "bg-accent-red text-white"
              )}
            >
              {isRecording ? (
                <>
                  <Square size={20} fill="black" />
                  <span>停止并生成实录</span>
                </>
              ) : (
                <>
                  <Mic size={20} fill="white" />
                  <span>开始会议录音</span>
                </>
              )}
            </motion.button>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 text-accent-blue font-bold py-4 glass-morphism rounded-2xl">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Settings size={20} />
                </motion.div>
                AI 正在处理...
              </div>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-text-secondary text-center text-xs font-medium opacity-60">
                支持多种语言实时转写与总结
              </p>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex flex-col h-screen overflow-hidden">
          {/* Header Actions */}
          <div className="px-8 py-6 flex justify-between items-center z-10 sticky top-0 bg-app-bg/80 backdrop-blur-md">
            <div className="flex gap-1.5 p-1 bg-card-bg rounded-xl border border-border-subtle">
              <button 
                onClick={() => setActiveTab("recorder")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeTab === "recorder" ? "bg-accent-blue/10 text-accent-blue" : "text-text-secondary hover:text-white"
                )}
              >
                实时记录
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  activeTab === "history" ? "bg-accent-blue/10 text-accent-blue" : "text-text-secondary hover:text-white"
                )}
              >
                历史历程
              </button>
            </div>
            
            {!selectedRecord && activeTab === "history" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input 
                  type="text" 
                  placeholder="搜索会议..." 
                  className="bg-card-bg/50 border border-border-subtle rounded-xl py-1.5 px-9 outline-none text-xs focus:border-accent-blue/50 transition-all w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-10">
            <AnimatePresence mode="wait">
              {selectedRecord ? (
                <motion.div 
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <button 
                    onClick={() => setSelectedRecord(null)}
                    className="flex items-center gap-2 text-accent-blue text-sm font-bold mb-4 hover:opacity-80 transition-all"
                  >
                    <ArrowLeft size={16} />
                    返回列表
                  </button>

                  <div className="transcript-container glass-morphism rounded-[2rem] p-8 md:p-10 shadow-2xl relative">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h1 className="text-3xl font-bold mb-2">{selectedRecord.title}</h1>
                        <div className="flex gap-4 text-text-secondary text-sm">
                          <span className="flex items-center gap-1.5">
                            <Clock size={16} />
                            {formatTime(selectedRecord.duration)}
                          </span>
                          <span>·</span>
                          <span>{new Date(selectedRecord.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white border border-white/10">
                          <Share2 size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            deleteRecord(selectedRecord.id, e as any);
                            setSelectedRecord(null);
                          }}
                          className="p-3 bg-accent-red/10 hover:bg-accent-red/20 rounded-xl transition-all text-accent-red border border-accent-red/20"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{selectedRecord.formattedText}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "history" ? (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {filteredRecords.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40">
                      <FileText size={48} className="mb-4" />
                      <p className="text-sm font-medium">暂无会议记录</p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                      <motion.div
                        key={record.id}
                        layoutId={record.id}
                        onClick={() => setSelectedRecord(record)}
                        className="bg-card-bg/40 border border-border-subtle p-6 rounded-3xl hover:bg-card-bg transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-accent-blue/10 p-2.5 rounded-2xl text-accent-blue">
                            <FileText size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                            {formatTime(record.duration)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-accent-blue transition-colors">
                          {record.title}
                        </h3>
                        <p className="text-text-secondary text-sm line-clamp-2 mb-4 opacity-80 leading-relaxed">
                          {record.formattedText.substring(0, 100).replace(/[#*]/g, '')}...
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                          <History size={12} />
                          {new Date(record.timestamp).toLocaleDateString()}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="recorder-welcome"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center py-20"
                >
                  <div className="w-24 h-24 bg-accent-blue/5 rounded-full flex items-center justify-center mb-8 relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute inset-0 bg-accent-blue/10 rounded-full" 
                    />
                    <Mic size={40} className="text-accent-blue" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">准备好捕捉灵感了吗？</h2>
                  <p className="text-text-secondary text-center max-w-sm leading-relaxed mb-10">
                    点击左侧按钮开始录音。MeetingNotes AI 将自动识别发言人，并整理成专业的会议纪要。
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                    <div className="bg-card-bg/50 border border-border-subtle p-5 rounded-2xl">
                      <div className="text-accent-orange mb-2"><CheckCircle2 size={24} /></div>
                      <h4 className="font-bold text-sm mb-1 text-white">精准转写</h4>
                      <p className="text-xs text-text-secondary leading-normal">基于 Gemini 3 Flash 模型，提供极高准确率的语音识别。</p>
                    </div>
                    <div className="bg-card-bg/50 border border-border-subtle p-5 rounded-2xl">
                      <div className="text-accent-blue mb-2"><FileText size={24} /></div>
                      <h4 className="font-bold text-sm mb-1 text-white">结构化摘要</h4>
                      <p className="text-xs text-text-secondary leading-normal">自动提取待办事项与核心观点，让会后回顾更高效。</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
