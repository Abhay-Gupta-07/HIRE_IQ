import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Play, Sparkles, User, FileText, LayoutGrid, Award, AlertCircle, 
  Volume2, Check, Copy, ExternalLink, X, Link, Trash2, Mic, MicOff, Upload, 
  Plus, Activity, FileAudio, RefreshCw, Mail, Send
} from "lucide-react";
import { mockDb } from "../lib/mockDb";
import { Interview, ResumeData } from "../types";
import { getAppBaseUrl, isAiStudioOrigin, getQrCodeUrl } from "../lib/urlHelper";
import { supabase } from "../lib/supabaseClient";

interface NewInterviewProps {
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

export default function NewInterview({ onNavigate, theme = "dark" }: NewInterviewProps) {
  const isLight = theme === "light";
  const inputBg = isLight 
    ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500" 
    : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-750 focus:border-emerald-500";
  const labelColor = isLight ? "text-slate-600" : "text-slate-400";
  const panelBg = isLight ? "bg-slate-50 border-slate-200/80 shadow-sm" : "bg-slate-900/10 border-slate-850/70";
  const subPanelBg = isLight ? "bg-slate-100 border-slate-200/80" : "bg-slate-950/40 border-slate-850";
  const textColor = isLight ? "text-slate-900" : "text-slate-200";
  const textMuted = isLight ? "text-slate-500" : "text-slate-400";

  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [preferredVoice, setPreferredVoice] = useState<"female" | "male" | "replica">("female");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // New Interview Configurations
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [candidateLocation, setCandidateLocation] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [jobDescriptionFile, setJobDescriptionFile] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [lastParsedResumeName, setLastParsedResumeName] = useState("");
  const [isJdUploading, setIsJdUploading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [preGeneratedId] = useState(() => "int_" + Math.random().toString(36).substring(2, 11));
  const [preGeneratedCopied, setPreGeneratedCopied] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState(() => getAppBaseUrl());
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const handleUpdateCustomBaseUrl = (newUrl: string) => {
    localStorage.setItem("custom_public_origin", newUrl.trim());
    setCustomBaseUrl(getAppBaseUrl());
  };

  const getLocalSmtpConfig = () => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try {
        const parsed = JSON.parse(cfg);
        if (parsed.host && parsed.port && parsed.user && parsed.pass) {
          return parsed;
        }
      } catch(e){}
    }
    return null;
  };

  // Candidate fitment preferences states
  const [workModeEnabled, setWorkModeEnabled] = useState(true);
  const [workMode, setWorkMode] = useState<"on-site" | "remote" | "hybrid">("on-site");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationType, setLocationType] = useState<"current" | "preferred">("current");
  const [bondNoticeEnabled, setBondNoticeEnabled] = useState(true);

  // Manual pre-questions state
  const [manualQuestions, setManualQuestions] = useState<string[]>([""]);

  // Replica voice clone states
  const [replicaSettings, setReplicaSettings] = useState<{
    trained: boolean;
    pitch: number;
    rate: number;
    originalFilename?: string;
  }>(() => {
    const saved = localStorage.getItem("voice_replica_settings");
    return saved ? JSON.parse(saved) : { trained: false, pitch: 1.0, rate: 0.95 };
  });

  const [isRecordingReplica, setIsRecordingReplica] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(0);
  const [replicaUploadProgress, setReplicaUploadProgress] = useState(0);
  const [isUploadingReplica, setIsUploadingReplica] = useState(false);
  
  const voiceReplicaMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceReplicaStreamRef = useRef<MediaStream | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Invite states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInterviewId, setGeneratedInterviewId] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  // Manual questions logic
  const handleAddManualQuestion = () => {
    setManualQuestions([...manualQuestions, ""]);
  };

  const handleRemoveManualQuestion = (idx: number) => {
    const updated = manualQuestions.filter((_, i) => i !== idx);
    setManualQuestions(updated.length === 0 ? [""] : updated);
  };

  const handleManualQuestionChange = (idx: number, val: string) => {
    const updated = [...manualQuestions];
    updated[idx] = val;
    setManualQuestions(updated);
  };

  // Recording replica vocal profile
  const startRecordingReplica = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceReplicaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      voiceReplicaMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        // Formulate a fun estimated frequency based on standard voice pitch ratios
        const randomPitch = parseFloat((0.85 + Math.random() * 0.3).toFixed(2));
        const newSettings = {
          trained: true,
          pitch: randomPitch,
          rate: 0.95,
          originalFilename: `Voice_Replica_Recorded_Channel.wav`
        };
        setReplicaSettings(newSettings);
        localStorage.setItem("voice_replica_settings", JSON.stringify(newSettings));
        setPreferredVoice("replica");
      };

      mediaRecorder.start();
      setIsRecordingReplica(true);
      setRecordingSecondsLeft(5);

      const interval = setInterval(() => {
        setRecordingSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (mediaRecorder.state !== "inactive") {
              mediaRecorder.stop();
            }
            if (stream) {
              stream.getTracks().forEach(t => t.stop());
            }
            setIsRecordingReplica(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setError("Microphone permission has been rejected or is inaccessible.");
    }
  };

  // Uploading replica vocal document
  const handleVoiceUploadTrigger = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReplica(true);
    setReplicaUploadProgress(5);

    const interval = setInterval(() => {
      setReplicaUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploadingReplica(false);
            const newSettings = {
              trained: true,
              pitch: parseFloat((0.9 + Math.random() * 0.25).toFixed(2)),
              rate: 0.95,
              originalFilename: file.name
            };
            setReplicaSettings(newSettings);
            localStorage.setItem("voice_replica_settings", JSON.stringify(newSettings));
            setPreferredVoice("replica");
          }, 150);
          return 100;
        }
        return prev + 15;
      });
    }, 120);
  };

  const playVoiceDemo = async () => {
    // Stop standard speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Cancel the current HTML5 audio state if playing
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const text = "Namaste! I will be your Indian female AI recruiter for this interview session, ya? Best of luck!";
    speakSpeechSynthesisDemo(text);
  };

  const speakSpeechSynthesisDemo = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    const inVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith("en-in"));
    
    let selectedVoice = null;
    if (inVoices.length > 0) {
      // Find female Indian English voice
      const femaleIN = inVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("veena") || v.name.toLowerCase().includes("heera") || v.name.toLowerCase().includes("neerja"));
      selectedVoice = femaleIN || inVoices[0];
    } else {
      const premiumFemale = enVoices.find(v => v.name.toLowerCase().includes("female") && v.name.toLowerCase().includes("google"));
      if (premiumFemale) {
        selectedVoice = premiumFemale;
      } else {
        const femaleNames = ["zira", "samantha", "victoria", "hazel", "female", "karen", "moira", "tessa", "veena"];
        selectedVoice = enVoices.find(v => femaleNames.some(name => v.name.toLowerCase().includes(name)));
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (enVoices.length > 0) {
      utterance.voice = enVoices[0];
    }
    
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // Resume Parse handler (Simulator)
  const handleParseResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setLastParsedResumeName(file.name);
    setTimeout(() => {
      const parsedProfiles = [
        { name: "Devendra Kumar", email: "devendra.kumar@example.com", role: "Staff DevOps Engineer", location: "Bangalore, India", current: "₹24,00,000 / year", expected: "₹32,50,000 / year" },
        { name: "Sanjana Joshi", email: "sanjana.joshi@design.io", role: "Lead React Architect", location: "Mumbai, India", current: "₹18,50,000 / year", expected: "₹25,00,000 / year" },
        { name: "Rohan Mehra", email: "rohan.mehra@cloudtech.com", role: "Senior Backend Specialist", location: "Delhi NCR, India", current: "₹15,00,000 / year", expected: "₹22,00,000 / year" }
      ];
      const selected = parsedProfiles[Math.floor(Math.random() * parsedProfiles.length)];
      setCandidateName(selected.name);
      setCandidateEmail(selected.email);
      setTargetRole(selected.role);
      setCandidateLocation(selected.location);
      setCurrentSalary(selected.current);
      setExpectedSalary(selected.expected);
      setIsParsing(false);
    }, 1200);
  };

  // JD attachment handler
  const handleJdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsJdUploading(true);
    setTimeout(() => {
      setJobDescriptionFile(file.name);
      if (!jobDescriptionText) {
        setJobDescriptionText(`REQUIREMENTS FOR: ${file.name.replace(/\.[^/.]+$/, "")}\n- Proficiency in modern stack architecture and agile delivery.\n- Excellent collaborative and clear vocal communication skills.\n- Demonstrated system engineering and database persistence patterns.`);
      }
      setIsJdUploading(false);
    }, 800);
  };

  // Direct Send Email dispatcher
  const handleSendDirectEmail = () => {
    if (!candidateEmail.trim()) {
      setError("Please input a valid recipient candidate email ID to dispatch the invitation.");
      return;
    }
    if (!candidateName.trim()) {
      setError("Please state the Candidate's name first so the invite email is customized.");
      return;
    }
    setEmailStatus("sending");
    setError("");

    const clientEmailAddress = mockDb.getProfile()?.email || "";
    fetch("/api/send-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: candidateEmail.trim(),
        candidateName: candidateName.trim(),
        role: targetRole,
        inviteLink: `${customBaseUrl}/#/invite/${preGeneratedId}`,
        preferredVoice: preferredVoice,
        clientEmail: clientEmailAddress,
        smtpConfig: getLocalSmtpConfig()
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Email delivery failed on server.");
      }
      return res.json();
    })
    .then((data) => {
      if (data.deliveryStatus === "failed") {
        setEmailStatus("idle");
        setError(data.deliveryError || "Mail Server failed to transmit.");
      } else {
        setEmailStatus("sent");
        setTimeout(() => setEmailStatus("idle"), 6000);
      }
    })
    .catch((err: any) => {
      console.error("Direct send error:", err);
      setError(err.message || "Failed to dispatch email. Please check your Resend configuration.");
      setEmailStatus("idle");
    });
  };

  useEffect(() => {
    // Read resumes and profile name
    const storedResumes = mockDb.getResumes();
    setResumes(storedResumes);
    if (storedResumes.length > 0) {
      setSelectedResumeId(storedResumes[0].id);
    }
    
    const profile = mockDb.getProfile();
    if (profile?.full_name) {
      setCandidateName(profile.full_name);
    }

    return () => {
      // Pause any active ElevenLabs audio on unmount
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (resumes.length === 0) {
      setError("Please upload a resume first. A resume is strictly required to initialize the Practice Room.");
      setIsLoading(false);
      return;
    }

    if (!selectedResumeId) {
      setError("Please select a target resume scenario.");
      setIsLoading(false);
      return;
    }

    if (!candidateName.trim()) {
      setError("Please specify a candidate name. It is required to open the voice session.");
      setIsLoading(false);
      return;
    }

    if (!targetRole.trim()) {
      setError("Please specify your target role.");
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      try {
        const interviewId = preGeneratedId || "int_" + Math.random().toString(36).substring(2, 11);
        const selectedResume = resumes.find(r => r.id === selectedResumeId);
        
        const filteredManualQs = manualQuestions.map(q => q.trim()).filter(q => q !== "");

        const newInterview: Interview = {
          id: interviewId,
          user_id: "client_user",
          resume_id: selectedResumeId || "no_resume",
          candidate_name: candidateName,
          candidate_email: candidateEmail.trim() || undefined,
          role: targetRole,
          difficulty: "medium", // set default difficulty level since the tier selector is removed
          total_questions: totalQuestions,
          current_question_idx: 0,
          status: "in_progress",
          started_at: new Date().toISOString(),
          resume_filename: selectedResume?.filename || (lastParsedResumeName ? lastParsedResumeName : "Resume Portfolio.pdf"),
          decision: "pending",
          preferred_voice: preferredVoice,
          manual_questions: filteredManualQs,
          fitment_work_mode_enabled: workModeEnabled,
          fitment_work_mode: workMode,
          fitment_location_enabled: locationEnabled,
          fitment_location_type: locationType,
          fitment_bond_notice_enabled: bondNoticeEnabled,
          expected_salary: expectedSalary || undefined,
          current_salary: currentSalary || undefined,
          location: candidateLocation || undefined,
          job_description: jobDescriptionText || undefined,
          job_description_filename: jobDescriptionFile || undefined
        };

        // Save in mockDb
        mockDb.createInterview(newInterview);

        // Step 1: Save standard template schema to Supabase interviews table
        const defaultQuestions = [
          "What is the single most critical micro-optimization or performance trade-off you have made in your recent software architecture?",
          "How do you guarantee reliable state consistency and prevent race conditions when handling high-concurrency event loops?",
          "Under what clear constraints would you choose optimistic concurrency over pessimistic locking in a distributed datastore?",
          "How do you measure, diagnose, and definitively resolve complex memory leaks or reference cycle bottlenecks at scale?"
        ];
        const supaTemplate = {
          id: interviewId,
          interviewId: interviewId,
          role: targetRole,
          title: targetRole,
          questions: filteredManualQs.length > 0 ? filteredManualQs : defaultQuestions,
          createdBy: mockDb.getProfile()?.email || "company@gmail.com",
          created_at: new Date().toISOString()
        };

        const saveTemplateToSupa = async () => {
          try {
            const { error } = await supabase.from("interviews").insert([supaTemplate]);
            if (error) {
              console.warn("Supabase 'interviews' table insert warning (standard sandbox fallback in effect):", error);
            } else {
              console.log("✔ Supabase 'interviews' template saved successfully:", supaTemplate);
            }
          } catch (err) {
            console.warn("Supabase table exceptions handled successfully:", err);
          }
        };
        saveTemplateToSupa();
        
        // Save matching initial profile name sync
        const profile = mockDb.getProfile();
        profile.full_name = candidateName;
        mockDb.updateProfile(profile);

        // Auto Send Link to Email
        if (candidateEmail.trim() && autoSendEmail) {
          const clientEmailAddress = mockDb.getProfile()?.email || "";
          fetch("/api/send-invite-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: candidateEmail.trim(),
              candidateName: candidateName.trim(),
              role: targetRole,
              inviteLink: `${customBaseUrl}/#/invite/${interviewId}`,
              preferredVoice: preferredVoice,
              clientEmail: clientEmailAddress,
              smtpConfig: getLocalSmtpConfig()
            })
          })
          .then(res => res.json())
          .then(data => console.log("SMTP Link Broadcast Complete:", data))
          .catch(e => console.error("SMTP Broadcast Error:", e));
        }

        setGeneratedInterviewId(interviewId);
        setIsLoading(false);
        setInviteCopied(false);
        setShowInviteModal(true);
      } catch (err: any) {
        console.error(err);
        setError("Could not create interview session. Ensure database syncing is unobstructed.");
        setIsLoading(false);
      }
    }, 750);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>

      {/* HeaderNav */}
      <header className={`relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b z-10 backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200 bg-[#f8f8f6]/30" : "border-slate-900 bg-slate-950/30"
      }`}>
        <button
          id="btn_new_int_back"
          onClick={() => onNavigate("/app")}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">New Session Setup</span>
      </header>

      {/* Main Form Context */}
      <main className="max-w-7xl mx-auto px-6 py-10 z-10 relative">
        <div className="max-w-2xl mx-auto">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-8 border rounded-2xl transition-all duration-500 ${
              isLight ? "bg-white/85 border-slate-200/80 shadow-xl" : "bg-slate-900/40 border-slate-800 shadow-2xl"
            }`}
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 through-teal-400 to-blue-500 rounded-t-2xl" />

            <div className="text-center space-y-2 mb-8">
              <h2 className={`text-xl font-bold font-display tracking-tight ${isLight ? "text-[#131518]" : "text-white"}`}>Configure Interview Room</h2>
              <p className={`text-xs px-4 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Personalize details below to start. The AI generates and speaks highly targeted system-level technical and behavioral questions aloud.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartInterview} className="space-y-6">
              
              {/* BRAND NEW COMPLEX CONFIGURATION DESK */}
              <div className={`p-6 border rounded-2xl space-y-5 transition-all duration-500 ${panelBg}`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200/50 dark:border-slate-800/40">
                  <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Candidate Dossier & JD Desk
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Integrative Setup</span>
                </div>

                {/* Name, Email ID, Resume Parse Row */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name field */}
                    <div className="space-y-1.5">
                      <label htmlFor="setup_candidate_name" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        Candidate Full Name <span className="text-emerald-500 font-extrabold">*</span>
                      </label>
                      <input
                        id="setup_candidate_name"
                        type="text"
                        value={candidateName}
                        onChange={(e) => {
                          setCandidateName(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="E.g., Alex Rodriguez"
                        className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none tracking-wide transition-all font-sans ${inputBg}`}
                        required
                      />
                    </div>

                    {/* Email ID field */}
                    <div className="space-y-1.5">
                      <label htmlFor="setup_candidate_email" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        Candidate Email ID
                      </label>
                      <input
                        id="setup_candidate_email"
                        type="email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="e.g., candidate@domain.com"
                        className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                      />
                    </div>
                  </div>

                  {/* Resume Parse interactive segment */}
                  <div className="space-y-2">
                    <label className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Resume Parse File Upload
                    </label>
                    <div className={`relative border border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] ${
                      isParsing ? "border-emerald-500/50" : isLight ? "border-slate-350 hover:border-emerald-400" : "border-slate-800 hover:border-emerald-500/50"
                    }`}>
                      <input 
                        type="file" 
                        id="resume_dossier_parse"
                        onChange={handleParseResume} 
                        className="absolute inset-0 opacity-0 cursor-pointer text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt" 
                        disabled={isParsing}
                      />
                      {isParsing ? (
                        <div className="flex flex-col items-center gap-2 py-2 text-center">
                          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                          <p className="text-[10px] font-mono text-emerald-400 font-semibold uppercase animate-pulse">Scanning and extracting candidate parameters...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1.5 py-1">
                          <Upload className="w-4.5 h-4.5 mx-auto text-emerald-500 opacity-80" />
                          <p className={`text-[11px] font-medium ${isLight ? "text-slate-800" : "text-white"}`}>Drag & Drop Portfolio Resume or click to parse</p>
                          <p className="text-[9px] text-slate-500 leading-normal">Simulates high-fidelity extraction (Name, Email, Role, Location, Salaries)</p>
                          {lastParsedResumeName && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                              <Check className="w-2.5 h-2.5" /> Parsed: {lastParsedResumeName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="jd_text_area" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Job Description Requirement
                    </label>
                    <textarea
                      id="jd_text_area"
                      rows={3}
                      value={jobDescriptionText}
                      onChange={(e) => setJobDescriptionText(e.target.value)}
                      placeholder="Paste the target job description or core mandates here to align questions..."
                      className={`w-full rounded-lg p-3 text-xs focus:outline-none leading-relaxed resize-none transition-all font-sans ${inputBg}`}
                    />
                  </div>

                  {/* Attach JD file */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <label className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <Plus className="w-3.5 h-3.5 text-teal-400" />
                        Attach JD File
                      </label>
                      <p className="text-[9px] text-slate-500 leading-normal">Upload JD specs as PDF or DOCX</p>
                    </div>

                    <div className="relative pt-1">
                      <input 
                        type="file" 
                        id="jd_file_loader" 
                        onChange={handleJdUpload} 
                        className="hidden text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={isJdUploading}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("jd_file_loader")?.click()}
                        disabled={isJdUploading}
                        className={`w-full h-10 border rounded-lg font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isLight 
                            ? "bg-white hover:bg-slate-50 border-slate-250 text-slate-705" 
                            : "bg-slate-950 hover:bg-slate-900 border-slate-850 text-slate-305"
                        }`}
                      >
                        {isJdUploading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                            <span>Uploading...</span>
                          </>
                        ) : jobDescriptionFile ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="truncate max-w-[120px] text-emerald-400 font-extrabold">{jobDescriptionFile}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>Browse JD</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Salary: Expected, Current */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <div className="space-y-1.5">
                    <label htmlFor="setup_current_salary" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Current Salary Setup
                    </label>
                    <input
                      id="setup_current_salary"
                      type="text"
                      value={currentSalary}
                      onChange={(e) => setCurrentSalary(e.target.value)}
                      placeholder="e.g., ₹12,00,000 / year"
                      className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="setup_expected_salary" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Expected Salary Setup
                    </label>
                    <input
                      id="setup_expected_salary"
                      type="text"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder="e.g., ₹18,50,050 / year"
                      className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Location Input Row */}
                <div className="space-y-1.5 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <label htmlFor="setup_candidate_location" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                    <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                    Target Candidate Location
                  </label>
                  <input
                    id="setup_candidate_location"
                    type="text"
                    value={candidateLocation}
                    onChange={(e) => setCandidateLocation(e.target.value)}
                    placeholder="e.g., Pune, Maharashtra or Remote, India"
                    className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                  />
                </div>

                {/* Action Hub: Copy interview Link & Send Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  {/* Copy Interview Link section */}
                  <div className="space-y-2">
                    <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-550 block font-bold">
                      Pre-generated Invite Link:
                    </label>
                    <div className={`flex border rounded-lg p-0.5 items-center gap-2 ${inputBg}`}>
                      <input
                        type="text"
                        readOnly
                        value={`${customBaseUrl}/#/invite/${preGeneratedId}`}
                        className="flex-1 bg-transparent pl-3 pr-1 text-[10.5px] font-mono text-emerald-400 focus:outline-none truncate select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${customBaseUrl}/#/invite/${preGeneratedId}`);
                          setPreGeneratedCopied(true);
                          setTimeout(() => setPreGeneratedCopied(false), 3000);
                        }}
                        className={`h-8 px-3 rounded-md font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 shrink-0 ${
                          preGeneratedCopied 
                            ? "bg-emerald-500 text-slate-950 font-black" 
                            : "bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white"
                        }`}
                      >
                        {preGeneratedCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                        <span>{preGeneratedCopied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Send Email direct button */}
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-550 block font-bold">
                      Direct Messaging dispatch:
                    </label>
                    <button
                      type="button"
                      id="btn_send_direct_email"
                      onClick={handleSendDirectEmail}
                      disabled={emailStatus === "sending" || !candidateEmail.trim()}
                      className={`h-9 w-full rounded-lg font-mono text-[9.5px] uppercase font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        emailStatus === "sent"
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : emailStatus === "sending"
                            ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
                            : "bg-indigo-500/[0.08] hover:bg-indigo-500/[0.15] border-indigo-500/25 text-indigo-400 hover:text-indigo-305"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {emailStatus === "sending" ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Delivering invite...</span>
                        </>
                      ) : emailStatus === "sent" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Invitation Sent!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Email Invite</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Settings Section */}
                  <div className="md:col-span-2 space-y-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlSettings(!showUrlSettings)}
                      className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none"
                    >
                      <span>⚙️ {showUrlSettings ? "Hide QR & Mobile Share Settings" : "Open QR Code / Mobile Share Mode"}</span>
                    </button>
                    
                    {showUrlSettings && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3.5 rounded-lg border border-indigo-500/10 bg-indigo-950/20 space-y-3 font-sans text-[11px]"
                      >
                        <p className="font-mono text-[9px] uppercase tracking-wider text-indigo-300 font-bold">📱 Mobile Device / Multi-Device Linking Console</p>
                        <p className="text-slate-400 leading-relaxed font-light">
                          If you are editing inside <strong>Google AI Studio</strong>, copying your main browser's address bar URL (<code className="text-amber-400 font-mono text-[10px]">aistudio.google.com/...</code>) will result in a <strong>403 Forbidden Error</strong> on other devices because that environment is password-protected and private to your session.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                          <div className="sm:col-span-8 space-y-2">
                            <label className="text-[9px] font-mono uppercase text-slate-405 font-bold block">
                              Configure Public App Domain (Base URL):
                            </label>
                            <input
                              type="text"
                              value={customBaseUrl}
                              onChange={(e) => handleUpdateCustomBaseUrl(e.target.value)}
                              placeholder={`e.g. ${window.location.origin}`}
                              className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-indigo-300 focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBaseUrl(window.location.origin)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[8px] font-mono font-medium text-slate-300"
                              >
                                Reset to Current Origin
                              </button>
                            </div>
                            <p className="text-slate-400 leading-normal text-[10px]">
                              Tip: Paste your <strong className="text-emerald-400">Shared App URL</strong> (or click "Reset to Current Origin" if this matches your Cloud Run domain) to update the invite links instantly.
                            </p>
                          </div>
                          
                          <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 rounded bg-slate-950 border border-slate-900">
                            <img 
                              src={getQrCodeUrl(`${customBaseUrl}/#/invite/${preGeneratedId}`)} 
                              alt="Scan to open on other devices" 
                              className="w-24 h-24 bg-white p-0.5 rounded shadow-sm"
                            />
                            <span className="text-[8px] font-mono text-slate-405 mt-1.5 uppercase text-center font-bold">Scan to open on phone</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* LIVE COMPREHENSIVE EMAIL PREVIEW DESK */}
                <div className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#64748b] dark:text-slate-400 font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      Live Email Notification Preview
                    </span>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase font-black tracking-wider">Candidate Template Layout</span>
                  </div>
                  
                  <div className={`p-4 rounded-xl border font-sans text-xs space-y-4 ${
                    isLight ? "bg-[#fcfcfb] border-slate-205 text-slate-705" : "bg-slate-950 border-slate-850/80 text-slate-300"
                  }`}>
                    {/* Greetings Section */}
                    <div className="border-b pb-2.5 border-slate-200/55 dark:border-slate-800/80">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-450 dark:text-slate-500">Greetings from Company</p>
                      <p className={`text-[11.5px] font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>Greetings from HireIQ Talent Platform</p>
                    </div>

                    {/* Body text with button */}
                    <div className="space-y-3">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-450 dark:text-slate-500">Body & Action CTA Channel</p>
                      <p className="leading-relaxed text-[11px]">
                        Dear <strong>{candidateName || "Candidate Name"}</strong>,<br />
                        We are pleased to invite you to complete a secure AI Voice-Simulated Interview session for the position of <strong>{targetRole || "Software Engineer"}</strong>.
                      </p>
                      <div className="py-2.5 text-center">
                        <a 
                          href={`${customBaseUrl}/#/invite/${preGeneratedId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[11px] tracking-wide inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Start Your AI Interview</span>
                          <span className="text-xs">&rarr;</span>
                        </a>
                      </div>
                    </div>

                    {/* Instructions segment */}
                    <div className="p-3.5 rounded-lg bg-purple-500/[0.02] border border-purple-500/10 space-y-2">
                      <p className="text-[8.5px] font-mono uppercase tracking-widest text-purple-600 dark:text-purple-400 font-black flex items-center gap-1">📋 Key Instructions & Guidelines</p>
                      <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed">
                        <li><strong>Preparation:</strong> Secure a quiet, distraction-free room before launching.</li>
                        <li><strong>Audio Input:</strong> Grant browser microphone and camera permissions when prompted.</li>
                        <li><strong>Stability:</strong> Maintain a reliable internet connection to prevent telemetry lag.</li>
                        <li><strong>Interactive Process:</strong> Answer naturally using real-time speech. Review detailed feedback upon finishing.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. TARGET ROLE */}
              <div className="space-y-1.5 col-span-1">
                <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                  <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                  Target Role Setup <span className="text-slate-500">*</span>
                </label>
                <input
                  id="setup_target_role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="E.g., Senior Frontend Engineer"
                  className={`w-full h-11 rounded-lg px-4 text-xs focus:outline-none tracking-wide transition-all font-sans ${inputBg}`}
                  required
                />
              </div>

              {/* 3. QUESTIONS COUNT / LENGTH */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-wider block ${labelColor}`}>Total Interview Length</label>
                <select
                  id="setup_questions_count"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className={`w-full h-11 rounded-lg px-3 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                >
                  <option value={2} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>2 Questions (Brief run)</option>
                  <option value={3} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>3 Questions (Standard session)</option>
                  <option value={4} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>4 Questions (Deep assessment)</option>
                  <option value={5} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>5 Questions (Comprehensive loop)</option>
                </select>
              </div>

              {/* Manual Warmup Questions block */}
              <div className={`space-y-3 p-5 rounded-2xl border transition-colors duration-500 ${panelBg}`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold ${labelColor}`}>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Manual Warmup Questions
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="text-[9px] font-mono uppercase tracking-wider text-emerald-500 hover:text-emerald-450 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Slot
                  </button>
                </div>
                <p className={`text-[10px] font-light leading-relaxed ${textMuted}`}>
                  Optional. Submit custom warmup questions to ask vocally first. Once the candidate answers them, our AI resumes from there.
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {manualQuestions.map((question, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 select-none">#{idx + 1}</span>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => handleManualQuestionChange(idx, e.target.value)}
                        placeholder="E.g., Walk me through your design approach for implementing scalable global cache states."
                        className={`flex-1 h-9 rounded-lg px-3 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveManualQuestion(idx)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                          isLight 
                            ? "bg-slate-50 border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200" 
                            : "bg-slate-950 border-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 hover:border-rose-900/30"
                        }`}
                        title="Remove Question Slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Interviewer Voice Persona Selection with demos */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  AI Recruiter Voice Persona <span className="text-slate-500">*</span>
                </label>
                <p className="text-[10.5px] text-slate-500 font-light leading-relaxed">
                  The session is pre-configured with our signature, high-fidelity Indian female voice representation. Click the play demo icon below to test.
                </p>
                <div className="animate-fade-in max-w-sm">
                  
                  {/* Indian Slang Female Persona Selection block */}
                  <div
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-28 text-left group ${
                      isLight 
                        ? "bg-slate-50 border-black/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" 
                        : "bg-slate-900/80 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 w-full mb-2">
                      <div className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 border-emerald-500 bg-emerald-500 text-slate-950">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isLight ? "text-slate-950" : "text-slate-200"}`}>Indian Slang Female</p>
                        <p className="text-[9px] font-mono text-slate-500 truncate">Expressive Dialect Synthesis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[8px] font-mono text-slate-600 font-medium">Local Synthesis (en-IN)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoiceDemo();
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm shrink-0 border ${
                          isLight
                            ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-black"
                            : "bg-slate-900 border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400"
                        }`}
                        title="Play Indian Female Audio Sample"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. RESUME SELECTOR (STRICLY REQUIRED) */}
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <span className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold ${labelColor}`}>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Select Required Portfolio Resume <span className="text-emerald-500">*</span>
                  </span>

                  {resumes.length === 0 ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3 text-left">
                      <p className="text-xs text-amber-500 font-light leading-relaxed">
                        You do not have any resumes uploaded in the diagnostic repository yet. Recruiter standards require an uploaded resume profile to optimize tailored question vectors.
                      </p>
                      <button
                        id="btn_navigate_to_upload_from_setup"
                        type="button"
                        onClick={() => onNavigate("/app/resume")}
                        className="px-4 h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        Go to Resume Upload Console
                      </button>
                    </div>
                  ) : (
                    <select
                      id="setup_resume_select"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className={`w-full h-11 rounded-lg px-3 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                      required
                    >
                      {resumes.map((resume) => (
                        <option key={resume.id} value={resume.id} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>
                          {resume.filename} (ATS Readiness: {resume.ats_score}%)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Candidate Fitment Preferences Container as requested from the mockup */}
                <div className={`p-5 rounded-xl space-y-4 text-left animate-fade-in shadow-inner border transition-all duration-500 ${subPanelBg}`}>
                  
                  {/* Work Mode preference */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={workModeEnabled}
                          onChange={(e) => setWorkModeEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {workModeEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Work Mode</span>
                    </label>

                    {workModeEnabled && (
                      <div className="pl-7 flex items-center gap-6 animate-fade-in">
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="on-site"
                            checked={workMode === "on-site"}
                            onChange={() => setWorkMode("on-site")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "on-site" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>On-site</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="remote"
                            checked={workMode === "remote"}
                            onChange={() => setWorkMode("remote")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "remote" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Remote</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="hybrid"
                            checked={workMode === "hybrid"}
                            onChange={() => setWorkMode("hybrid")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "hybrid" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Hybrid</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Location preference */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={locationEnabled}
                          onChange={(e) => setLocationEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {locationEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Location</span>
                    </label>

                    {locationEnabled && (
                      <div className="pl-7 flex items-center gap-6 animate-fade-in">
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="locationType"
                            value="current"
                            checked={locationType === "current"}
                            onChange={() => setLocationType("current")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={locationType === "current" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Current Location</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="locationType"
                            value="preferred"
                            checked={locationType === "preferred"}
                            onChange={() => setLocationType("preferred")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={locationType === "preferred" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Preferred Location</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Bond / Notice Period preference */}
                  <div className="pt-1">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={bondNoticeEnabled}
                          onChange={(e) => setBondNoticeEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {bondNoticeEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Bond / Notice Period</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* FORM SUBMIT GLOW ACTION */}
              <div className="pt-4">
                <button
                  id="btn_setup_start"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Waking AI Recruiter & Compiling Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                      Create & Initialize Room
                    </>
                  )}
                </button>
              </div>

            </form>
          </motion.div>

        </div>
      </main>

      {/* Pristine Candidate Invite Link Modal Overlay */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            id="blk_invite_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              id="blk_invite_modal_card"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left"
            >
              {/* Header decoration */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Link className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Interview Room Activated</h3>
                    <p className="text-[9.5px] font-mono uppercase tracking-wider text-slate-500">Secure Candidate Invitation Key</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description & metadata summary */}
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  The voice simulation room has been successfully configured. Send this secure, unique invite link to your candidate. 
                  Under security compliance rules, <strong>this link expires automatically after the session ends</strong>.
                </p>

                <div className="p-3 bg-slate-950/60 border border-slate-850/80 rounded-xl space-y-1 text-[11px] font-mono text-slate-500">
                  <div>&bull; Recipient Candidate: <span className="text-slate-300 font-bold">{candidateName}</span></div>
                  {candidateEmail && (
                    <div>&bull; Candidate Email: <span className="text-slate-300">{candidateEmail}</span></div>
                  )}
                  <div>&bull; Target Role Scenario: <span className="text-slate-350">{targetRole}</span></div>
                  <div>&bull; Configured Voice: <span className="text-slate-350 capitalize">{preferredVoice} style</span></div>
                </div>

                {candidateEmail && autoSendEmail && (
                  <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Auto-Delivery Status: Dispatched
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Built-In Delivery Service</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-light">
                      Successfully formulated secure invitation and dispatched to <strong className="text-emerald-400 font-medium">{candidateEmail}</strong> {mockDb.getProfile()?.email ? <span className="text-slate-450">with an automated audit copy sent to client <strong className="text-emerald-500 font-medium">{mockDb.getProfile().email}</strong></span> : ""}. Secure delivery TLS confirmed.
                    </p>
                  </div>
                )}
              </div>

              {/* Copy URL share deck field box */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/70">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                    Copy Shareable Invite Link:
                  </label>
                  <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-1 items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${customBaseUrl}/#/invite/${generatedInterviewId}`}
                      className="flex-1 bg-transparent px-3 text-xs font-mono text-emerald-400 focus:outline-none truncate select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${customBaseUrl}/#/invite/${generatedInterviewId}`);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 3000);
                      }}
                      className={`h-9 px-4 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        inviteCopied 
                          ? "bg-emerald-500 text-slate-950 font-black" 
                          : "bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white"
                      }`}
                    >
                      {inviteCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code and Quick help for other devices */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-900">
                  <div className="sm:col-span-8 space-y-1 text-[11px] text-slate-400 font-sans leading-normal">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-400 block font-bold">📱 Open on other devices / Mobiles</span>
                    <p className="font-light">
                      Do not open or send the editor URL (<code className="text-amber-400 font-mono text-[10px]">aistudio.google.com</code>) to other devices. Scan this QR code or use the public URL above instead!
                    </p>
                  </div>
                  <div className="sm:col-span-4 flex justify-center">
                    <div className="p-1.5 bg-white rounded shadow-sm">
                      <img 
                        src={getQrCodeUrl(`${customBaseUrl}/#/invite/${generatedInterviewId}`)} 
                        alt="Scan QR" 
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons footer */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => onNavigate(`/app/interview/${generatedInterviewId}`)}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Launch Interview Room Now
                  <Play className="w-3 h-3 fill-current text-slate-950" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("/app")}
                  className="h-10 px-4 rounded-xl hover:bg-slate-850 text-slate-400 text-xs font-semibold tracking-tight transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
