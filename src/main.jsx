import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot, CheckCircle2, ChevronRight, CircleHelp,
  Cpu, Database, Download, HardDrive, Menu,
  Mic, Network, ShieldCheck, Sparkles, X
} from "lucide-react";
import "./styles.css";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi! I'm AI System Assistant 🤖. Ask me about RAM, storage, CPU, network, system health, browser information, or Android."
  }
];

function getBrowserStorage() {
  if (!navigator.storage?.estimate) return null;

  return navigator.storage.estimate()
    .then(({ usage = 0, quota = 0 }) => ({
      usageGB: usage / 1024 ** 3,
      quotaGB: quota / 1024 ** 3
    }))
    .catch(() => null);
}

function App() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [storage, setStorage] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [micAllowed, setMicAllowed] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setStorage(await getBrowserStorage());
    };

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
    return {
      ram: navigator.deviceMemory
        ? `${navigator.deviceMemory} GB`
        : "Restricted",

      cores: navigator.hardwareConcurrency || "Unknown",

      browser: navigator.userAgent,

      platform: navigator.platform || "Unknown",

      language: navigator.language || "Unknown"
    };
  }, []);

  const answer = (question) => {
    const text = question.toLowerCase().trim();

    // Greetings
    if (
      text === "hi" ||
      text === "hello" ||
      text === "hey" ||
      text.includes("good morning") ||
      text.includes("good evening")
    ) {
      return "Hello! 👋 I'm your AI System Assistant. I can help you understand your RAM, CPU, storage, network, browser and system status.";
    }

    // Help
    if (
      text.includes("help") ||
      text.includes("what can you do") ||
      text.includes("features")
    ) {
      return "I can currently help with RAM, CPU cores, browser information, web storage, network status, system health and Android monitoring. Try asking: “How much RAM can you see?”";
    }

    // RAM
    if (
      text.includes("ram") ||
      text.includes("memory") ||
      text.includes("device memory")
    ) {
      if (browserStats.ram === "Restricted") {
        return "Chrome does not expose your exact total RAM to this website. The Android version can use native Android APIs to provide deeper memory information.";
      }

      return `Your browser reports approximately ${browserStats.ram} of device memory. ⚡ Exact real-time RAM usage is not available to a normal webpage.`;
    }

    // CPU
    if (
      text.includes("cpu") ||
      text.includes("processor") ||
      text.includes("core")
    ) {
      return `Your browser reports ${browserStats.cores} logical CPU core(s). Chrome does not expose live CPU utilization to ordinary webpages.`;
    }

    // Storage
    if (
      text.includes("storage") ||
      text.includes("disk") ||
      text.includes("space")
    ) {
      if (!storage) {
        return "Your browser did not provide a storage estimate. The Android app can provide deeper device storage information.";
      }

      return `This website is using approximately ${storage.usageGB.toFixed(
        2
      )} GB out of a browser storage quota of about ${storage.quotaGB.toFixed(
        2
      )} GB. This is browser storage, not your complete device storage.`;
    }

    // Network
    if (
      text.includes("network") ||
      text.includes("internet") ||
      text.includes("online") ||
      text.includes("offline")
    ) {
      return online
        ? "🟢 Your browser currently reports that you are online."
        : "🔴 Your browser currently reports that you are offline.";
    }

    // System health
    if (
      text.includes("health") ||
      text.includes("status") ||
      text.includes("system check") ||
      text.includes("check my system")
    ) {
      const connection = online ? "Online 🟢" : "Offline 🔴";

      return `System overview:\n\n• Network: ${connection}\n• CPU cores: ${browserStats.cores}\n• Browser memory: ${browserStats.ram}\n• Web storage: ${
        storage ? storage.usageGB.toFixed(2) + " GB used" : "Unavailable"
      }\n\nFor complete system health analysis, the Android version will add native RAM, storage, battery and CPU information.`;
    }

    // Browser
    if (
      text.includes("browser") ||
      text.includes("chrome") ||
      text.includes("user agent")
    ) {
      return `Browser information:\n\n• Platform: ${browserStats.platform}\n• Language: ${browserStats.language}\n• Browser engine information is available through your browser's user-agent data.`;
    }

    // Battery
    if (
      text.includes("battery") ||
      text.includes("charge")
    ) {
      return "Battery information is restricted in many modern browsers. 🔋 The Android application will provide battery level and charging information using native Android APIs.";
    }

    // Android
    if (
      text.includes("android") ||
      text.includes("apk")
    ) {
      return "The Android APK will provide deeper device monitoring using Android system APIs, including information that browsers cannot normally access.";
    }

    // Permission
    if (
      text.includes("permission") ||
      text.includes("microphone") ||
      text.includes("mic")
    ) {
      return micAllowed
        ? "🎤 Microphone permission has been granted to this website."
        : "🎤 Microphone permission has not been granted yet. Use the microphone button in the chat.";
    }

    // Greeting-like questions
    if (
      text.includes("who are you") ||
      text.includes("your name")
    ) {
      return "I'm AI System Assistant 🤖 — a project designed to let users interact with their device through natural language and receive system information and assistance.";
    }

    // Default
    return `I understood your question as: "${question}"\n\nI currently specialize in device assistance. Try asking about RAM, CPU, storage, battery, network, browser information, system health, permissions, or Android.`;
  };

  const sendMessage = (messageText = input) => {
    const q = messageText.trim();

    if (!q) return;

    const response = answer(q);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: response }
    ]);

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
          <div className="brand-icon">
            <Bot size={23} />
          </div>

          <div>
            <div className="brand-name">AI System Assistant</div>
            <div className="brand-sub">
              Intelligent device companion
            </div>
          </div>
        </div>

        <button
          className="mobile-menu"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X /> : <Menu />}
        </button>

        <nav className={mobileMenu ? "nav open" : "nav"}>
          <a href="#dashboard">Dashboard</a>
          <a href="#chat">AI Chat</a>
          <a href="#permissions">Permissions</a>
          <a href="#android">Android APK</a>
        </nav>
      </header>

      <main>

        <section className="hero">
          <div className="hero-copy">

            <div className="eyebrow">
              <Sparkles size={15} />
              AI-powered system assistant
            </div>

            <h1>
              Talk to your <span>system.</span>
            </h1>

            <p>
              Ask natural-language questions about your device and get
              useful system insights from one dashboard.
            </p>

            <div className="hero-actions">
              <a className="primary" href="#chat">
                Open AI Chat
                <ChevronRight size={18} />
              </a>

              <a className="secondary" href="#android">
                <Download size={17} />
                Android APK
              </a>
            </div>

          </div>

          <div className="hero-orb">
            <div className="orb-core">
              <Bot size={48} />
            </div>

            <div className="orb-ring ring1"></div>
            <div className="orb-ring ring2"></div>

            <span className="float-card fc1">
              RAM insight
            </span>

            <span className="float-card fc2">
              AI analysis
            </span>

            <span className="float-card fc3">
              Secure access
            </span>
          </div>
        </section>

        <section id="dashboard" className="section">

          <div className="section-heading">

            <div>
              <div className="eyebrow">
                LIVE OVERVIEW
              </div>

              <h2>
                System dashboard
              </h2>
            </div>

            <div className={online ? "status online" : "status offline"}>
              <span></span>
              {online ? "Online" : "Offline"}
            </div>

          </div>

          <div className="stats-grid">

            <Stat
              icon={<Cpu />}
              title="CPU"
              value={`${browserStats.cores} cores`}
              note="Browser-visible information"
            />

            <Stat
              icon={<Database />}
              title="Memory"
              value={browserStats.ram}
              note="Exact usage requires native app"
            />

            <Stat
              icon={<HardDrive />}
              title="Web storage"
              value={
                storage
                  ? `${storage.usageGB.toFixed(2)} GB`
                  : "—"
              }
              note="Origin storage estimate"
            />

            <Stat
              icon={<Network />}
              title="Network"
              value={online ? "Connected" : "Offline"}
              note="Browser connection status"
            />

          </div>

        </section>

        <section id="chat" className="section chat-section">

          <div className="section-heading">

            <div>
              <div className="eyebrow">
                AI CONVERSATION
              </div>

              <h2>
                Your system, explained
              </h2>
            </div>

            <div className="ai-badge">
              <Sparkles size={15} />
              AI
            </div>

          </div>

          <div className="chat-box">

            <div className="messages">

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.role}`}
                >

                  <div className="avatar">
                    {message.role === "assistant"
                      ? <Bot size={17} />
                      : "You"}
                  </div>

                  <div className="bubble">
                    {message.text.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.text.split("\n").length - 1 && (
                          <br />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                </div>
              ))}

            </div>

            <div className="quick-prompts">

              {[
                "How much RAM can you see?",
                "Check my storage",
                "How many CPU cores do I have?",
                "Check my system",
                "Is my system online?",
                "What is system health?"
              ].map((prompt) => (

                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>

              ))}

            </div>

            <div className="chat-input-row">

              <input
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="Ask about your system..."
              />

              <button
                className={
                  micAllowed
                    ? "icon-btn active"
                    : "icon-btn"
                }
                onClick={requestMic}
                title="Allow microphone"
              >
                <Mic size={19} />
              </button>

              <button
                className="send"
                onClick={() => sendMessage()}
              >
                Send
                <ChevronRight size={17} />
              </button>

            </div>

          </div>

        </section>

        <section id="permissions" className="section">

          <div className="section-heading">

            <div>
              <div className="eyebrow">
                PRIVACY
              </div>

              <h2>
                Permissions
              </h2>
            </div>

            <ShieldCheck size={27} />

          </div>

          <div className="permission-card">

            <Permission
              icon={<Mic />}
              title="Microphone"
              desc="Used for future voice interaction."
              allowed={micAllowed}
            />

            <Permission
              icon={<Database />}
              title="Browser storage"
              desc="Used to display this web app's storage estimate."
              allowed={true}
            />

            <Permission
              icon={<ShieldCheck />}
              title="Device-level monitoring"
              desc="Full RAM and storage monitoring requires the native Android app."
              allowed={false}
            />

          </div>

        </section>

        <section id="android" className="download-section">

          <div>

            <div className="eyebrow">
              ANDROID APP
            </div>

            <h2>
              Take AI System Assistant with you.
            </h2>

            <p>
              The Android APK will provide native Android system
              information and deeper real-time monitoring.
            </p>

          </div>

          <a
            className="primary disabled-link"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              alert(
                "APK link will be added after we build the Android version."
              );
            }}
          >
            <Download size={18} />
            Download APK
          </a>

        </section>

      </main>

      <footer>

        <div>
          <Bot size={18} />
          AI System Assistant
        </div>

        <span>
          Web prototype • Native monitoring will be added in the Android app
        </span>

      </footer>

    </div>
  );
}

function Stat({ icon, title, value, note }) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <div className="stat-title">
          {title}
        </div>

        <div className="stat-value">
          {value}
        </div>

        <div className="stat-note">
          {note}
        </div>

      </div>

    </div>
  );
}

function Permission({
  icon,
  title,
  desc,
  allowed
}) {
  return (
    <div className="permission-row">

      <div className="perm-icon">
        {icon}
      </div>

      <div className="perm-text">

        <strong>
          {title}
        </strong>

        <span>
          {desc}
        </span>

      </div>

      <div
        className={
          allowed
            ? "allowed"
            : "limited"
        }
      >
        {allowed
          ? <CheckCircle2 size={16} />
          : <CircleHelp size={16} />}

        {allowed
          ? "Allowed"
          : "Limited"}
      </div>

    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <App />
);