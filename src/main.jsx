import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, Battery, Bot, CheckCircle2, ChevronRight, CircleHelp,
  Cpu, Database, Download, HardDrive, Menu, MessageCircle,
  Mic, Network, Settings, ShieldCheck, Sparkles, X, Zap
} from "lucide-react";
import "./styles.css";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi! I'm AI System Assistant. Ask me about your device, RAM, storage, CPU, battery, or system health."
  }
];

function getBrowserStorage() {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate().then(({usage = 0, quota = 0}) => ({
    usageGB: usage / 1024 ** 3,
    quotaGB: quota / 1024 ** 3
  })).catch(() => null);
}

function App() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [storage, setStorage] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [micAllowed, setMicAllowed] = useState(false);

  useEffect(() => {
    const refresh = async () => setStorage(await getBrowserStorage());
    refresh();
    const timer = setInterval(refresh, 5000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const browserStats = useMemo(() => {
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    return {
      ram: memory ? `${memory} GB` : "Restricted",
      cores: cores || "Unknown"
    };
  }, []);

  const answer = (q) => {
    const text = q.toLowerCase();
    if (text.includes("ram") || text.includes("memory")) {
      return browserStats.ram === "Restricted"
        ? "Chrome does not expose total RAM to this web app. The Android APK will use native Android APIs for detailed RAM information."
        : `Chrome reports approximately ${browserStats.ram} of device memory. Exact real-time RAM usage requires the native Android app or a desktop companion.`;
    }
    if (text.includes("storage") || text.includes("disk")) {
      if (!storage) return "This browser does not provide storage estimates here. The Android APK can provide device storage information with the appropriate platform APIs.";
      return `This browser's storage estimate is ${storage.usageGB.toFixed(2)} GB used out of about ${storage.quotaGB.toFixed(2)} GB available to the web origin. This is browser storage, not your complete device disk.`;
    }
    if (text.includes("cpu") || text.includes("processor")) {
      return `Your browser reports ${browserStats.cores} logical CPU core(s). Chrome does not expose live CPU utilization to ordinary webpages.`;
    }
    if (text.includes("network") || text.includes("internet")) {
      return online ? "Your browser currently reports an online connection." : "Your browser currently reports that you are offline.";
    }
    if (text.includes("health") || text.includes("status")) {
      return "Current browser status: connection is " + (online ? "online" : "offline") + `. For full health analysis, the Android APK will combine RAM, storage, CPU, battery and network information.`;
    }
    if (text.includes("apk") || text.includes("android")) {
      return "The Android APK will provide deeper device monitoring using Android system APIs. We can connect its download button to your Google Drive file after the APK is built.";
    }
    return "I can help with RAM, storage, CPU, network status, system health, permissions and the Android APK. Try asking: “How much RAM can you see?”";
  };

  const sendMessage = () => {
    const q = input.trim();
    if (!q) return;
    setMessages(prev => [...prev, {role: "user", text: q}, {role: "assistant", text: answer(q)}]);
    setInput("");
  };

  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAllowed(true);
    } catch {
      setMicAllowed(false);
      alert("Microphone permission was not granted.");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Bot size={23}/></div>
          <div>
            <div className="brand-name">AI System Assistant</div>
            <div className="brand-sub">Intelligent device companion</div>
          </div>
        </div>
        <button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X/> : <Menu/>}
        </button>
        <nav className={mobileMenu ? "nav open" : "nav"}>
          <a href="#dashboard" onClick={() => setMobileMenu(false)}>Dashboard</a>
          <a href="#chat" onClick={() => setMobileMenu(false)}>AI Chat</a>
          <a href="#permissions" onClick={() => setMobileMenu(false)}>Permissions</a>
          <a href="#android" onClick={() => setMobileMenu(false)}>Android APK</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15}/> AI-powered system assistant</div>
            <h1>Talk to your <span>system.</span></h1>
            <p>Ask natural-language questions about your device and get clear, useful system insights from one dashboard.</p>
            <div className="hero-actions">
              <a className="primary" href="#chat">Open AI Chat <ChevronRight size={18}/></a>
              <a className="secondary" href="#android"><Download size={17}/> Android APK</a>
            </div>
          </div>
          <div className="hero-orb">
            <div className="orb-core"><Bot size={48}/></div>
            <div className="orb-ring ring1"></div><div className="orb-ring ring2"></div>
            <span className="float-card fc1">RAM insight</span>
            <span className="float-card fc2">AI analysis</span>
            <span className="float-card fc3">Secure access</span>
          </div>
        </section>

        <section id="dashboard" className="section">
          <div className="section-heading">
            <div><div className="eyebrow">LIVE OVERVIEW</div><h2>System dashboard</h2></div>
            <div className={online ? "status online" : "status offline"}><span></span>{online ? "Online" : "Offline"}</div>
          </div>

          <div className="stats-grid">
            <Stat icon={<Cpu/>} title="CPU" value={`${browserStats.cores} cores`} note="Browser-visible information" />
            <Stat icon={<Database/>} title="Memory" value={browserStats.ram} note="Exact usage requires native app" />
            <Stat icon={<HardDrive/>} title="Web storage" value={storage ? `${storage.usageGB.toFixed(2)} GB` : "—"} note="Origin storage estimate" />
            <Stat icon={<Network/>} title="Network" value={online ? "Connected" : "Offline"} note="Browser connection status" />
          </div>
        </section>

        <section id="chat" className="section chat-section">
          <div className="section-heading">
            <div><div className="eyebrow">AI CONVERSATION</div><h2>Your system, explained</h2></div>
            <div className="ai-badge"><Sparkles size={15}/> AI</div>
          </div>
          <div className="chat-box">
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  <div className="avatar">{m.role === "assistant" ? <Bot size={17}/> : "You"}</div>
                  <div className="bubble">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="quick-prompts">
              {["How much RAM can you see?", "Check my storage", "Is my system online?", "What is system health?"].map(p =>
                <button key={p} onClick={() => {setInput(p); setTimeout(() => document.querySelector(".chat-input")?.focus(), 0)}}>{p}</button>
              )}
            </div>
            <div className="chat-input-row">
              <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask about your system..." />
              <button className={micAllowed ? "icon-btn active" : "icon-btn"} onClick={requestMic} title="Allow microphone"><Mic size={19}/></button>
              <button className="send" onClick={sendMessage}>Send <ChevronRight size={17}/></button>
            </div>
          </div>
        </section>

        <section id="permissions" className="section">
          <div className="section-heading"><div><div className="eyebrow">PRIVACY</div><h2>Permissions</h2></div><ShieldCheck size={27}/></div>
          <div className="permission-card">
            <Permission icon={<Mic/>} title="Microphone" desc="Used only for future voice interaction." allowed={micAllowed}/>
            <Permission icon={<Database/>} title="Browser storage" desc="Used to display this web app's storage estimate." allowed={true}/>
            <Permission icon={<ShieldCheck/>} title="Device-level monitoring" desc="Full RAM/storage monitoring is handled by the native Android app." allowed={false}/>
          </div>
        </section>

        <section id="android" className="download-section">
          <div>
            <div className="eyebrow">ANDROID APP</div>
            <h2>Take AI System Assistant with you.</h2>
            <p>The APK will provide native Android system information and deeper real-time monitoring. Add your Google Drive APK link when the first Android build is ready.</p>
          </div>
          <a className="primary disabled-link" href="#" onClick={(e) => {e.preventDefault(); alert("APK link will be added after we build the Android version.")}}><Download size={18}/> Download APK</a>
        </section>
      </main>

      <footer>
        <div><Bot size={18}/> AI System Assistant</div>
        <span>Web prototype • Native monitoring will be added in the Android app</span>
      </footer>
    </div>
  );
}

function Stat({icon, title, value, note}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div></div>;
}

function Permission({icon, title, desc, allowed}) {
  return <div className="permission-row"><div className="perm-icon">{icon}</div><div className="perm-text"><strong>{title}</strong><span>{desc}</span></div><div className={allowed ? "allowed" : "limited"}>{allowed ? <CheckCircle2 size={16}/> : <CircleHelp size={16}/>} {allowed ? "Allowed" : "Limited"}</div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
