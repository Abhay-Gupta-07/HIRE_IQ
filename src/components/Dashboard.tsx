import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Award, 
  Calendar, 
  Play, 
  Database, 
  PieChart, 
  User, 
  TrendingUp, 
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Film,
  Tv,
  Activity,
  Video,
  VideoOff,
  Mic,
  Camera,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Users,
  Sliders,
  Link,
  Check,
  Copy,
  Sun,
  Moon,
  FileSpreadsheet,
  Mail,
  Send,
  Loader2,
  Upload,
  Receipt,
  CreditCard,
  Download,
  RefreshCw
} from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Interview, ResumeData, UserProfile } from "../types";
import { mockDb } from "../lib/mockDb";
import { supabase } from "../lib/supabaseClient";
import { getAppBaseUrl, isAiStudioOrigin, getQrCodeUrl } from "../lib/urlHelper";
import HireIqLogo from "./HireIqLogo";
import DashboardVideoViewer from "./DashboardVideoViewer";
import AdminLiveStreamMonitor from "./AdminLiveStreamMonitor";

interface DashboardProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
  theme?: "dark" | "light";
  toggleTheme?: () => void;
}

export default function Dashboard({ onNavigate, onLogout, theme = "dark", toggleTheme }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [activeCategory, setActiveCategory] = useState<"pending" | "shortlisted" | "rejected">("pending");

  // Decoupled Confirmation Dialog State to bypass iFrame modal-blocking constraints
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "interview" | "resume";
    name?: string;
  } | null>(null);

  // Toggled interview ID for watching videos directly in dashboard
  const [expandedReviewSessionId, setExpandedReviewSessionId] = useState<string | null>(null);

  // Real-time Administrator Radar Tracking States
  const [liveSessionState, setLiveSessionState] = useState<{
    interviewId: string;
    candidateName: string;
    role: string;
    currentQuestion: string;
    currentQuestionIdx: number;
    totalQuestions: number;
    recordingState: string;
    cameraActive: boolean;
    liveSpeechText: string;
    interimSpeechText: string;
    lastActive: number;
  } | null>(null);
  
  const [liveCameraFrame, setLiveCameraFrame] = useState<string | null>(null);
  const [showLiveMonitorPanel, setShowLiveMonitorPanel] = useState(false);

  // Advanced Bulk Simulation States
  const [isBulkSimulationActive, setIsBulkSimulationActive] = useState(false);
  const [bulkSimulationCount, setBulkSimulationCount] = useState(150);
  const [showBulkSetupModal, setShowBulkSetupModal] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [bulkInviteCopied, setBulkInviteCopied] = useState(false);

  // Unique Candidate Link Generator states
  const [activeInviteGenInterviewId, setActiveInviteGenInterviewId] = useState<string | null>(null);
  const [sessionCandidateName, setSessionCandidateName] = useState("");
  const [sessionCandidateEmail, setSessionCandidateEmail] = useState("");
  const [generatedSessionToken, setGeneratedSessionToken] = useState("");
  const [isGeneratingSessionToken, setIsGeneratingSessionToken] = useState(false);
  const [sessionGenerationError, setSessionGenerationError] = useState("");
  const [copiedSessionTokenId, setCopiedSessionTokenId] = useState<string | null>(null);

  // Bulk Setup State Extensions
  const [bulkCandidateName, setBulkCandidateName] = useState("");
  const [bulkCandidateEmail, setBulkCandidateEmail] = useState("");
  const [bulkCandidateRole, setBulkCandidateRole] = useState("Software Engineer");
  const [bulkExpectedSalary, setBulkExpectedSalary] = useState("");
  const [bulkCurrentSalary, setBulkCurrentSalary] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkJobDescriptionText, setBulkJobDescriptionText] = useState("");
  const [bulkJobDescriptionFile, setBulkJobDescriptionFile] = useState("");
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [bulkLastParsedResumeName, setBulkLastParsedResumeName] = useState("");
  const [isBulkJdUploading, setIsBulkJdUploading] = useState(false);
  const [bulkEmailStatus, setBulkEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [bulkPreGeneratedId] = useState(() => "bulk-sim-session");
  const [bulkCopiedSuccess, setBulkCopiedSuccess] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState(() => getAppBaseUrl());
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const handleUpdateCustomBaseUrl = (newUrl: string) => {
    localStorage.setItem("custom_public_origin", newUrl.trim());
    setCustomBaseUrl(getAppBaseUrl());
  };

  // Custom SMTP configuration state loaders
  const [smtpHost, setSmtpHost] = useState(() => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try { return JSON.parse(cfg).host || ""; } catch(e){}
    }
    return "";
  });
  const [smtpPort, setSmtpPort] = useState(() => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try { return JSON.parse(cfg).port || ""; } catch(e){}
    }
    return "";
  });
  const [smtpUser, setSmtpUser] = useState(() => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try { return JSON.parse(cfg).user || ""; } catch(e){}
    }
    return "";
  });
  const [smtpPass, setSmtpPass] = useState(() => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try { return JSON.parse(cfg).pass || ""; } catch(e){}
    }
    return "";
  });
  const [smtpFrom, setSmtpFrom] = useState(() => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try { return JSON.parse(cfg).from || ""; } catch(e){}
    }
    return "";
  });

  const [testEmailRecipient, setTestEmailRecipient] = useState(() => {
    return localStorage.getItem("test_smtp_recipient") || "";
  });
  const [testSmtpStatus, setTestSmtpStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testSmtpError, setTestSmtpError] = useState("");

  const handleSaveSmtpConfig = (host: string, port: string, user: string, pass: string, from: string) => {
    const config = { host, port, user, pass, from };
    localStorage.setItem("custom_smtp_config", JSON.stringify(config));
  };

  const getLocalSmtpConfig = () => {
    const config = { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from: smtpFrom };
    if (config.host && config.port && config.user && config.pass) {
      return config;
    }
    return null;
  };

  const handleTestSmtp = async () => {
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      alert("Please fill in Host, Port, Username, and Password first.");
      return;
    }
    if (!testEmailRecipient) {
      alert("Please enter a recipient email address to send the test message." );
      return;
    }
    setTestSmtpStatus("testing");
    setTestSmtpError("");
    try {
      const res = await fetch("/api/send-invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmailRecipient.trim(),
          candidateName: "Verification Tester",
          role: "SMTP Integrations Officer",
          inviteLink: `${customBaseUrl}/#/invite/smtp-test-session`,
          preferredVoice: "female",
          clientEmail: "",
          smtpConfig: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
            from: smtpFrom
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to finalize SMTP test delivery.");
      }
      setTestSmtpStatus("success");
    } catch (err: any) {
      console.error("Test SMTP dispatch failed:", err);
      setTestSmtpStatus("error");
      setTestSmtpError(err.message || String(err));
    }
  };

  // Excel Candidate Import States
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRawRows, setExcelRawRows] = useState<any[]>([]);
  const [excelCandidates, setExcelCandidates] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelEmailCol, setExcelEmailCol] = useState<string>("");
  const [excelNameCol, setExcelNameCol] = useState<string>("");
  const [excelRoleCol, setExcelRoleCol] = useState<string>("");
  const [excelDragged, setExcelDragged] = useState(false);
  const [isAnalyzingExcel, setIsAnalyzingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<"idle" | "sending" | "done">("idle");
  const [sendingLogs, setSendingLogs] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // Receipts / Transactions States
  const [activeDashboardTab, setActiveDashboardTab] = useState<"practice" | "receipts">("practice");
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Live Surveillance Multi-Stream States
  const [liveInterviews, setLiveInterviews] = useState<Record<string, {
    interviewId: string;
    candidateName: string;
    role: string;
    currentQuestion?: string;
    currentQuestionIdx?: number;
    totalQuestions?: number;
    recordingState: string;
    cameraActive: boolean;
    liveSpeechText: string;
    interimSpeechText: string;
    frame: string | null;
    audioLevel: number;
    lastActive: number;
  }>>({});
  
  const [showSimulatedStreams, setShowSimulatedStreams] = useState(true);
  const [soloDashboardVoiceId, setSoloDashboardVoiceId] = useState<string | null>(null);
  const [searchSurveillanceQuery, setSearchSurveillanceQuery] = useState("");
  const [copiedInviteUrlId, setCopiedInviteUrlId] = useState<string | null>(null);

  const [simulatedCandidates, setSimulatedCandidates] = useState<any[]>([
    {
      id: "sim-core-1",
      name: "Sofia Sterling",
      role: "Lead React Architect",
      sentence: "In React 18, concurrent features like useTransition allow us to mark heavy state updates without jamming the main browser render core.",
      currentText: "",
      charIdx: 0,
      audioLevel: 5,
      isActiveSpeaker: true,
      cameraFilter: "normal",
      cameraMuted: false,
      integrityScore: 98
    },
    {
      id: "sim-core-2",
      name: "Alexander Mercer",
      role: "Python Security Engineer",
      sentence: "We leverage AST tree evaluations on incoming files to execute parsed sandboxed previews cleanly inside client container shells.",
      currentText: "",
      charIdx: 0,
      audioLevel: 2,
      isActiveSpeaker: false,
      cameraFilter: "infrared",
      cameraMuted: false,
      integrityScore: 94
    },
    {
      id: "sim-core-3",
      name: "Elena Rostova",
      role: "AI Inference Dev",
      sentence: "Our real-time biometric pipelines compile audio packages concurrently using state-of-the-art secure browser context nodes.",
      currentText: "",
      charIdx: 0,
      audioLevel: 8,
      isActiveSpeaker: true,
      cameraFilter: "matrix",
      cameraMuted: false,
      integrityScore: 99
    },
    {
      id: "sim-core-4",
      name: "Liam Henderson",
      role: "Cloud SRE DevOps",
      sentence: "Implementing exponential backoff with a random delay jitter prevents servers from hit spikes caused by cascading retry loops.",
      currentText: "",
      charIdx: 0,
      audioLevel: 1,
      isActiveSpeaker: false,
      cameraFilter: "biometric",
      cameraMuted: false,
      integrityScore: 96
    }
  ]);

  // Typing simulator loop for simulated candidates in the main Dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedCandidates((prev) =>
        prev.map((c) => {
          let nextCharIdx = c.charIdx;
          let nextText = c.currentText;
          let nextSpeaker = c.isActiveSpeaker;
          
          if (Math.random() > 0.94) {
            nextSpeaker = !nextSpeaker;
          }
          
          let nextLevel = 2;
          if (nextSpeaker) {
            nextLevel = Math.floor(Math.random() * 45) + 5;
            
            if (nextCharIdx < c.sentence.length) {
              const increment = Math.floor(Math.random() * 4) + 2;
              nextCharIdx = Math.min(c.sentence.length, nextCharIdx + increment);
              nextText = c.sentence.substring(0, nextCharIdx);
            } else {
              if (Math.random() > 0.85) {
                nextCharIdx = 0;
                nextText = "";
              }
            }
          } else {
            nextLevel = Math.max(2, Math.floor(c.audioLevel * 0.45));
          }

          return {
            ...c,
            charIdx: nextCharIdx,
            currentText: nextText,
            isActiveSpeaker: nextSpeaker,
            audioLevel: nextLevel
          };
        })
      );
    }, 250);

    return () => clearInterval(timer);
  }, []);

  // Text-To-Speech Synthesis loop for Simulated / Real candidates
  const lastDashboardSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!soloDashboardVoiceId) return;

    // First search simulated list
    const simTarget = simulatedCandidates.find(c => c.id === soloDashboardVoiceId);
    if (simTarget) {
      if (simTarget.isActiveSpeaker && simTarget.currentText) {
        if (lastDashboardSpokenRef.current !== simTarget.sentence && typeof window !== "undefined" && window.speechSynthesis) {
          lastDashboardSpokenRef.current = simTarget.sentence;
          const utterance = new SpeechSynthesisUtterance(simTarget.sentence);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      }
      return;
    }

    // Next search real candidate list
    const realTarget = liveInterviews[soloDashboardVoiceId];
    if (realTarget) {
      const activeText = realTarget.liveSpeechText || realTarget.interimSpeechText;
      if (activeText) {
        if (lastDashboardSpokenRef.current !== activeText && typeof window !== "undefined" && window.speechSynthesis) {
          lastDashboardSpokenRef.current = activeText;
          const utterance = new SpeechSynthesisUtterance(activeText);
          utterance.rate = 1.0;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [soloDashboardVoiceId, simulatedCandidates, liveInterviews]);

  const handleDashboardMuteToggle = (candidateId: string, name: string) => {
    if (soloDashboardVoiceId === candidateId) {
      setSoloDashboardVoiceId(null);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      setSoloDashboardVoiceId(candidateId);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Monitoring feedback for candidate ${name}. Feed connected.`);
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const fetchUserTransactions = async () => {
    const email = profile?.email || "abbaabhayyy@gmail.com";
    if (!email) return;

    setIsTxLoading(true);
    setTxError("");
    try {
      const resp = await fetch(`/api/upi/user-transactions?email=${encodeURIComponent(email)}`);
      if (!resp.ok) {
        throw new Error("Failed to fetch transaction records from server.");
      }
      const data = await resp.json();
      setUserTransactions(data.transactions || []);
    } catch (err: any) {
      console.error(err);
      setTxError(err.message || "An error occurred while loading your receipts ledger.");
    } finally {
      setIsTxLoading(false);
    }
  };

  useEffect(() => {
    if (activeDashboardTab === "receipts" && profile?.email) {
      fetchUserTransactions();
    }
  }, [activeDashboardTab, profile?.email]);

  const generateReceiptPdf = (tx: any) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const isCard = tx.paymentMethod === "card";
      const billingText = tx.billingInterval === "yearly" ? "Yearly" : "Monthly";

      // Draw elegant backgrounds
      doc.setFillColor(248, 250, 252); // soft slate border frame gray
      doc.rect(0, 0, 210, 297, "F");

      // Slate-900 Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 50, "F");

      // Header Text Left
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(26);
      doc.text("HireIQ", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text("SECURE RECRUITING & INTERVIEW SIMULATION", 15, 26);

      // Header Text Right
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(52, 211, 153); // emerald green
      doc.text("PAYMENT RECEIPT", 195, 20, { align: "right" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(209, 213, 219);
      doc.text(`Receipt ID: hq-${tx.utrNumber.slice(-6)}-${tx.paymentMethod.toUpperCase()}`, 195, 26, { align: "right" });

      // Clean cleared Status Badge on right of header
      doc.setFillColor(52, 211, 153);
      doc.rect(150, 32, 45, 8, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("CLEARED & SETTLED", 172.5, 37.5, { align: "center" });

      let y = 62;

      // Customer section panel
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, y, 180, 48, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, 180, 48, 3, 3, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text("CUSTOMER DETAILS", 22, y + 10);

      doc.setDrawColor(241, 245, 249);
      doc.line(22, y + 14, 188, y + 14);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text("BILLED TO:", 22, y + 23);
      doc.text("PAYMENT PROCESSOR / DETAILS:", 105, y + 23);

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(tx.fullName || profile?.full_name || "Valued Customer", 22, y + 29);
      doc.text(isCard ? "Credit/Debit Card Connection" : "Direct UPI Interchange Gateway", 105, y + 29);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(tx.email || profile?.email || "customer@example.com", 22, y + 35);
      if (!isCard) {
        doc.text(`VPA: ${tx.upiId || "N/A"}`, 105, y + 35);
      } else {
        doc.text("3-D Secure PCI-DSS Authorization", 105, y + 35);
      }

      y += 58;

      // Subscription Summary panel
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, y, 180, 78, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 78, 3, 3, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SUBSCRIPTION SUMMARY", 22, y + 10);

      doc.setDrawColor(241, 245, 249);
      doc.line(22, y + 14, 188, y + 14);

      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Item / Description", 22, y + 22);
      doc.text("Plan Interval", 110, y + 22);
      doc.text("Amount Paid", 188, y + 22, { align: "right" });

      doc.line(22, y + 26, 188, y + 26);

      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`HireIQ ${tx.planName} Tier Premium Access`, 22, y + 34);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Grants active limits for standard-aligned interview modules, bulk simulation radars,", 22, y + 40);
      doc.text("real-time video surveillance triggers, resume keypoint ATS rating, and deep review metrics.", 22, y + 45);

      doc.text(billingText, 110, y + 34);

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`INR ${tx.amount.toLocaleString("en-IN")}.00`, 188, y + 34, { align: "right" });

      doc.setDrawColor(226, 232, 240);
      doc.line(22, y + 54, 188, y + 54);

      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Subtotal (0% GST):", 130, y + 61, { align: "right" });
      doc.text(`INR ${tx.amount.toLocaleString("en-IN")}.00`, 188, y + 61, { align: "right" });

      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Total Settled:", 130, y + 70, { align: "right" });
      doc.setTextColor(22, 163, 74);
      doc.text(`INR ${tx.amount.toLocaleString("en-IN")}.00`, 188, y + 70, { align: "right" });

      y += 88;

      // Settlement trace details
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, y, 180, 36, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 36, 3, 3, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TRANSACTION AUTHENTICITY AND AUDIT TRACE", 22, y + 10);

      doc.setDrawColor(241, 245, 249);
      doc.line(22, y + 14, 188, y + 14);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Settlement Date:", 22, y + 22);
      doc.text(new Date(tx.created_at).toLocaleString("en-IN", { timeZone: "UTC" }), 60, y + 22);

      doc.text("Payment Interchange:", 22, y + 29);
      doc.text(isCard ? "Stripe Automated Global Vault" : "NPCI Unified Payments Interface (UPI)", 60, y + 29);

      doc.text(isCard ? "Gateway Reference:" : "National UPI UTR:", 118, y + 22);
      doc.setFont("Helvetica", "bold");
      doc.text(tx.utrNumber, 150, y + 22);

      doc.setFont("Helvetica", "normal");
      doc.text("Clearance Code:", 118, y + 29);
      doc.setTextColor(22, 163, 74);
      doc.text(`${tx.status.toUpperCase()} - SECURELY SETTLED`, 150, y + 29);

      // Footer disclaimer
      doc.setTextColor(156, 163, 175);
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text("This computer-authenticated payment receipt from the HireIQ ledger is fully digital and tax-compliant.", 105, 280, { align: "center" });
      doc.text("Thank you for choosing HireIQ! Empowering candidates to master high-fidelity interview cockpit metrics.", 105, 285, { align: "center" });

      doc.save(`receipt-${tx.utrNumber}-${tx.planName.toLowerCase()}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to build PDF. Please retry or download via dashboard.");
    }
  };

  // Re-parse when selectors change or raw lines change
  useEffect(() => {
    if (excelRawRows.length === 0) return;

    const list = excelRawRows.map((row: any) => {
      const emailVal = String(row[excelEmailCol] || "").trim();
      const nameVal = String(row[excelNameCol] || "").trim();
      const roleVal = excelRoleCol ? String(row[excelRoleCol] || "").trim() : "";

      return {
        name: nameVal || "Anonymous Candidate",
        email: emailVal,
        role: roleVal || "Software Engineer"
      };
    }).filter(item => item.email && item.email.includes("@"));

    setExcelCandidates(list);
    localStorage.setItem("excel_candidates_imported", JSON.stringify(list));

    const recommendedSize = Math.min(500, Math.max(5, list.length));
    setBulkSimulationCount(recommendedSize);
  }, [excelRawRows, excelEmailCol, excelNameCol, excelRoleCol]);

  // Parse Excel, CSV or JSON File
  const handleParseExcel = (file: File) => {
    setExcelFile(file);
    setIsAnalyzingExcel(true);
    setExcelError(null);
    setExcelCandidates([]);
    setExcelRawRows([]);
    setSendingLogs([]);
    setInvitationStatus("idle");
    setSuccessCount(0);

    const isJson = file.name.toLowerCase().endsWith(".json");

    if (isJson) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          let rawRows: any[] = [];
          if (Array.isArray(parsed)) {
            rawRows = parsed;
          } else if (parsed && typeof parsed === "object") {
            const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
            if (arrayKey) {
              rawRows = parsed[arrayKey];
            } else {
              rawRows = [parsed];
            }
          }

          if (rawRows.length === 0) {
            throw new Error("No arrays or objects found in the JSON file.");
          }

          const headers = Object.keys(rawRows[0]);
          setExcelHeaders(headers);

          // Advanced match scoring for Name, Email and Role keys
          const emailCol = headers.find(h => /email|mail|e-mail/i.test(h)) || headers[0] || "";
          const nameCol = headers.find(h => /name|cand|full_name|first_name|person/i.test(h)) || headers[1] || headers[0] || "";
          const roleCol = headers.find(h => /role|job|position|title/i.test(h)) || "";

          setExcelEmailCol(emailCol);
          setExcelNameCol(nameCol);
          setExcelRoleCol(roleCol);

          setExcelRawRows(rawRows);
          setIsAnalyzingExcel(false);
        } catch (err: any) {
          console.error(err);
          setExcelError(err.message || "Failed to analyze JSON submissions. Please check column or element structure.");
          setIsAnalyzingExcel(false);
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        if (workbook.SheetNames.length === 0) {
          throw new Error("The Excel workbook does not contain any sheets.");
        }
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        if (rawJson.length === 0) {
          throw new Error("The Excel sheet is empty or has no row items.");
        }

        const headers = Object.keys(rawJson[0]);
        setExcelHeaders(headers);

        const emailCol = headers.find(h => /email|mail|e-mail/i.test(h)) || headers[0] || "";
        const nameCol = headers.find(h => /name|cand|full_name|first_name|person/i.test(h)) || headers[1] || headers[0] || "";
        const roleCol = headers.find(h => /role|job|position|title/i.test(h)) || "";

        setExcelEmailCol(emailCol);
        setExcelNameCol(nameCol);
        setExcelRoleCol(roleCol);

        setExcelRawRows(rawJson);
        setIsAnalyzingExcel(false);
      } catch (err: any) {
        console.error(err);
        setExcelError(err.message || "Failed to analyze Excel file. Please ensure correct rows and column headers.");
        setIsAnalyzingExcel(false);
      }
    };

    reader.onerror = () => {
      setExcelError("File reader error. Could not read binary block.");
      setIsAnalyzingExcel(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Bulk Resume Parse handler (Simulator)
  const handleParseBulkResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBulkParsing(true);
    setBulkLastParsedResumeName(file.name);
    setTimeout(() => {
      const parsedProfiles = [
        { name: "Devendra Kumar", email: "devendra.kumar@example.com", role: "Staff DevOps Engineer", location: "Bangalore, India", current: "₹24,00,000 / year", expected: "₹32,50,000 / year" },
        { name: "Sanjana Joshi", email: "sanjana.joshi@design.io", role: "Lead React Architect", location: "Mumbai, India", current: "₹18,50,000 / year", expected: "₹25,00,000 / year" },
        { name: "Rohan Mehra", email: "rohan.mehra@cloudtech.com", role: "Senior Backend Specialist", location: "Delhi NCR, India", current: "₹15,00,000 / year", expected: "₹22,00,000 / year" }
      ];
      const selected = parsedProfiles[Math.floor(Math.random() * parsedProfiles.length)];
      setBulkCandidateName(selected.name);
      setBulkCandidateEmail(selected.email);
      setBulkCandidateRole(selected.role);
      setBulkLocation(selected.location);
      setBulkCurrentSalary(selected.current);
      setBulkExpectedSalary(selected.expected);
      setIsBulkParsing(false);
    }, 1200);
  };

  // Bulk JD attachment handler
  const handleBulkJdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBulkJdUploading(true);
    setTimeout(() => {
      setBulkJobDescriptionFile(file.name);
      if (!bulkJobDescriptionText) {
        setBulkJobDescriptionText(`REQUIREMENTS FOR: ${file.name.replace(/\.[^/.]+$/, "")}\n- Proficiency in modern stack architecture and agile delivery.\n- Excellent collaborative and clear vocal communication skills.\n- Demonstrated system engineering and database persistence patterns.`);
      }
      setIsBulkJdUploading(false);
    }, 800);
  };

  // Direct Send Email dispatcher for Bulk Candidate Sim
  const handleSendBulkDirectEmail = () => {
    if (!bulkCandidateEmail.trim()) {
      alert("Please input a valid recipient candidate email ID to dispatch the invitation.");
      return;
    }
    if (!bulkCandidateName.trim()) {
      alert("Please state the Candidate's name first so the invite email is customized.");
      return;
    }
    setBulkEmailStatus("sending");

    const clientEmailAddress = mockDb.getProfile()?.email || "";
    fetch("/api/send-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: bulkCandidateEmail.trim(),
        candidateName: bulkCandidateName.trim(),
        role: bulkCandidateRole,
        inviteLink: `${customBaseUrl}/#/invite/bulk-sim-session`,
        preferredVoice: "female",
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
        setBulkEmailStatus("idle");
        alert(data.deliveryError || "Mail Server failed to transmit.");
      } else {
        setBulkEmailStatus("sent");
        setTimeout(() => setBulkEmailStatus("idle"), 6000);
      }
    })
    .catch((err: any) => {
      console.error("Direct bulk send error:", err);
      alert(err.message || "Failed to dispatch email. Please check your Resend configuration.");
      setBulkEmailStatus("idle");
    });
  };

  // Dispatch Invitation Broadcast
  const handleDispatchInvitations = () => {
    if (excelCandidates.length === 0) return;
    setIsSendingInvitations(true);
    setInvitationStatus("sending");
    setSendingLogs(["Initializing real-time mail delivery server..."]);
    setSuccessCount(0);

    const candidatesToInvite = [...excelCandidates];

    const runActualInvitation = async (idx: number) => {
      if (idx >= candidatesToInvite.length) {
        setSendingLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✔ Automated invitation delivery campaign completed successfully.`,
          `[${new Date().toLocaleTimeString()}] Total dispatched invites: ${candidatesToInvite.length}`,
          `[${new Date().toLocaleTimeString()}] Candidate list synchronized for surveillance.`
        ]);
        setInvitationStatus("done");
        setIsSendingInvitations(false);
        return;
      }

      const candidate = candidatesToInvite[idx];
      const inviteLink = `${customBaseUrl}/#/invite/sim-candidate-${idx + 1}`;

      setSendingLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Accessing mail dispatch protocols for ${candidate.name} <${candidate.email}>...`,
      ]);

      try {
        const response = await fetch("/api/send-invite-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidate.email,
            candidateName: candidate.name,
            role: candidate.role || excelRoleCol || "Software Engineer",
            inviteLink: inviteLink,
            preferredVoice: "female",
            smtpConfig: getLocalSmtpConfig()
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.deliveryStatus === "failed") {
            setSendingLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ⚠️ Email delivery failed for ${candidate.name} (<${candidate.email}>):`,
              `    ↳ ${resData.deliveryError || "Mail Server failed to transmit."}`,
              `    ↳ Secure link successfully generated: ${resData.secureLink}`,
            ]);
          } else if (resData.isSandbox && resData.sandboxUrl) {
            setSendingLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] 📬 SANDBOX EMAIL SENT successfully via Ethereal Mail!`,
              `[${new Date().toLocaleTimeString()}] 👉 Click to inspect: ${resData.sandboxUrl}`,
            ]);
          } else {
            setSendingLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ✔ REAL EMAIL DISPATCHED to ${candidate.name} (<${candidate.email}>). Delivered code: 250 OK`,
            ]);
          }
          setSuccessCount(idx + 1);
        } else {
          const errData = await response.json().catch(() => ({}));
          setSendingLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ⚠️ Server failed to deliver email: ${errData.error || "SMTP connection issue"}`,
          ]);
        }
      } catch (err: any) {
        setSendingLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⚠️ SMTP dispatch packet failed to connect: ${err.message || err}`,
        ]);
      }

      // Briefly wait to run the next candidate for clean visual telemetry feedback
      setTimeout(() => {
        runActualInvitation(idx + 1);
      }, 300);
    };

    runActualInvitation(0);
  };

  // Cross-tab standard BroadcastChannel communication for both single and multi-camera sessions
  useEffect(() => {
    const channel = new BroadcastChannel("vocal_ai_live_stream");

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      const { type, interviewId, frame, ...payload } = data;

      if (type === "session_info" || type === "speech_update") {
        // Maintain single session compatibility for deep peeking radars
        setLiveSessionState((prev) => {
          if (type === "speech_update" && prev?.interviewId !== interviewId) {
            return prev;
          }
          return {
            interviewId,
            candidateName: payload.candidateName || prev?.candidateName || "Alex Rodriguez",
            role: payload.role || prev?.role || "Software Engineer",
            currentQuestion: payload.currentQuestion || prev?.currentQuestion || "",
            currentQuestionIdx: payload.currentQuestionIdx ?? prev?.currentQuestionIdx ?? 1,
            totalQuestions: payload.totalQuestions ?? prev?.totalQuestions ?? 3,
            recordingState: payload.recordingState ?? prev?.recordingState ?? "idle",
            cameraActive: payload.cameraActive ?? prev?.cameraActive ?? false,
            liveSpeechText: payload.liveSpeechText ?? prev?.liveSpeechText ?? "",
            interimSpeechText: payload.interimSpeechText ?? prev?.interimSpeechText ?? "",
            lastActive: Date.now()
          };
        });

        // Also scale into the multi-stream list
        setLiveInterviews((prev) => {
          const current = prev[interviewId] || {};
          return {
            ...prev,
            [interviewId]: {
              interviewId,
              candidateName: payload.candidateName || current.candidateName || "Abhay Kumar",
              role: payload.role || current.role || "Product Developer",
              currentQuestion: payload.currentQuestion || current.currentQuestion || "Awaiting Setup...",
              currentQuestionIdx: payload.currentQuestionIdx ?? current.currentQuestionIdx ?? 1,
              totalQuestions: payload.totalQuestions ?? current.totalQuestions ?? 3,
              recordingState: payload.recordingState ?? current.recordingState ?? "idle",
              cameraActive: payload.cameraActive ?? current.cameraActive ?? false,
              liveSpeechText: payload.liveSpeechText ?? current.liveSpeechText ?? "",
              interimSpeechText: payload.interimSpeechText ?? current.interimSpeechText ?? "",
              frame: current.frame || null,
              audioLevel: payload.recordingState === "listening" ? Math.floor(Math.random() * 30) + 15 : 2,
              lastActive: Date.now()
            }
          };
        });
        
        // Auto-show radar beacon if there is a newly active stream
        if (type === "session_info") {
          setShowLiveMonitorPanel(true);
        }
      } else if (type === "camera_frame") {
        setLiveSessionState((prev) => {
          if (!prev || prev.interviewId !== interviewId) return prev;
          return { ...prev, lastActive: Date.now() };
        });
        setLiveCameraFrame(frame);

        setLiveInterviews((prev) => {
          if (!prev[interviewId]) return prev;
          return {
            ...prev,
            [interviewId]: {
              ...prev[interviewId],
              frame: frame || null,
              lastActive: Date.now()
            }
          };
        });
      } else if (type === "session_ended") {
        setLiveSessionState((prev) => {
          if (prev && prev.interviewId === interviewId) {
            return null;
          }
          return prev;
        });
        setLiveCameraFrame(null);

        setLiveInterviews((prev) => {
          const copy = { ...prev };
          delete copy[interviewId];
          return copy;
        });
      }
    };

    // Keepalive checking interval - clear signal if idle for over 15 seconds
    const staleInterval = setInterval(() => {
      setLiveSessionState((prev) => {
        if (prev && Date.now() - prev.lastActive > 15000) {
          setLiveCameraFrame(null);
          return null;
        }
        return prev;
      });

      setLiveInterviews((prev) => {
        const copy = { ...prev };
        let changed = false;
        Object.keys(copy).forEach((key) => {
          if (Date.now() - copy[key].lastActive > 15000) {
            delete copy[key];
            changed = true;
          }
        });
        return changed ? copy : prev;
      });
    }, 5000);

    return () => {
      channel.close();
      clearInterval(staleInterval);
    };
  }, []);

  useEffect(() => {
    // Initial fetch from mockDb
    setProfile(mockDb.getProfile());
    setInterviews(mockDb.getInterviews());
    setResumes(mockDb.getResumes());
  }, []);

  // Compute stat metrics
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(i => i.status === "completed");
  const averageScore = completedInterviews.length > 0
    ? Math.round(
        completedInterviews.reduce((acc, curr) => {
          const report = mockDb.getReportByInterviewId(curr.id);
          return acc + (report ? report.overall_score : 70); 
        }, 0) / completedInterviews.length
      )
    : 0;

  const handleUpdateName = (newName: string) => {
    if (!newName.trim() || !profile) return;
    const updated = { ...profile, full_name: newName };
    mockDb.updateProfile(updated);
    setProfile(updated);
  };

  // Confirm actions via non-blocking custom modal instead of sandboxed browser confirm()
  const handleDeleteResume = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const resume = resumes.find(r => r.id === id);
    setDeleteTarget({
      id,
      type: "resume",
      name: resume?.filename || "this resume record"
    });
  };

  const handleDeleteInterview = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const interview = interviews.find(i => i.id === id);
    setDeleteTarget({
      id,
      type: "interview",
      name: interview ? `${interview.candidate_name} — ${interview.role}` : "this interview record"
    });
  };

  const executeDelete = () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    if (type === "resume") {
      mockDb.deleteResume(id);
      setResumes(mockDb.getResumes());
    } else {
      mockDb.deleteInterview(id);
      setInterviews(mockDb.getInterviews());
      // Minimize video accordion if active
      if (expandedReviewSessionId === id) {
        setExpandedReviewSessionId(null);
      }
    }
    setDeleteTarget(null);
  };

  const handleUpdateDecision = (id: string, decision: "pending" | "shortlisted" | "rejected") => {
    const intv = interviews.find(i => i.id === id);
    if (!intv) return;
    const updated = { ...intv, decision };
    mockDb.updateInterview(updated);
    setInterviews(mockDb.getInterviews());
  };

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>
      {/* Background Grids */}
      {!isLight && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />
      )}

      {/* Main Container Header */}
      <nav className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200/50 bg-[#f8f8f6]/85" : "border-slate-900 bg-slate-900/30"
      }`}>
        <div className="w-full max-w-[90rem] mx-auto px-6 sm:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer animate-pulse-slow" onClick={() => onNavigate("/")}>
            <HireIqLogo theme={theme} className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 border-r pr-4 ${isLight ? "border-slate-200" : "border-slate-850"}`}>
              <img 
                src={profile?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"} 
                alt="Profile Avatar" 
                className={`w-7 h-7 rounded-full border ${isLight ? "border-slate-300" : "border-slate-700"}`}
              />
              <input
                id="profile_name_input"
                type="text"
                value={profile?.full_name || ""}
                onChange={(e) => handleUpdateName(e.target.value)}
                title="Click to rename"
                className={`bg-transparent border-0 text-xs font-semibold h-7 px-2 rounded focus:outline-none w-28 text-ellipsis cursor-pointer transition-colors ${
                  isLight ? "hover:bg-black/5 focus:bg-slate-200/50 text-[#131518]" : "hover:bg-slate-900 focus:bg-slate-900 text-slate-200"
                }`}
              />
            </div>

            <button
              id="btn_dashboard_logout"
              onClick={onLogout}
              className={`text-[10px] font-mono tracking-wider uppercase transition-colors shrink-0 ${
                isLight ? "text-slate-600 hover:text-rose-500" : "text-slate-400 hover:text-rose-400"
              }`}
            >
              Log Out
            </button>

            {toggleTheme && (
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isLight 
                    ? "border-black/15 bg-black/5 text-[#131518] hover:bg-black/10" 
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
                title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* DASHBOARD GRID */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10 relative z-10">
        
        {/* Welcome Area Card */}
        <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative transition-all duration-550 ${
          isLight ? "bg-white border-slate-200 shadow-md text-slate-800" : "bg-gradient-to-r from-slate-900 to-slate-900/40 border-slate-800/80 text-slate-100"
        }`}>
          <div className="absolute -right-20 -bottom-20 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono ${
              isLight ? "bg-emerald-50 text-emerald-700 border border-emerald-250/20" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              <Sparkles className={`w-3 h-3 ${isLight ? "text-emerald-600 animate-pulse" : "text-emerald-400"}`} />
              Ready for Sandbox Practice Runs
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
              Welcome back, {profile?.full_name || "Candidate"}
            </h1>
            <p className={`text-xs sm:text-sm max-w-xl font-light ${isLight ? "text-slate-600/90" : "text-slate-400"}`}>
              Review your indexed accomplishments, refine keywords via parsed resume analyzers, and run interactive interviews out loud.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              id="btn_dash_resume"
              onClick={() => onNavigate("/app/resume")}
              className={`flex-1 md:flex-initial h-11 px-5 rounded-xl border text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLight 
                  ? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:text-black" 
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4 text-slate-400" />
              Manage Resumes
            </button>

            <button
              id="btn_dash_new_interview"
              onClick={() => onNavigate("/app/interview/new")}
              className="flex-1 md:flex-initial h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-tight transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              New Interview
            </button>

            <button
              id="btn_dash_bulk_interview"
              onClick={() => setShowBulkSetupModal(true)}
              className="flex-1 md:flex-initial h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-tight transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/30"
              title="Stress-test cockpit with multiple simulated high-fidelity interviews at once"
            >
              <Users className="w-4 h-4 text-indigo-100" />
              Bulk Interview
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b pb-px gap-6 select-none ${
          isLight ? "border-slate-200" : "border-white/5"
        }`}>
          <button
            onClick={() => setActiveDashboardTab("practice")}
            className={`pb-3 text-sm font-semibold tracking-tight transition-all relative cursor-pointer ${
              activeDashboardTab === "practice"
                ? isLight ? "text-slate-900 font-bold" : "text-emerald-400 font-extrabold"
                : isLight ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Practice Cockpit
            {activeDashboardTab === "practice" && (
              <motion.div
                layoutId="dashboardActiveTabUnderline"
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  isLight ? "bg-slate-900" : "bg-emerald-400"
                }`}
              />
            )}
          </button>
          
          <button
            onClick={() => setActiveDashboardTab("receipts")}
            className={`pb-3 text-sm font-semibold tracking-tight transition-all relative flex items-center gap-2 cursor-pointer ${
              activeDashboardTab === "receipts"
                ? isLight ? "text-slate-900 font-bold" : "text-emerald-400 font-extrabold"
                : isLight ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Receipts &amp; Bills</span>
            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
              isLight 
                ? "bg-slate-100 text-slate-700 border-slate-200" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              New
            </span>
            {activeDashboardTab === "receipts" && (
              <motion.div
                layoutId="dashboardActiveTabUnderline"
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  isLight ? "bg-slate-900" : "bg-emerald-400"
                }`}
              />
            )}
          </button>
        </div>

        {activeDashboardTab === "practice" ? (
          <>
            {/* RECRUITER REAL-TIME STREAMING PORTAL */}
            {true && (
              <section id="recruiter_live_surveillance_section" className="space-y-4">
                <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-3 gap-3 ${isLight ? "border-slate-200" : "border-slate-900"}`}>
                  <div className="flex items-center gap-2">
                    <Tv className={`w-4 h-4 animate-pulse ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                    <h2 className={`text-base font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>Live Watching Surveillance Cockpit</h2>
                  </div>
                  
                  {/* Visual Radar Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-rose-500 font-mono flex items-center gap-1.5 animate-pulse mr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      RADAR ACTIVE
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-slate-950 text-emerald-400 border-emerald-500/20"
                    }`}>
                      Sync Port: vocal_ai_live_stream
                    </span>
                  </div>
                </div>

                {/* Surveillance Toolbar Controls */}
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-900"
                }`}>
                  {/* Search / Filter Input */}
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Tv className="w-4 h-4 text-slate-500" />
                    </span>
                    <input
                      type="text"
                      id="search_surveillance_input"
                      value={searchSurveillanceQuery}
                      onChange={(e) => setSearchSurveillanceQuery(e.target.value)}
                      placeholder="Search candidate name or interview role..."
                      className={`w-full h-9 pl-9 pr-4 rounded-lg text-xs transition-all focus:outline-none ${
                        isLight 
                          ? "bg-white border border-slate-200 text-slate-900 focus:border-slate-400" 
                          : "bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-550 focus:border-emerald-500/50"
                      }`}
                    />
                  </div>

                  {/* Simulated / Vocal Control Belt */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Simulated Feeds Toggle */}
                    <button
                      type="button"
                      id="btn_toggle_simulated_streams"
                      onClick={() => setShowSimulatedStreams(prev => !prev)}
                      className={`h-9 px-3.5 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        showSimulatedStreams
                          ? isLight ? "bg-emerald-50 border border-emerald-300 text-emerald-700 shadow-sm" : "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-extrabold"
                          : isLight ? "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500" : "bg-slate-950 border border-slate-850 text-slate-400"
                      }`}
                      title="Toggle simulated candidate feeds to populate cockpit or stress test surveillance layout"
                    >
                      {showSimulatedStreams ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showSimulatedStreams ? "SIM FEEDS ON" : "SIM FEEDS OFF"}</span>
                    </button>

                    {/* Radar Test Pulse Calibration Button */}
                    <button
                      type="button"
                      id="btn_trigger_radar_calibration"
                      onClick={() => {
                        setSimulatedCandidates(prev =>
                          prev.map(c => ({
                            ...c,
                            audioLevel: Math.floor(Math.random() * 35) + 25,
                            isActiveSpeaker: true
                          }))
                        );
                      }}
                      className={`h-9 px-3.5 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        isLight ? "bg-indigo-50 border border-indigo-250 text-indigo-600 hover:bg-indigo-100" : "bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/25"
                      }`}
                      title="Calibrate surveillance radar, trigger immediate audio spikes in simulated broadcasters"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>RADAR TEST PULSE</span>
                    </button>

                    {/* Stop All Audio Button */}
                    <button
                      type="button"
                      id="btn_mute_all_voice_telemetry"
                      onClick={() => {
                        if (typeof window !== "undefined" && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                        }
                        setSoloDashboardVoiceId(null);
                      }}
                      className={`h-9 px-3.5 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        !soloDashboardVoiceId
                          ? isLight ? "bg-slate-100 text-slate-405 border border-slate-200" : "bg-slate-950 border border-slate-850 text-slate-600"
                          : isLight ? "bg-rose-50 border border-rose-250 text-rose-600 font-semibold animate-pulse" : "bg-rose-500/15 border border-rose-500/25 text-rose-450 font-extrabold animate-pulse"
                      }`}
                      title="Mute all microphone / voice synthesize telemetry outputs"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{!soloDashboardVoiceId ? "AUDIO DISCONNECTED" : "MUTE VOICE"}</span>
                    </button>
                  </div>
                </div>

                {/* LIVE WEBCAMS GRID */}
                {(() => {
                  const realList = Object.values(liveInterviews) as any[];

                  const fRealList = realList.filter(c => 
                    c.candidateName.toLowerCase().includes(searchSurveillanceQuery.toLowerCase()) || 
                    c.role.toLowerCase().includes(searchSurveillanceQuery.toLowerCase())
                  );

                  const fSimList = showSimulatedStreams 
                    ? simulatedCandidates.filter(c => 
                        c.name.toLowerCase().includes(searchSurveillanceQuery.toLowerCase()) || 
                        c.role.toLowerCase().includes(searchSurveillanceQuery.toLowerCase())
                      )
                    : [];

                  const totalActiveStreams = fRealList.length + fSimList.length;

                  if (totalActiveStreams === 0) {
                    return (
                      <div className={`p-12 border rounded-2xl border-dashed text-center space-y-3 ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/20 border-slate-800"
                      }`}>
                        <VideoOff className="w-8 h-8 text-slate-500 mx-auto animate-bounce" />
                        <div>
                          <h4 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>No Active Surveillance Feeds Found</h4>
                          <p className="text-xs text-slate-550 max-w-md mx-auto mt-1">
                            No real-time candidate is currently streaming. Turn on Sim Feeds or open the **Interview Practice Room** in another browser tab and start speaking to activate live surveillance feeds.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                      {/* Render Real Broadcasters first with high prominence */}
                      {fRealList.map((ic) => {
                        const isVoiceActive = ic.recordingState === "listening" || ic.audioLevel > 5;
                        const isUnmuted = soloDashboardVoiceId === ic.interviewId;

                        return (
                          <div
                            key={ic.interviewId}
                            id={`observation_card_real_${ic.interviewId}`}
                            className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-4 ${
                              isLight 
                                ? "bg-white border-slate-200 shadow hover:shadow-md" 
                                : "bg-slate-900 border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-500/50"
                            }`}
                          >
                            {/* Live Alert Header Label */}
                            <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white text-[7.5px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded shadow z-10 flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              ON-AIR BROADCAST
                            </div>

                            {/* Webcam Frame Image Display Block */}
                            <div className={`relative aspect-video rounded-xl overflow-hidden border bg-black flex items-center justify-center select-none ${
                              isLight ? "border-slate-100" : "border-slate-800"
                            }`}>
                              {/* Real Camera Image Frame Feed or Animated Silhouette placeholder */}
                              {ic.cameraActive && ic.frame ? (
                                <img
                                  src={ic.frame}
                                  alt="Live Recruitee Webcam"
                                  className="w-full h-full object-cover scale-x-[-1]"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-center p-4">
                                  <VideoOff className="w-7 h-7 text-rose-500/80 mx-auto animate-pulse mb-1.5" />
                                  <span className="text-[8px] font-mono block text-rose-400 font-extrabold uppercase tracking-widest">
                                    CAMERA FEED TERMINATED
                                  </span>
                                </div>
                              )}

                              {/* SCANLINE / SHIELDS SCAN COORDINATE OVERLAYS */}
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none bg-[size:100%_4px] animate-[pulse_1.5s_infinite] opacity-30" />

                              {/* Camera landmark proctor coordinates */}
                              <div className="absolute top-2 left-2 z-10 text-[6.5px] font-mono text-slate-400 bg-black/60 px-1 rounded uppercase tracking-widest pointer-events-none">
                                CH_ID: {ic.interviewId.slice(-6).toUpperCase()}
                              </div>

                              {/* Bottom watermark stats */}
                              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                                <span className="bg-black/60 text-[6px] font-mono text-emerald-400 px-1 py-0.5 rounded uppercase font-extrabold">
                                  VOLTAGE: {isVoiceActive ? `${Math.floor(Math.random() * 20) + 70}mV` : "0mV"}
                                </span>
                                <span className="bg-black/60 text-[6px] font-mono text-white px-1 py-0.5 rounded font-bold">
                                  REAL BIOMETRIC
                                </span>
                              </div>
                            </div>

                            {/* Profile details */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className={`text-xs font-bold line-clamp-1 truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                                  {ic.candidateName}
                                </h4>
                                <span className="text-[7.5px] font-mono text-emerald-500 font-extrabold uppercase shrink-0">
                                  ACTIVE COHORT
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate leading-none">
                                Practice Topic: {ic.role} &bull; Q{ic.currentQuestionIdx}/{ic.totalQuestions}
                              </p>
                            </div>

                            {/* dictation transcript */}
                            <div className={`p-2.5 rounded-lg border text-left h-14 overflow-hidden relative flex flex-col justify-between ${
                              isLight ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-900"
                            }`}>
                              <p className={`text-[9.5px] italic leading-normal line-clamp-2 ${isLight ? "text-slate-800" : "text-slate-350"}`}>
                                {ic.liveSpeechText || ic.interimSpeechText ? (
                                  <>
                                    {ic.liveSpeechText}
                                    {ic.interimSpeechText && <span className="text-emerald-500 font-semibold"> {ic.interimSpeechText}</span>}
                                    <span className="text-emerald-400 animate-pulse font-extrabold font-mono font-bold">_</span>
                                  </>
                                ) : (
                                  <span className="text-slate-500">[Candidate listening / preparing voice statement]</span>
                                )}
                              </p>
                            </div>

                            {/* Dynamic Audio wave equalizers & controls */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/20">
                              {/* Wave bouncing visualization bars */}
                              <div className="flex items-center gap-0.5 h-4 w-28 overflow-hidden">
                                {[...Array(10)].map((_, bi) => {
                                  const hVal = isVoiceActive ? Math.floor(Math.random() * 12) + 3 : 2;
                                  return (
                                    <span
                                      key={bi}
                                      style={{ height: `${hVal}px` }}
                                      className={`w-[1.5px] rounded-full transition-all duration-150 ${
                                        isLight ? "bg-emerald-600" : "bg-emerald-400"
                                      }`}
                                    />
                                  );
                                })}
                                <span className="text-[8px] font-mono text-slate-400 ml-1.5 uppercase font-bold tracking-tight">
                                  {isVoiceActive ? "Speaking" : "Muted"}
                                </span>
                              </div>

                              {/* Sound Speak Toggle button */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  id={`btn_unmute_voice_real_${ic.interviewId}`}
                                  onClick={() => handleDashboardMuteToggle(ic.interviewId, ic.candidateName)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isUnmuted 
                                      ? "bg-emerald-500 border-emerald-555 text-slate-950 animate-pulse" 
                                      : isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                                  }`}
                                  title={isUnmuted ? "Stop listening aloud to speech transcription voice synthesize loop" : "Unmute and listen aloud to Candidate speech transcripts"}
                                >
                                  {isUnmuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  id={`btn_info_peep_real_${ic.interviewId}`}
                                  onClick={() => {
                                    setLiveSessionState(ic);
                                    setLiveCameraFrame(ic.frame);
                                    setShowLiveMonitorPanel(true);
                                  }}
                                  className={`h-6 px-2 rounded-lg border text-[8px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                    isLight ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-705" : "bg-slate-800 border-slate-705 text-slate-300 hover:text-white"
                                  }`}
                                >
                                  PEEP
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Render Simulated Candidates with high-fidelity biometric scanning layouts */}
                      {fSimList.map((ic) => {
                        const isVoiceActive = ic.isActiveSpeaker && ic.audioLevel > 5;
                        const isUnmuted = soloDashboardVoiceId === ic.id;

                        const filterMeta = 
                          ic.cameraFilter === "infrared" 
                            ? { border: "border-rose-500/30", text: "text-rose-500", label: "INFRARED GAIN", overlay: "bg-rose-500/5 animate-[pulse_1.7s_infinite] border-rose-500/20" }
                            : ic.cameraFilter === "matrix"
                              ? { border: "border-emerald-500/30", text: "text-emerald-500", label: "MATRIX SCAN", overlay: "bg-emerald-500/5 animate-[pulse_2.2s_infinite] border-emerald-500/20" }
                              : ic.cameraFilter === "biometric"
                                ? { border: "border-amber-500/30", text: "text-amber-500", label: "BIOMETRIC HUD", overlay: "bg-amber-500/5 animate-[pulse_1.9s_infinite] border-amber-500/20" }
                                : { border: "border-blue-500/30", text: "text-blue-500", label: "RAW OPTICAL", overlay: "bg-blue-550/5 animate-[pulse_2s_infinite] border-blue-500/20" };

                        return (
                          <div
                            key={ic.id}
                            id={`observation_card_sim_${ic.id}`}
                            className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-4 ${
                              isLight 
                                ? "bg-white border-slate-200 shadow hover:shadow-md" 
                                : "bg-slate-900 border-slate-805 hover:border-slate-700"
                            }`}
                          >
                            {/* Simulated Feed Label */}
                            <div className="absolute top-2.5 right-2.5 bg-slate-800 text-slate-300 text-[7.5px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded shadow z-10 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              SIMULATION CHANNEL
                            </div>

                            {/* Simulated Webcam Silhouette Feed Block */}
                            <div className="relative aspect-video rounded-xl overflow-hidden border bg-black flex items-center justify-center select-none border-slate-800">
                              
                              {/* Glowing biometric HUD circles */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className={`w-28 h-28 rounded-full border border-dashed opacity-25 animate-[spin_10s_linear_infinite] ${filterMeta.text}`} />
                                <div className={`absolute w-36 h-36 rounded-full border border-dotted opacity-10 animate-[spin_20s_linear_infinite_reverse] ${filterMeta.text}`} />
                              </div>

                              {/* Corner focus brackets */}
                              <div className={`absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 opacity-50 ${filterMeta.border}`} />
                              <div className={`absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 opacity-50 ${filterMeta.border}`} />
                              <div className={`absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 opacity-50 ${filterMeta.border}`} />
                              <div className={`absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 opacity-50 ${filterMeta.border}`} />

                              {/* Simulated silhouette with pulsing feedback */}
                              <div className="text-center z-10 space-y-1">
                                <div className="relative inline-block">
                                  <User className={`w-10 h-10 mx-auto opacity-70 transition-transform ${isVoiceActive ? "scale-105" : "scale-100"} ${filterMeta.text}`} />
                                  {isVoiceActive && (
                                    <div className="absolute inset-0 bg-transparent rounded-full animate-ping border border-current opacity-30" />
                                  )}
                                </div>
                                <div className="text-[7.5px] font-mono uppercase tracking-widest text-slate-450">
                                  {filterMeta.label}
                                </div>
                              </div>

                              {/* Matrix green or Red scanline overlay effect */}
                              <div className={`absolute inset-0 pointer-events-none border-t border-b ${filterMeta.overlay}`} />

                              <div className="absolute top-2 left-2 z-10 text-[6.5px] font-mono text-slate-500 bg-black/70 px-1 rounded uppercase tracking-widest pointer-events-none">
                                SIM_PORT: {ic.id.toUpperCase()}
                              </div>

                              {/* Bottom telemetry watermarks */}
                              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                                <span className="bg-black/70 text-[6px] font-mono text-emerald-400 px-1 py-0.5 rounded uppercase font-extrabold flex items-center gap-1">
                                  <Activity className="w-2 h-2 text-emerald-400" />
                                  VOLTAGE: {isVoiceActive ? `${Math.floor(Math.random() * 20) + 70}mV` : `${Math.floor(Math.random() * 5) + 5}mV`}
                                </span>
                                <span className={`bg-black/70 text-[6px] font-mono px-1 py-0.5 rounded font-bold ${filterMeta.text}`}>
                                  INTEGRITY: {ic.integrityScore}%
                                </span>
                              </div>
                            </div>

                            {/* Profile details */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className={`text-xs font-bold line-clamp-1 truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                                  {ic.name}
                                </h4>
                                <span className="text-[7.5px] font-mono text-indigo-400 font-extrabold uppercase shrink-0">
                                  SIM COHORT
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate leading-none">
                                Role Track: {ic.role} &bull; Integrity Score Verified
                              </p>
                            </div>

                            {/* Simulated Speech statement dictation transcription */}
                            <div className={`p-2.5 rounded-lg border text-left h-14 overflow-hidden relative flex flex-col justify-between ${
                              isLight ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-900"
                            }`}>
                              <p className={`text-[9.5px] italic leading-normal line-clamp-2 ${isLight ? "text-slate-800" : "text-slate-350"}`}>
                                {ic.currentText ? (
                                  <>
                                    {ic.currentText}
                                    <span className="text-emerald-400 animate-pulse font-extrabold font-mono">_</span>
                                  </>
                                ) : (
                                  <span className="text-slate-600">[Simulated candidate prep/ready trigger]</span>
                                )}
                              </p>
                            </div>

                            {/* Dynamic Audio wave equalizers & controls */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/20">
                              
                              {/* Wave bouncing visualization bars */}
                              <div className="flex items-center gap-0.5 h-4 w-28 overflow-hidden">
                                {[...Array(10)].map((_, bi) => {
                                  const hVal = isVoiceActive ? Math.floor(Math.random() * 12) + 3 : 2;
                                  return (
                                    <span
                                      key={bi}
                                      style={{ height: `${hVal}px` }}
                                      className={`w-[1.5px] rounded-full transition-all duration-150 ${
                                        isLight ? "bg-emerald-600" : "bg-emerald-400"
                                      }`}
                                    />
                                  );
                                })}
                                <span className="text-[8px] font-mono text-slate-450 ml-1.5 uppercase font-bold tracking-tight">
                                  {isVoiceActive ? "Speaking" : "Muted"}
                                </span>
                              </div>

                              {/* Sound Speak Toggle button */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  id={`btn_unmute_voice_sim_${ic.id}`}
                                  onClick={() => handleDashboardMuteToggle(ic.id, ic.name)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isUnmuted 
                                      ? "bg-emerald-500 border-emerald-555 text-slate-950 animate-pulse" 
                                      : isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                                  }`}
                                  title={isUnmuted ? "Stop listening aloud to simulated speech narration" : "Unmute and listen aloud to simulated candidate speech transcripts"}
                                >
                                  {isUnmuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  id={`btn_info_peep_sim_${ic.id}`}
                                  onClick={() => {
                                    setLiveSessionState({
                                      interviewId: ic.id,
                                      candidateName: ic.name,
                                      role: ic.role,
                                      currentQuestion: ic.sentence,
                                      currentQuestionIdx: 3,
                                      totalQuestions: 3,
                                      recordingState: isVoiceActive ? "listening" : "idle",
                                      cameraActive: true,
                                      liveSpeechText: ic.currentText,
                                      interimSpeechText: "",
                                      frame: null,
                                      audioLevel: ic.audioLevel,
                                      lastActive: Date.now()
                                    });
                                    setLiveCameraFrame(null);
                                    setShowLiveMonitorPanel(true);
                                  }}
                                  className={`h-6 px-2 rounded-lg border text-[8px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                    isLight ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-705" : "bg-slate-800 border-slate-705 text-slate-300 hover:text-white"
                                  }`}
                                >
                                  PEEP
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}

                    </div>
                  );
                })()}
              </section>
            )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* M1 */}
          <div className={`p-5 rounded-xl border flex items-center gap-4 transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? "text-black font-semibold" : "text-slate-500"}`}>Total Interviews</span>
              <span className={`text-lg font-bold mt-0.5 block ${isLight ? "text-slate-950" : "text-white"}`}>{totalInterviews}</span>
            </div>
          </div>

          {/* M2 */}
          <div className={`p-5 rounded-xl border flex items-center gap-4 transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? "bg-teal-50 text-teal-600" : "bg-teal-500/10 text-teal-400"
            }`}>
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? "text-black font-semibold" : "text-slate-500"}`}>Average Rating</span>
              <span className={`text-lg font-bold mt-0.5 block ${isLight ? "text-slate-950" : "text-white"}`}>
                {averageScore > 0 ? `${averageScore}%` : "N/A"}
              </span>
            </div>
          </div>

          {/* M3 */}
          <div className={`p-5 rounded-xl border flex items-center gap-4 transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"
            }`}>
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? "text-black font-semibold" : "text-slate-500"}`}>Indexed Resumes</span>
              <span className={`text-lg font-bold mt-0.5 block ${isLight ? "text-slate-950" : "text-white"}`}>{resumes.length}</span>
            </div>
          </div>

          {/* M4 */}
          <div className={`p-5 rounded-xl border flex items-center gap-4 transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? "text-black font-semibold" : "text-slate-500"}`}>Readiness Rate</span>
              <span className={`text-lg font-bold mt-0.5 block ${isLight ? "text-slate-950" : "text-white"}`}>
                {averageScore > 80 ? "High" : averageScore > 0 ? "Standard" : "N/A"}
              </span>
            </div>
          </div>
        </div>        {/* RECENT INTERVIEWS */}
        <section className="space-y-4">
          {(() => {
            const pendingCandidates = interviews.filter(i => i.status !== "completed" || i.decision === "pending" || !i.decision);
            const shortlistedCandidates = interviews.filter(i => i.status === "completed" && i.decision === "shortlisted");
            const rejectedCandidates = interviews.filter(i => i.status === "completed" && i.decision === "rejected");

            const filteredInterviews = activeCategory === "shortlisted"
              ? shortlistedCandidates
              : activeCategory === "rejected"
              ? rejectedCandidates
              : pendingCandidates;

            return (
              <>
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3 ${
                  isLight ? "border-slate-200" : "border-slate-900"
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                    <h2 className={`text-base font-bold ${isLight ? "text-slate-950" : "text-white"}`}>Interview Practice Logs</h2>
                  </div>

                  {/* Funnel Pipeline Tabs */}
                  <div className={`flex rounded-lg p-1 text-[11px] self-start md:self-auto shrink-0 space-x-1 font-mono border ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-900"
                  }`}>
                    <button
                      id="btn_pipeline_pending"
                      onClick={() => setActiveCategory("pending")}
                      className={`px-3 py-1.5 rounded-md uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeCategory === "pending"
                          ? isLight 
                            ? "bg-white text-emerald-700 font-extrabold shadow-sm" 
                            : "bg-slate-900 text-emerald-400 font-extrabold shadow-md"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Pending ({pendingCandidates.length})
                    </button>

                    <button
                      id="btn_pipeline_shortlisted"
                      onClick={() => setActiveCategory("shortlisted")}
                      className={`px-3 py-1.5 rounded-md uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeCategory === "shortlisted"
                          ? isLight 
                            ? "bg-white text-teal-700 font-extrabold shadow-sm" 
                            : "bg-slate-900 text-teal-400 font-extrabold shadow-md"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Shortlisted ({shortlistedCandidates.length})
                    </button>

                    <button
                      id="btn_pipeline_rejected"
                      onClick={() => setActiveCategory("rejected")}
                      className={`px-3 py-1.5 rounded-md uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeCategory === "rejected"
                          ? isLight 
                            ? "bg-white text-rose-700 font-extrabold shadow-sm" 
                            : "bg-slate-900 text-rose-400 font-extrabold shadow-md"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Rejected ({rejectedCandidates.length})
                    </button>
                  </div>
                </div>

                {filteredInterviews.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-12 text-center space-y-3 transition-all ${
                    isLight ? "border-slate-300 bg-white shadow-sm" : "border-slate-800 bg-slate-900/10"
                  }`}>
                    <ShieldAlert className={`w-8 h-8 mx-auto ${isLight ? "text-slate-400" : "text-slate-600"}`} />
                    <div>
                      <h4 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {activeCategory === "shortlisted"
                          ? "No shortlisted candidates"
                          : activeCategory === "rejected"
                          ? "No rejected candidates"
                          : "No pending candidate sessions"}
                      </h4>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? "text-black" : "text-slate-505"}`}>
                        {activeCategory === "shortlisted"
                          ? "Browse the pending candidate log list and select Shortlist to recommend hire."
                          : activeCategory === "rejected"
                          ? "Candidate results have not been categorised into rejection lists."
                          : "To begin practicing, upload a resume or use optimized job setups, then launch a free vocal room."}
                      </p>
                    </div>
                    {activeCategory === "pending" && (
                      <button
                        id="btn_no_int_new"
                        onClick={() => onNavigate("/app/interview/new")}
                        className="h-9 px-4 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors"
                      >
                        Create First Session
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInterviews.map((interview) => {
                      const report = mockDb.getReportByInterviewId(interview.id);
                      const hasReport = !!report;
                      const formattedDate = new Date(interview.started_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div key={interview.id} className="space-y-2">
                          <motion.div
                            id={`interview_row_${interview.id}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group text-left ${
                              isLight ? "bg-white border-slate-200 hover:border-slate-300 shadow-md" : "bg-slate-900/30 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 w-full min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold font-display ${isLight ? "text-slate-950" : "text-white"}`}>
                                  {interview.candidate_name} &mdash; {interview.role}
                                </span>
                                
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold tracking-wider ${
                                  interview.difficulty === "hard" 
                                    ? isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-500/10 text-red-400 border border-red-500/15" 
                                    : interview.difficulty === "medium" 
                                    ? isLight ? "bg-amber-50 text-amber-750 border-amber-200" : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                                    : isLight ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                                }`}>
                                  {interview.difficulty}
                                </span>

                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold tracking-wider ${
                                  interview.status === "completed"
                                    ? isLight ? "bg-emerald-50 text-emerald-700 border-emerald-250" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                                    : isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                                }`}>
                                  {interview.status}
                                </span>

                                {interview.resume_filename && (
                                  <span className={`text-[9px] font-mono truncate max-w-[150px] px-2 py-0.5 rounded border ${
                                    isLight ? "bg-slate-50 border-slate-200 text-black" : "bg-slate-950 border-slate-900 text-slate-505"
                                  }`} title={interview.resume_filename}>
                                    📄 {interview.resume_filename}
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-4 text-[10px] font-mono ${isLight ? "text-black" : "text-slate-500"}`}>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formattedDate}
                                </span>
                                <span>Questions: {interview.total_questions}</span>
                                {interview.status === "in_progress" && (
                                  <span className={isLight ? "text-blue-700 font-bold" : "text-blue-400"}>Current index: {interview.current_question_idx + 1}</span>
                                )}
                              </div>

                              {/* Dossier info block inside Dash card */}
                              {((interview as any).location || (interview as any).expected_salary || (interview as any).current_salary || (interview as any).job_description_filename) && (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-850/40 text-[9px] font-mono text-slate-400">
                                  {(interview as any).location && (
                                    <span className={`px-2 py-0.5 rounded ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950 text-slate-400"}`}>
                                      📍 {(interview as any).location}
                                    </span>
                                  )}
                                  {(interview as any).current_salary && (
                                    <span className={`px-2 py-0.5 rounded ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950 text-slate-400"}`}>
                                      Current: <strong className={isLight ? "text-slate-900" : "text-slate-200"}>{(interview as any).current_salary}</strong>
                                    </span>
                                  )}
                                  {(interview as any).expected_salary && (
                                    <span className={`px-1.5 py-0.5 rounded ${isLight ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-emerald-500/[0.04] border border-emerald-500/15 text-emerald-400"}`}>
                                      Expected: <strong className={isLight ? "text-emerald-900" : "text-emerald-300"}>{(interview as any).expected_salary}</strong>
                                    </span>
                                  )}
                                  {(interview as any).job_description_filename && (
                                    <span className={`px-1.5 py-0.5 rounded ${isLight ? "bg-teal-50 text-teal-800 border border-teal-100" : "bg-teal-500/[0.04] border border-teal-500/15 text-teal-400"}`}>
                                      🎯 JD: {(interview as any).job_description_filename}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center flex-wrap sm:flex-nowrap">
                              {interview.status === "completed" && report && (
                                <div className="text-right mr-2 hidden sm:block">
                                  <span className={`text-[10px] font-mono uppercase ${isLight ? "text-black" : "text-slate-500"}`}>Overall Assessment</span>
                                  <span className={`text-xs font-bold block -mt-0.5 ${isLight ? "text-emerald-700 font-extrabold" : "text-emerald-400"}`}>
                                    {report.overall_score}% &bull; {report.recommendation}
                                  </span>
                                </div>
                              )}

                              {/* Interactive Recruiter Decision Quick Toggles */}
                              {interview.status === "completed" && (
                                <div className={`flex items-center gap-1 p-0.5 border rounded-lg shrink-0 ${
                                  isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-900"
                                }`} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    id={`btn_recruiter_sh_${interview.id}`}
                                    onClick={() => handleUpdateDecision(interview.id, "shortlisted")}
                                    className={`px-2 h-7 rounded text-[9px] font-mono uppercase tracking-wide font-bold transition-all cursor-pointer ${
                                      interview.decision === "shortlisted"
                                        ? "bg-emerald-500 text-slate-950 font-black shadow"
                                        : isLight ? "text-black hover:text-emerald-700 hover:bg-white" : "text-slate-500 hover:text-emerald-400 hover:bg-slate-900"
                                    }`}
                                    title="Recommend Shortlist"
                                  >
                                    Shortlist
                                  </button>

                                  <button
                                    id={`btn_recruiter_rj_${interview.id}`}
                                    onClick={() => handleUpdateDecision(interview.id, "rejected")}
                                    className={`px-2 h-7 rounded text-[9px] font-mono uppercase tracking-wide font-bold transition-all cursor-pointer ${
                                      interview.decision === "rejected"
                                        ? "bg-rose-500 text-white font-black shadow"
                                        : isLight ? "text-black hover:text-rose-700 hover:bg-white" : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                                    }`}
                                    title="Recommend Reject"
                                  >
                                    Reject
                                  </button>

                                  {(interview.decision === "shortlisted" || interview.decision === "rejected") && (
                                    <button
                                      id={`btn_recruiter_reset_${interview.id}`}
                                      onClick={() => handleUpdateDecision(interview.id, "pending")}
                                      className={`w-6 h-7 font-mono text-[9px] uppercase rounded cursor-pointer ${
                                        isLight ? "text-black hover:text-slate-800 hover:bg-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                                      }`}
                                      title="Reset Status"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Watch Answer Videos Button Accordion Trigger */}
                              {interview.status === "completed" && (
                                <button
                                  id={`btn_watch_${interview.id}`}
                                  onClick={() => setExpandedReviewSessionId(expandedReviewSessionId === interview.id ? null : interview.id)}
                                  className={`h-9 px-3 rounded-lg border text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
                                    expandedReviewSessionId === interview.id
                                      ? isLight 
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                                        : "bg-emerald-500/15 border-emerald-500/35 text-white font-bold"
                                      : isLight
                                        ? "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                                        : "border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400"
                                  }`}
                                >
                                  <Film className="w-3.5 h-3.5" />
                                  {expandedReviewSessionId === interview.id ? "Close Player" : "Watch Videos"}
                                </button>
                              )}

                              {interview.status === "completed" && hasReport && (
                                <button
                                  id={`btn_report_${interview.id}`}
                                  onClick={() => onNavigate(`/app/interview/${interview.id}/report`)}
                                  className={`h-9 px-4 rounded-lg text-xs font-semibold tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
                                    isLight 
                                      ? "bg-slate-100 border border-slate-200 text-slate-850 hover:bg-slate-200 hover:text-black shadow-sm"
                                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                  }`}
                                >
                                  View Report
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {interview.status !== "completed" && (
                                <button
                                  id={`btn_copy_invite_${interview.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`${customBaseUrl}/#/invite/${interview.id}`);
                                    setCopiedInviteId(interview.id);
                                    setTimeout(() => setCopiedInviteId(null), 2500);
                                  }}
                                  className={`h-9 px-3 rounded-lg border text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
                                    copiedInviteId === interview.id
                                      ? "bg-emerald-500/15 border-emerald-500/35 text-white"
                                      : isLight
                                        ? "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-705 hover:text-indigo-700"
                                        : "border-slate-800 hover:border-indigo-505/30 hover:bg-indigo-500/5 text-slate-330 hover:text-indigo-400"
                                  }`}
                                  title="Copy secure candidate invitation link"
                                >
                                  {copiedInviteId === interview.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                      <span className="text-emerald-600 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Link className="w-3.5 h-3.5 text-slate-500" />
                                      Copy Invite
                                    </>
                                  )}
                                </button>
                              )}

                              {interview.status !== "completed" && (
                                <button
                                  id={`btn_gen_unique_link_${interview.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeInviteGenInterviewId === interview.id) {
                                      setActiveInviteGenInterviewId(null);
                                    } else {
                                      setActiveInviteGenInterviewId(interview.id);
                                      setSessionCandidateName("");
                                      setSessionCandidateEmail("");
                                      setGeneratedSessionToken("");
                                      setSessionGenerationError("");
                                    }
                                  }}
                                  className={`h-9 px-3 rounded-lg border text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeInviteGenInterviewId === interview.id
                                      ? "bg-amber-500/10 border-amber-500/35 text-amber-400 font-bold"
                                      : isLight
                                        ? "border-slate-300 hover:border-amber-550 hover:bg-amber-50/50 text-slate-705"
                                        : "border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 text-slate-350 hover:text-amber-400"
                                  }`}
                                  title="Generate a unique, expiring candidate token link"
                                >
                                  <Users className="w-3.5 h-3.5 text-amber-500" />
                                  {activeInviteGenInterviewId === interview.id ? "Close Generator" : "Candidate Links"}
                                </button>
                              )}

                              {interview.status === "in_progress" && (
                                <button
                                  id={`btn_resume_int_${interview.id}`}
                                  onClick={() => onNavigate(`/app/interview/${interview.id}`)}
                                  className="h-9 px-4 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold tracking-tight hover:bg-teal-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  Resume Setup
                                  <Play className="w-3" />
                                </button>
                              )}

                              <button
                                id={`btn_delete_int_${interview.id}`}
                                onClick={(e) => handleDeleteInterview(interview.id, e)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                                  isLight 
                                    ? "border-slate-300 hover:border-red-500 hover:bg-red-50 text-slate-500 hover:text-red-600"
                                    : "border-slate-900 hover:border-red-500 hover:bg-red-500/10 text-slate-600 hover:text-red-400"
                                }`}
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>

                          {/* Collapsible Dashboard Practice Video Player Accordion Panel */}
                          <AnimatePresence>
                            {expandedReviewSessionId === interview.id && (
                              <DashboardVideoViewer 
                                interviewId={interview.id} 
                                onDecisionChange={(id, decId) => handleUpdateDecision(id, decId)}
                                theme={theme}
                              />
                            )}
                          </AnimatePresence>

                          {/* Collapsible Unique Candidate Link Generation Drawer/Accordion */}
                          <AnimatePresence>
                            {activeInviteGenInterviewId === interview.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className={`overflow-hidden border-t ${
                                  isLight ? "bg-slate-50/70 border-slate-100" : "bg-slate-950/60 border-slate-900"
                                }`}
                              >
                                <div className="p-5 space-y-4 text-left">
                                  <div className="flex items-center gap-1.5 pb-2 border-b border-dashed border-slate-805/50">
                                    <Users className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                                      Generate Unique Candidate Link (Step 2)
                                    </h4>
                                  </div>

                                  <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-605" : "text-slate-400"}`}>
                                    Generate a unique, single-session token for this interview template. This creates a secure record in the <strong className="text-emerald-400 font-mono">interview_sessions</strong> table in Supabase.
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="space-y-1.5 text-left">
                                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-450 font-bold block">
                                        Candidate Name
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Amara Vance"
                                        value={sessionCandidateName}
                                        onChange={(e) => setSessionCandidateName(e.target.value)}
                                        className={`w-full h-9 px-3 rounded-lg text-xs border focus:outline-none transition-all ${
                                          isLight 
                                            ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500" 
                                            : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-700 focus:border-amber-500"
                                        }`}
                                      />
                                    </div>

                                    <div className="space-y-1.5 text-left">
                                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-450 font-bold block">
                                        Candidate Email Address
                                      </label>
                                      <input
                                        type="email"
                                        placeholder="e.g. amara@gmail.com"
                                        value={sessionCandidateEmail}
                                        onChange={(e) => setSessionCandidateEmail(e.target.value)}
                                        className={`w-full h-9 px-3 rounded-lg text-xs border focus:outline-none transition-all ${
                                          isLight 
                                            ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500" 
                                            : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-700 focus:border-amber-500"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  {sessionGenerationError && (
                                    <p className="text-[10px] text-red-400 font-mono font-bold">
                                      ⚠️ {sessionGenerationError}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-3 pt-2">
                                    <button
                                      onClick={async () => {
                                        if (!sessionCandidateName.trim() || !sessionCandidateEmail.trim()) {
                                          setSessionGenerationError("Please input candidate name and email to proceed.");
                                          return;
                                        }
                                        setSessionGenerationError("");
                                        setIsGeneratingSessionToken(true);

                                        try {
                                          // Generate conforming UUID token
                                          const safeUUID = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                                            const r = (Math.random() * 16) | 0;
                                            const v = c === "x" ? r : (r & 0x3) | 0x8;
                                            return v.toString(16);
                                          });

                                          // 7 days expiry from now
                                          const expiryDate = new Date();
                                          expiryDate.setDate(expiryDate.getDate() + 7);

                                          const payload = {
                                            id: safeUUID,
                                            token: safeUUID,
                                            interviewId: interview.id,
                                            interview_id: interview.id, // compatibility
                                            candidateName: sessionCandidateName.trim(),
                                            candidate_name: sessionCandidateName.trim(),
                                            candidateEmail: sessionCandidateEmail.trim().toLowerCase(),
                                            candidate_email: sessionCandidateEmail.trim().toLowerCase(),
                                            status: "pending",
                                            expiresAt: expiryDate.toISOString(),
                                            expires_at: expiryDate.toISOString(),
                                            role: interview.role || "Software Engineer",
                                            preferredVoice: interview.preferred_voice || "female"
                                          };

                                          // Create local sessions cache list
                                          const existingSessions = JSON.parse(localStorage.getItem("supabase_interview_sessions") || "[]");
                                          existingSessions.unshift(payload);
                                          localStorage.setItem("supabase_interview_sessions", JSON.stringify(existingSessions));

                                          // Attempt standard cloud insert to Supabase interview_sessions
                                          const { error } = await supabase.from("interview_sessions").insert([payload]);
                                          if (error) {
                                            console.warn("Supabase sessions insert warning (synced locally):", error);
                                          } else {
                                            console.log("✔ Supabase candidates session token stored successfully:", payload);
                                          }

                                          setGeneratedSessionToken(safeUUID);
                                        } catch (err: any) {
                                          console.error("Link generation err:", err);
                                          setSessionGenerationError(err.message || "Something went wrong.");
                                        } finally {
                                          setIsGeneratingSessionToken(false);
                                        }
                                      }}
                                      disabled={isGeneratingSessionToken}
                                      className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 select-none"
                                    >
                                      {isGeneratingSessionToken ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          Registering...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3.5 h-3.5" />
                                          Create Candidate Token link
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {generatedSessionToken && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`p-3.5 rounded-xl border border-dashed flex flex-col sm:flex-row items-center gap-3 text-left ${
                                        isLight ? "bg-emerald-500/5 border-emerald-500/25" : "bg-emerald-500/5 border-emerald-500/20"
                                      }`}
                                    >
                                      <div className="flex-1 space-y-1.5 text-left w-full min-w-0">
                                        <span className="text-[9.5px] uppercase font-mono font-bold text-emerald-400 tracking-widest block">
                                          ✔ Candidate Link Generated Successfully!
                                        </span>
                                        <input
                                          type="text"
                                          readOnly
                                          value={`${window.location.origin}/#/interview/${generatedSessionToken}`}
                                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-emerald-400 focus:outline-none truncate select-all"
                                        />
                                      </div>
                                      
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${window.location.origin}/#/interview/${generatedSessionToken}`);
                                          setCopiedSessionTokenId(generatedSessionToken);
                                          setTimeout(() => setCopiedSessionTokenId(null), 2500);
                                        }}
                                        className={`h-8 px-3 rounded font-semibold text-[10.5px] uppercase font-mono tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                                          copiedSessionTokenId === generatedSessionToken
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-850"
                                        }`}
                                      >
                                        {copiedSessionTokenId === generatedSessionToken ? (
                                          <>
                                            <Check className="w-3 h-3 text-white" />
                                            COPIED!
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            COPY LINK
                                          </>
                                        )}
                                      </button>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* INDEXED RESUMES HISTORY */}
        <section className="space-y-4">
          <div className={`flex items-center justify-between border-b pb-3 ${
            isLight ? "border-slate-200" : "border-slate-900"
          }`}>
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${isLight ? "text-emerald-700" : "text-emerald-400"}`} />
              <h2 className={`text-base font-bold ${isLight ? "text-slate-950" : "text-white"}`}>Indexed Portfolio Resumes</h2>
            </div>
            <button
              id="btn_add_resume_dash"
              onClick={() => onNavigate("/app/resume")}
              className={`px-3 h-8 rounded-lg text-[11px] font-semibold border flex items-center gap-1 tracking-tight transition-all cursor-pointer ${
                isLight 
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-sm"
                  : "bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Upload New
            </button>
          </div>

          {resumes.length === 0 ? (
            <div className={`rounded-xl border border-dashed p-8 text-center transition-all ${
              isLight ? "border-slate-300 bg-white shadow-sm" : "border-slate-800 bg-slate-900/10"
            }`}>
              <p className={`text-xs ${isLight ? "text-black" : "text-slate-500"}`}>No resumes indexed yet. Adding a resume enables ATS diagnostics and tailored questions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((resume) => (
                <div 
                  key={resume.id}
                  id={`resume_card_${resume.id}`}
                  className={`p-5 rounded-xl border transition-all flex justify-between gap-4 ${
                    isLight ? "bg-white border-slate-200 hover:border-slate-250 shadow-md" : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                        isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      }`}>
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className={`text-xs font-bold line-clamp-1 truncate block max-w-[200px] ${isLight ? "text-slate-900" : "text-white"}`} title={resume.filename}>
                          {resume.filename}
                        </h4>
                        <span className={`text-[9px] font-mono uppercase block ${isLight ? "text-black" : "text-slate-500"}`}>
                          Parsed &bull; {new Date(resume.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[9px] font-mono uppercase block ${isLight ? "text-black" : "text-slate-500"}`}>Parsed Talent Core</span>
                      <div className="flex flex-wrap gap-1">
                        {resume.parsed?.skills?.slice(0, 4).map((skill, si) => (
                          <span key={si} className={`text-[9px] border px-1.5 py-0.5 rounded ${
                            isLight ? "bg-slate-50 border-slate-200 text-black font-medium" : "bg-slate-950 border-slate-850 text-slate-300"
                          }`}>
                            {skill}
                          </span>
                        ))}
                        {(resume.parsed?.skills?.length || 0) > 4 && (
                          <span className={`text-[9px] block self-center ${isLight ? "text-black" : "text-slate-500"}`}>+{(resume.parsed?.skills?.length || 0) - 4} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
                      isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border border-emerald-500/15"
                    }`}>
                      <span className={`text-xs font-bold font-mono ${isLight ? "text-emerald-750 font-extrabold" : "text-emerald-400"}`}>{resume.ats_score}</span>
                      <span className={`text-[8px] font-mono uppercase block leading-none ${isLight ? "text-emerald-600 font-semibold" : "text-emerald-500"}`}>ATS Score</span>
                    </div>

                    <button
                      id={`btn_delete_resume_${resume.id}`}
                      onClick={(e) => handleDeleteResume(resume.id, e)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                        isLight
                          ? "border-slate-300 hover:border-red-500 hover:bg-red-50 text-slate-500 hover:text-red-600"
                          : "border-slate-900 hover:border-red-500 hover:bg-rose-500/10 text-slate-605 hover:text-red-400"
                      }`}
                      title="Delete Resume"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        ) : (
          <motion.div
            key="receipts_dashboard_tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="space-y-8 text-left"
          >
            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className={`p-5 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
              }`}>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Active Premium Tier</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLight ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <h3 className={`text-base font-extrabold ${isLight ? "text-slate-950" : "text-white"}`}>
                    {userTransactions.length > 0 
                      ? `${userTransactions[0]?.planName || "Premium"} Plan`
                      : "Basic Free"
                    }
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-light">
                  {userTransactions.length > 0
                    ? `Billed ${userTransactions[0]?.billingInterval === "yearly" ? "yearly" : "monthly"}`
                    : "No active clear invoices"
                  }
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
              }`}>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Invoices Settled</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLight ? "bg-indigo-50 text-indigo-650" : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    <Receipt className="w-4.5 h-4.5" />
                  </div>
                  <h3 className={`text-base font-extrabold ${isLight ? "text-slate-950" : "text-white"}`}>
                    {userTransactions.length} Receipts
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-light">Tax-compliant digital logs ready</p>
              </div>

              <div className={`p-5 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"
              }`}>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Total Investment</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLight ? "bg-emerald-50 text-emerald-600" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                  <h3 className={`text-base font-extrabold ${isLight ? "text-slate-950" : "text-white"}`}>
                    ₹{userTransactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString("en-IN")}.00
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-light">INR transactions ledger trace</p>
              </div>
            </div>

            {/* List Table / Card View of Receipts */}
            <div className={`border rounded-2xl overflow-hidden shadow-sm ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
            }`}>
              <div className={`px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-900/30"
              }`}>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Past Transaction Logs</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Filterable tax ledger of your subscription checkouts</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchUserTransactions}
                    disabled={isTxLoading}
                    className={`h-8 px-3 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${
                        isLight
                          ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "bg-slate-950 border border-slate-800 hover:border-slate-800 text-slate-300 hover:text-white"
                      }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isTxLoading ? "animate-spin" : ""}`} />
                    Refresh Ledger
                  </button>

                  <button
                    onClick={() => onNavigate("/subscription")}
                    className="h-8 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    Get Premium Plus
                  </button>
                </div>
              </div>

              {/* Transactions Content */}
              {isTxLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-[11px] font-mono text-slate-500">Querying secure payment trace records...</p>
                </div>
              ) : txError ? (
                <div className="p-8 text-center space-y-3">
                  <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                    isLight ? "bg-rose-50 text-rose-500" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Error Querying Server</h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">{txError}</p>
                  </div>
                </div>
              ) : userTransactions.length === 0 ? (
                <div className="py-16 text-center px-4 space-y-6">
                  <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                    isLight ? "bg-slate-100 text-slate-500" : "bg-slate-950 border border-slate-800 text-slate-400"
                  }`}>
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-950" : "text-white"}`}>No Premium Receipts Discovered</h4>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      Any Stripe Card checks or Direct UPI statement approvals will register here automatically for {profile?.email || "this email identifier"}.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("/subscription")}
                    className="px-5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-tight transition-all shadow-md shadow-emerald-500/10 cursor-pointer select-none inline-flex items-center gap-1.5"
                  >
                    Upgrade Your Plan Now
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${isLight ? "border-slate-200 bg-slate-50/30 text-slate-500" : "border-slate-800 bg-slate-950/20 text-slate-400"}`}>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Plan Name</th>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Payment Source</th>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Reference / UTR ID</th>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Created Date</th>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Amount</th>
                        <th className="px-6 py-4 font-semibold tracking-wider uppercase text-[10px]">Status</th>
                        <th className="px-6 py-4 font-semibold tracking-right uppercase text-[10px] text-right" style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? "divide-slate-100 text-slate-700" : "divide-slate-800/60 text-slate-300"}`}>
                      {userTransactions.map((tx, idx) => {
                        const isCard = tx.paymentMethod === "card";
                        const isApproved = tx.status === "approved";
                        
                        return (
                          <tr 
                            key={tx.utrNumber || idx}
                            className={`transition-colors ${
                              isLight ? "hover:bg-slate-50/50" : "hover:bg-slate-900/30"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${isLight ? "text-slate-950" : "text-white"}`}>{tx.planName}</span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-tight lowercase">
                                  / {tx.billingInterval}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium">
                              <div className="flex items-center gap-1.5">
                                {isCard ? (
                                  <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                ) : (
                                  <span className="text-[9px] font-mono tracking-wider font-extrabold bg-[#3D81E3]/10 text-[#3D81E3] border border-[#3D81E3]/20 px-1.5 py-0.5 rounded uppercase scale-95 shrink-0">UPI</span>
                                )}
                                <span>{isCard ? "Stripe Credit Card" : "Direct UPI Peer"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-400 bg-slate-950/20 px-1.5 py-0.5 rounded border border-white/5 select-all text-[11px] truncate max-w-[140px]">{tx.utrNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(tx.utrNumber);
                                    setCopiedUtr(tx.utrNumber);
                                    setTimeout(() => setCopiedUtr(null), 2005);
                                  }}
                                  className={`text-[9px] font-mono cursor-pointer transition-colors ${
                                    copiedUtr === tx.utrNumber 
                                      ? "text-emerald-400 font-bold" 
                                      : "text-slate-500 hover:text-slate-300"
                                  }`}
                                  title="Copy trace identifier"
                                >
                                  {copiedUtr === tx.utrNumber ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-400">
                              {new Date(tx.created_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-mono font-bold text-[12px] opacity-90 ${isLight ? "text-slate-950" : "text-white"}`}>₹{tx.amount.toLocaleString("en-IN")}.00</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                isApproved 
                                  ? isLight 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : isLight 
                                    ? "bg-amber-50 border-amber-200 text-amber-700" 
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${
                                  isApproved ? "bg-emerald-400" : "bg-amber-400"
                                }`} />
                                {tx.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isApproved ? (
                                <button
                                  onClick={() => generateReceiptPdf(tx)}
                                  className="h-8 pl-2 w-full pr-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-300 hover:text-white transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none"
                                >
                                  <Download className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                                  <span>Download PDF</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500 block text-right italic">Awaiting Clearance</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Disclaimer block info */}
            <div className={`p-4 rounded-xl border text-[11px] leading-snug flex items-start gap-2.5 max-w-2xl font-light ${
              isLight ? "border-slate-205 bg-slate-50/50 text-slate-500" : "border-slate-800/60 bg-slate-900/10 text-slate-400"
            }`}>
              <span className="text-amber-500 scale-110">💡</span>
              <div>
                <strong>Reconciliation processing</strong>: Direct peer UPI logs undergo statement audits on our backend twice daily. Once approved, the status is instantly cleared, enabling direct high-fidelity PDF invoice downloads. Stripe card transaction clearings are immediate.
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Pristine Custom HTML Deletion Confirmation Modal Overlay */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            id="blk_delete_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              id="blk_delete_modal_card"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left"
            >
              {/* Top Warning Banner / Header */}
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Confirm Deletion</h3>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Irreversible Action</p>
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-light">
                <p>
                  Are you absolutely sure you want to permanently remove this record?
                </p>
                <div className="p-3 bg-slate-950/60 border border-slate-850/80 rounded-xl font-mono text-[11px] text-slate-300 break-words">
                  <strong>{deleteTarget.name}</strong>
                </div>
                {deleteTarget.type === "interview" && (
                  <p className="text-rose-400/80 font-mono text-[10px]">
                    &bull; Warning: All recorded session video feeds, transcription streams, and AI-categorized rating reports associated with this session will be wiped out.
                  </p>
                )}
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn_cancel_delete_modal"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 h-9 rounded-lg hover:bg-slate-800 text-slate-400 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn_confirm_delete_modal"
                  onClick={executeDelete}
                  className="px-4 h-9 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold tracking-tight transition-colors cursor-pointer"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Robotic Bulk Candidates Simulation Setup Modal */}
      <AnimatePresence>
        {showBulkSetupModal && (
          <motion.div
            id="blk_bulk_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] overflow-y-auto p-4 md:p-6 flex items-start justify-center"
            onClick={() => setShowBulkSetupModal(false)}
          >
            <motion.div
              id="blk_bulk_modal_card"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-left my-auto"
            >
              {/* Top Banner Header */}
              <div className="flex items-center gap-3 text-indigo-405">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Bulk Candidate Simulator Desk</h3>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Deploy Massive Recruiter Surveillance Cohort</p>
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-light">
                <p>
                  Deploy simulated high-fidelity mock candidate streams running concurrently. Stress-test your <strong>Live Watching Surveillance Cockpit</strong> with automatic real-time vocal transcript updates, audio level meters, and webcam feed renderings.
                </p>
              </div>

              {/* Range Selector Buttons inside the Modal */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                  Select Cohort Range Preset:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkSimulationCount(50)}
                    className={`p-3 rounded-xl border font-mono text-[11px] font-bold text-center transition-all cursor-pointer ${
                      bulkSimulationCount >= 1 && bulkSimulationCount <= 100
                        ? "bg-indigo-500/15 border-indigo-500/55 text-indigo-400 shadow shadow-indigo-500/10"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    1 - 100
                    <span className="block text-[8px] text-slate-500 font-light font-sans mt-0.5">Preset: 50 Streams</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkSimulationCount(200)}
                    className={`p-3 rounded-xl border font-mono text-[11px] font-bold text-center transition-all cursor-pointer ${
                      bulkSimulationCount >= 101 && bulkSimulationCount <= 300
                        ? "bg-indigo-500/15 border-indigo-500/55 text-indigo-400 shadow shadow-indigo-500/10"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    101 - 300
                    <span className="block text-[8px] text-slate-500 font-light font-sans mt-0.5">Preset: 200 Streams</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkSimulationCount(450)}
                    className={`p-3 rounded-xl border font-mono text-[11px] font-bold text-center transition-all cursor-pointer ${
                      bulkSimulationCount >= 301 && bulkSimulationCount <= 500
                        ? "bg-indigo-500/15 border-indigo-500/55 text-indigo-400 shadow shadow-indigo-500/10"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    301 - 500
                    <span className="block text-[8px] text-slate-500 font-light font-sans mt-0.5">Preset: 450 Streams</span>
                  </button>
                </div>
              </div>

              {/* Slider for precision cohort size Selection */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="font-mono text-slate-400">Precision Total Stream Sizing:</span>
                  <span className="text-indigo-400 font-mono font-bold text-xs bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded">
                    {bulkSimulationCount} Candidates
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={bulkSimulationCount}
                  onChange={(e) => setBulkSimulationCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-600">
                  <span>Min: 5</span>
                  <span>Max: 500 Candidates Limit</span>
                </div>
              </div>

              {/* BRAND NEW COMPLEX CONFIGURATION DESK FOR BULK */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-855/80 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                  <span className="font-mono text-[9px] text-teal-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Simulated Candidate Dossier & Campaign specs
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Bulk Defaults</span>
                </div>

                {/* Name, Email ID, Resume Parse Row */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Name field */}
                    <div className="space-y-1">
                      <label htmlFor="bulk_setup_candidate_name" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-teal-400" />
                        Default Candidate Full Name
                      </label>
                      <input
                        id="bulk_setup_candidate_name"
                        type="text"
                        value={bulkCandidateName}
                        onChange={(e) => setBulkCandidateName(e.target.value)}
                        placeholder="E.g., Devendra Kumar"
                        className="w-full h-9 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 text-xs w-full text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>

                    {/* Email ID field */}
                    <div className="space-y-1">
                      <label htmlFor="bulk_setup_candidate_email" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                        <Mail className="w-3 h-3 text-teal-400" />
                        Default Candidate Email ID
                      </label>
                      <input
                        id="bulk_setup_candidate_email"
                        type="email"
                        value={bulkCandidateEmail}
                        onChange={(e) => setBulkCandidateEmail(e.target.value)}
                        placeholder="e.g., devendra.kumar@example.com"
                        className="w-full h-9 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 text-xs w-full text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  {/* Resume Parse interactive segment */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      Bulk Resume Parse uploader
                    </label>
                    <div className={`relative border border-dashed rounded-lg p-3 flex flex-col items-center justify-center transition-all bg-slate-900/40 hover:bg-slate-900 ${
                      isBulkParsing ? "border-teal-500/50" : "border-slate-800 hover:border-teal-500/40"
                    }`}>
                      <input 
                        type="file" 
                        id="bulk_resume_dossier_parse"
                        onChange={handleParseBulkResume} 
                        className="absolute inset-0 opacity-0 cursor-pointer text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt" 
                        disabled={isBulkParsing}
                      />
                      {isBulkParsing ? (
                        <div className="flex items-center gap-2 text-center py-1">
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <p className="text-[9px] font-mono text-teal-400 font-semibold uppercase animate-pulse">Running smart resume text diagnostics...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-4 h-4 mx-auto text-teal-550 mb-1" />
                          <p className="text-[10px] text-slate-300">Upload candidate resume to auto-populate metadata fields</p>
                          <p className="text-[8px] text-slate-500">Extracts fields from PDF/DOCX automatically</p>
                          {bulkLastParsedResumeName && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[8.5px] font-mono font-bold">
                              <Check className="w-2.5 h-2.5" /> Extracted from: {bulkLastParsedResumeName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-900 pt-3">
                  <div className="md:col-span-2 space-y-1 flex flex-col">
                    <label htmlFor="bulk_jd_text_area" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                      <FileText className="w-3 h-3 text-teal-400" />
                      Campaign Job Description
                    </label>
                    <textarea
                      id="bulk_jd_text_area"
                      rows={2}
                      value={bulkJobDescriptionText}
                      onChange={(e) => setBulkJobDescriptionText(e.target.value)}
                      placeholder="Input the core job requirements to contextually align simulated AI..."
                      className="w-full rounded-lg p-2 text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none resize-none focus:border-teal-500"
                    />
                  </div>

                  {/* Attach JD file */}
                  <div className="space-y-1 flex flex-col justify-between">
                    <div>
                      <label className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                        <Plus className="w-3 h-3 text-teal-400" />
                        Attach JD
                      </label>
                      <span className="text-[8px] text-slate-500 block">PDF/DOCX spec file format</span>
                    </div>

                    <div className="relative">
                      <input 
                        type="file" 
                        id="bulk_jd_file_loader" 
                        onChange={handleBulkJdUpload} 
                        className="hidden text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={isBulkJdUploading}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("bulk_jd_file_loader")?.click()}
                        disabled={isBulkJdUploading}
                        className="w-full h-8 bg-slate-900 border border-slate-800 hover:border-slate-750 font-mono text-[9px] uppercase font-bold text-slate-300 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {isBulkJdUploading ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
                        ) : bulkJobDescriptionFile ? (
                          <>
                            <Check className="w-3 h-3 text-teal-400" />
                            <span className="truncate max-w-[90px] text-teal-400 font-extrabold">{bulkJobDescriptionFile}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3 text-slate-550" />
                            <span>Browse File</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Salary: Expected, Current */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-900 pt-3">
                  <div className="space-y-1">
                    <label htmlFor="bulk_setup_current_salary" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      Current Salary Setup
                    </label>
                    <input
                      id="bulk_setup_current_salary"
                      type="text"
                      value={bulkCurrentSalary}
                      onChange={(e) => setBulkCurrentSalary(e.target.value)}
                      placeholder="e.g., ₹12,00,000 / year"
                      className="w-full h-9 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="bulk_setup_expected_salary" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                      <Award className="w-3 h-3 text-emerald-400" />
                      Expected Salary Setup
                    </label>
                    <input
                      id="bulk_setup_expected_salary"
                      type="text"
                      value={bulkExpectedSalary}
                      onChange={(e) => setBulkExpectedSalary(e.target.value)}
                      placeholder="e.g., ₹18,00,000 / year"
                      className="w-full h-9 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location Input Row */}
                <div className="space-y-1 border-t border-slate-900 pt-3">
                  <label htmlFor="bulk_setup_candidate_location" className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-slate-400">
                    <Users className="w-3 h-3 text-teal-400" />
                    Target Candidate Location
                  </label>
                  <input
                    id="bulk_setup_candidate_location"
                    type="text"
                    value={bulkLocation}
                    onChange={(e) => setBulkLocation(e.target.value)}
                    placeholder="e.g., Pune, Maharashtra or Remote, India"
                    className="w-full h-9 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* Copy Link & Send Email Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-900 pt-3">
                  {/* Copy Link section */}
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono uppercase tracking-wider text-slate-550 block font-bold">
                      Pre-generated Cohort Link:
                    </label>
                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={`${customBaseUrl}/#/invite/bulk-sim-session`}
                        className="flex-1 bg-transparent pl-2 text-[10px] font-mono text-emerald-400 focus:outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${customBaseUrl}/#/invite/bulk-sim-session`);
                          setBulkCopiedSuccess(true);
                          setTimeout(() => setBulkCopiedSuccess(false), 2000);
                        }}
                        className={`h-7 px-2.5 rounded font-mono text-[8.5px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 shrink-0 ${
                          bulkCopiedSuccess 
                            ? "bg-emerald-500 text-slate-950 font-black" 
                            : "bg-slate-950 border border-slate-805 text-slate-300 hover:text-white"
                        }`}
                      >
                        {bulkCopiedSuccess ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  {/* Send Email direct button */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleSendBulkDirectEmail}
                      disabled={bulkEmailStatus === "sending" || !bulkCandidateEmail.trim()}
                      className={`h-8 w-full rounded-lg font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        bulkEmailStatus === "sent"
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : bulkEmailStatus === "sending"
                            ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
                            : "bg-indigo-500/[0.08] hover:bg-indigo-505/[0.15] border-indigo-500/25 text-indigo-400 hover:text-indigo-305"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {bulkEmailStatus === "sending" ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                          <span>Sending Invite...</span>
                        </>
                      ) : bulkEmailStatus === "sent" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Sent!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Send Email Invite</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Settings / Mobile Device Sharing Console Accordion */}
                  <div className="md:col-span-2 space-y-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlSettings(!showUrlSettings)}
                      className="text-[9.5px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none"
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
                              Tip: Paste your <strong className="text-emerald-400">Shared App URL</strong> or <strong className="text-emerald-400">Development App URL</strong> from AI Studio's sidebar panel to update invite links instantly.
                            </p>
                          </div>
                          
                          <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 rounded bg-slate-950 border border-slate-900">
                            <img 
                              src={getQrCodeUrl(`${customBaseUrl}/#/invite/bulk-sim-session`)} 
                              alt="Scan to open on other devices" 
                              className="w-24 h-24 bg-white p-0.5 rounded shadow-sm"
                            />
                            <span className="text-[8px] font-mono text-slate-450 mt-1.5 uppercase text-center font-bold">Scan to open on phone</span>
                          </div>
                        </div>

                        <hr className="border-indigo-500/10 border-dashed my-3.5" />
                        
                        <p className="font-mono text-[9px] uppercase tracking-wider text-teal-300 font-bold mb-1">📧 BREVO & SMTP COURIER EMAIL SERVER INTEGRATION</p>
                        <p className="text-slate-400 leading-normal text-[10px] pb-1.5">
                          Configure your custom Brevo SMTP server credentials (e.g., host: <strong className="text-emerald-400">smtp-relay.brevo.com</strong>, port: <strong className="text-emerald-400">587</strong>, username, and Brevo SMTP API key as password) to transmit real invitations under your own domain securely.
                        </p>
                        
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-5 space-y-1 col-span-12">
                              <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">SMTP Host Link:</label>
                              <input
                                id="input_smtp_host"
                                type="text"
                                value={smtpHost}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSmtpHost(v);
                                  handleSaveSmtpConfig(v, smtpPort, smtpUser, smtpPass, smtpFrom);
                                }}
                                placeholder="e.g. smtp.gmail.com or mail.privateemail.com"
                                className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            
                            <div className="sm:col-span-2 space-y-1 col-span-12">
                              <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">Host Port:</label>
                              <input
                                id="input_smtp_port"
                                type="text"
                                value={smtpPort}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSmtpPort(v);
                                  handleSaveSmtpConfig(smtpHost, v, smtpUser, smtpPass, smtpFrom);
                                }}
                                placeholder="e.g. 465 or 587"
                                className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 text-center"
                              />
                            </div>
                            
                            <div className="sm:col-span-5 space-y-1 col-span-12">
                              <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">Mail Username / Sender Login:</label>
                              <input
                                id="input_smtp_user"
                                type="email"
                                value={smtpUser}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSmtpUser(v);
                                  handleSaveSmtpConfig(smtpHost, smtpPort, v, smtpPass, smtpFrom);
                                }}
                                placeholder="e.g. recruitment@yourdomain.com"
                                className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6 space-y-1 col-span-12">
                              <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">Mail Secret / SMTP Password / App Token:</label>
                              <input
                                id="input_smtp_pass"
                                type="password"
                                value={smtpPass}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSmtpPass(v);
                                  handleSaveSmtpConfig(smtpHost, smtpPort, smtpUser, v, smtpFrom);
                                }}
                                placeholder="••••••••••••••••"
                                className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="sm:col-span-6 space-y-1 col-span-12">
                              <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">From Header / Sender Label (Optional):</label>
                              <input
                                id="input_smtp_from"
                                type="text"
                                value={smtpFrom}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSmtpFrom(v);
                                  handleSaveSmtpConfig(smtpHost, smtpPort, smtpUser, smtpPass, v);
                                }}
                                placeholder="&quot;Acme HR&quot; <recruitment@yourdomain.com>"
                                className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="p-2.5 rounded border border-emerald-500/10 bg-emerald-950/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-mono font-bold text-emerald-450 uppercase tracking-widest">🧪 Verify SMTP Connection: Sending Sandbox Invitation</p>
                              {smtpHost && smtpPort && smtpUser && smtpPass ? (
                                <span className="text-[7px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase">Ready</span>
                              ) : (
                                <span className="text-[7px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-bold uppercase">Awaiting Settings</span>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                              <input
                                id="input_smtp_test_recipient"
                                type="email"
                                value={testEmailRecipient}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setTestEmailRecipient(v);
                                  localStorage.setItem("test_smtp_recipient", v);
                                }}
                                placeholder="Enter recipient email (e.g. you@yourcompany.com)"
                                className="flex-1 h-8 px-2.5 rounded text-[10px] font-mono bg-slate-950 border border-slate-850 text-slate-205 focus:outline-none placeholder:text-slate-600"
                              />
                              <button
                                id="btn_smtp_test_dispatch"
                                type="button"
                                disabled={testSmtpStatus === "testing"}
                                onClick={handleTestSmtp}
                                className="px-3.5 h-8 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-[9.5px] font-bold text-white uppercase tracking-wider transition-colors select-none whitespace-nowrap cursor-pointer"
                              >
                                {testSmtpStatus === "testing" ? "Testing Conn..." : "Dispatch Test Email"}
                              </button>
                            </div>
                            {testSmtpStatus === "success" && (
                              <p className="text-[9.5px] text-emerald-400 font-mono">✔ Success! Secure verification test email was dispatched successfully. Please check your inbox / spam folder.</p>
                            )}
                            {testSmtpStatus === "error" && (
                              <p className="text-[9.5px] text-rose-400 font-mono leading-relaxed max-w-full overflow-x-auto whitespace-pre-wrap">
                                ❌ Fail: {testSmtpError || "SMTP connection timed out. Please double-check SMTP Host, Port, Username and Security keys."}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* LIVE COMPREHENSIVE EMAIL PREVIEW DESK FOR BULK */}
                <div className="mt-3 pt-3 border-t border-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-teal-400" />
                      Live Email Notification Preview
                    </span>
                    <span className="text-[7.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase font-black tracking-wider">Candidate Template Layout</span>
                  </div>
                  
                  <div className="p-3.5 rounded-lg border border-slate-850 bg-slate-900/40 font-sans text-[11px] space-y-3.5 text-slate-300 text-left">
                    {/* Greetings Section */}
                    <div className="border-b pb-2 border-slate-800">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-500">Greetings from Company</p>
                      <p className="text-[11px] font-bold mt-0.5 text-white">Greetings from HireIQ Talent Platform</p>
                    </div>

                    {/* Body text with button */}
                    <div className="space-y-2.5">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-500">Body & Action CTA Channel</p>
                      <p className="leading-relaxed">
                        Dear <strong>{bulkCandidateName || "Candidate Name"}</strong>,<br />
                        We are pleased to invite you to complete a secure AI Voice-Simulated Interview session for the position of <strong>{bulkCandidateRole || "Software Engineer"}</strong>.
                      </p>
                      <div className="py-2.5 text-center">
                        <a 
                          href={`${customBaseUrl}/#/invite/bulk-sim-session`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-bold text-[11px] tracking-wide inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Start Your AI Interview</span>
                          <span className="text-xs">&rarr;</span>
                        </a>
                      </div>
                    </div>

                    {/* Instructions segment */}
                    <div className="p-3 rounded bg-purple-500/[0.01] border border-purple-550/10 space-y-1.5">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-purple-400 font-extrabold flex items-center gap-1">📋 Key Instructions & Guidelines</p>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-[10px] text-slate-400 leading-normal">
                        <li><strong>Preparation:</strong> Secure a quiet, distraction-free room before launching.</li>
                        <li><strong>Audio Input:</strong> Grant browser microphone and camera permissions when prompted.</li>
                        <li><strong>Stability:</strong> Maintain a reliable internet connection to prevent telemetry lag.</li>
                        <li><strong>Interactive Process:</strong> Answer naturally using real-time speech. Review detailed feedback upon finishing.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE EXCEL FILE ATTACHMENT & CANDIDATE INVITATION CAMPAIGN */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    Excel Candidate Import Engine & Dispatcher
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-light leading-snug">
                  Attach or drag an Excel/CSV spreadsheet. The system will scan columns, calculate total stream sizing, and enable automated secure invitation dispatch.
                </p>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setExcelDragged(true);
                  }}
                  onDragLeave={() => setExcelDragged(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setExcelDragged(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleParseExcel(file);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx, .xls, .csv";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleParseExcel(file);
                    };
                    input.click();
                  }}
                  className={`border border-dashed p-5 rounded-lg text-center cursor-pointer transition-all duration-200 ${
                    excelDragged
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-slate-800 hover:border-slate-750 bg-slate-900/50"
                  }`}
                >
                  {isAnalyzingExcel ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      <span className="text-[11px] font-mono text-slate-400">Analyzing row sheets & matching headers...</span>
                    </div>
                  ) : excelFile ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        {excelFile.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        File Size: {(excelFile.size / 1024).toFixed(1)} KB &bull; Row count: {excelCandidates.length} Candidates
                      </p>
                      <p className="text-[9px] bg-indigo-500/10 text-indigo-400 inline-block px-2 py-0.5 rounded border border-indigo-500/20">
                        🔄 Slide total stream sizing updated to {bulkSimulationCount}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 py-1">
                      <Upload className="w-5 h-5 text-slate-550 mx-auto mb-1" />
                      <p className="text-xs font-medium text-slate-300">Click to upload or drag Excel / CSV here</p>
                      <p className="text-[10px] font-mono text-slate-500">Standard spreadsheet templates supported (.xlsx, .csv)</p>
                    </div>
                  )}
                </div>

                {excelError && (
                  <p className="text-[10px] font-mono text-rose-450 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                    ⚠️ {excelError}
                  </p>
                )}

                {/* Detected Column Configuration */}
                {excelCandidates.length > 0 && (
                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400">Matching Configuration:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                        ✓ Auto-matched Columns
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[9px] uppercase">Candidate Email Column</label>
                        <select
                          value={excelEmailCol}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExcelEmailCol(val);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                        >
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[9px] uppercase">Candidate Name Column</label>
                        <select
                          value={excelNameCol}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExcelNameCol(val);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                        >
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Live Rich Candidate Status Table */}
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        Matched Candidate Roster ({excelCandidates.length})
                      </span>
                      <div className="max-h-48 overflow-y-auto border border-slate-850 rounded bg-slate-950 p-1.5 divide-y divide-slate-900/50 space-y-1">
                        {excelCandidates.map((c, idx) => {
                          const indivLink = `${customBaseUrl}/#/invite/sim-candidate-${idx + 1}`;
                          const isCopied = copiedInviteId === `indiv-${idx}`;
                          return (
                            <div key={idx} className="p-2 flex items-center justify-between gap-2 hover:bg-slate-900/40 rounded transition-colors text-[10px]">
                              <div className="truncate space-y-0.5 text-left">
                                <p className="font-bold text-slate-200 truncate">{c.name}</p>
                                <p className="text-slate-500 font-mono truncate text-[9px]">{c.email}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${
                                  invitationStatus === "done" || idx < successCount
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}>
                                  {invitationStatus === "done" || idx < successCount ? "SENT" : "PENDING"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(indivLink);
                                    setCopiedInviteId(`indiv-${idx}`);
                                    setTimeout(() => setCopiedInviteId(null), 2000);
                                  }}
                                  className="h-6 w-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                                  title="Copy individual secure login link"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Automatic Action Trigger */}
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300">Invite Delivery Campaign</span>
                        {invitationStatus === "sending" && (
                          <span className="text-[9.5px] text-indigo-400 font-mono animate-pulse font-bold">
                            Dispatched: {successCount}/{excelCandidates.length}
                          </span>
                        )}
                      </div>

                      {invitationStatus === "idle" && (
                        <button
                          type="button"
                          onClick={handleDispatchInvitations}
                          className="w-full h-8 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs tracking-tight rounded-md cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Invitation Emails to Candidates Now
                        </button>
                      )}

                      {/* Display Sending Status Bar */}
                      {invitationStatus !== "idle" && (
                        <div className="space-y-2.5">
                          {/* Progress Line */}
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-300"
                              style={{ width: `${(successCount / excelCandidates.length) * 105}%` }}
                            />
                          </div>

                          {/* Live Console Terminal Output */}
                          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-md text-[9px] font-mono text-indigo-300 h-28 overflow-y-auto space-y-1.5">
                            {sendingLogs.map((log, i) => (
                              <div key={i} className="leading-relaxed">
                                {log.startsWith("✔") || log.includes("✔") ? (
                                  <span className="text-emerald-400">{log}</span>
                                ) : log.includes("⚠️") ? (
                                  <span className="text-rose-400">{log}</span>
                                ) : (
                                  <span>{log}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-User Shared Invite URL generator for Bulk Cohort */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Link className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    Multi-User Shareable Invite URL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-light leading-snug">
                  Provide this unique, resilient link to actual cohort candidates. Upon entry, they will log in securely with Gmail, configure their device hardware room, and feed directly into your real-time tracking display.
                </p>
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    readOnly
                    id="txt_bulk_modal_invite_link"
                    value={`${customBaseUrl}/#/invite/bulk-sim-session`}
                    className="flex-1 bg-transparent px-2.5 text-xs font-mono text-emerald-400 focus:outline-none truncate select-all"
                  />
                  <button
                    type="button"
                    id="btn_copy_bulk_modal_invite_link"
                    onClick={() => {
                      navigator.clipboard.writeText(`${customBaseUrl}/#/invite/bulk-sim-session`);
                      setBulkInviteCopied(true);
                      setTimeout(() => setBulkInviteCopied(false), 2000);
                    }}
                    className={`h-8 px-3 rounded-lg font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      bulkInviteCopied 
                        ? "bg-emerald-500 text-slate-950 font-black" 
                        : "bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {bulkInviteCopied ? (
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

               {/* Action Trigger Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn_cancel_bulk_modal"
                  type="button"
                  onClick={() => setShowBulkSetupModal(false)}
                  className="px-4 h-9 rounded-lg hover:bg-slate-800 text-slate-400 text-xs font-semibold tracking-tight transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn_confirm_deploy_bulk"
                  type="button"
                  onClick={() => {
                    localStorage.setItem("ai_mock_interview_bulk_active", "true");
                    setIsBulkSimulationActive(true);
                    setShowBulkSetupModal(false);
                    setShowLiveMonitorPanel(true);
                  }}
                  className="px-5 h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold tracking-tight transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/15"
                >
                  <Users className="w-3.5 h-3.5 text-slate-950" />
                  Deploy Cohort Now ({bulkSimulationCount} Cand.)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Cockpit Surveillance & Bulk Cohort Live Admin radar */}
      {showLiveMonitorPanel && (
        <AdminLiveStreamMonitor
          liveSession={liveSessionState}
          liveCameraFrame={liveCameraFrame}
          onClose={() => {
            setShowLiveMonitorPanel(false);
            setIsBulkSimulationActive(false);
          }}
          isBulkMode={isBulkSimulationActive}
          bulkCount={bulkSimulationCount}
        />
      )}
    </div>
  );
}
