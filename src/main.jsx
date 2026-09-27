import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BatteryCharging,
  Bell,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Copy,
  Clock3,
  Cpu,
  Database,
  Download,
  Gauge,
  Globe,
  HardDrive,
  Laptop,
  MapPin,
  Menu,
  Mic,
  Network,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { model } from "./firebase";
import "./styles.css";

const initialMessages = [
  {
    role: "assistant",
    text:
      "Hi! I'm AI System Assistant 🤖. Ask me anything — general questions, coding, technology, or questions about your device.",
  },
];

const statusLabel = (value) => {
  if (value === "granted" || value === "Allowed") return "Allowed";
  if (value === "denied" || value === "Denied") return "Denied";
  if (value === "Unsupported") return "Unsupported";
  if (value === "default") return "Not requested";
  return value || "Checking…";
};

function getBrowserStorage() {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => ({
    usageGB: usage / 1024 ** 3,
    quotaGB: quota / 1024 ** 3,
  })).catch(() => null);
}

function App() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [storage, setStorage] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [battery, setBattery] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);
  const weatherRef = useRef(null);
  const [batterySupported, setBatterySupported] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Not requested");
  const [locationStatus, setLocationStatus] = useState("Not requested");
  const [notificationStatus, setNotificationStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "Unsupported"
  );
  const [clipboardStatus, setClipboardStatus] = useState("Checking…");
  const [isThinking, setIsThinking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [showPermissionScreen, setShowPermissionScreen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);

  const browserStats = useMemo(() => ({
    ram: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Restricted",
    cores: navigator.hardwareConcurrency || "Unknown",
    browser: navigator.userAgentData?.brands?.map((x) => `${x.brand} ${x.version}`).join(", ") || navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || "Unknown",
    language: navigator.language || "Unknown",
    screen: `${window.screen?.width || "?"} × ${window.screen?.height || "?"}`,
  }), []);

  useEffect(() => {
    const refreshStorage = async () => setStorage(await getBrowserStorage());
    refreshStorage();
    const timer = setInterval(refreshStorage, 5000);
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

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    setClipboardStatus(navigator.clipboard && window.isSecureContext ? "Available" : "Restricted");

    let mounted = true;
    let batteryManager = null;

    const attachBattery = async () => {
      if (!navigator.getBattery) return;
      try {
        batteryManager = await navigator.getBattery();
        if (!mounted) return;
        setBatterySupported(true);
        const updateBattery = () => setBattery({
          level: Math.round(batteryManager.level * 100),
          charging: batteryManager.charging,
          chargingTime: batteryManager.chargingTime,
          dischargingTime: batteryManager.dischargingTime,
        });
        updateBattery();
        batteryManager.addEventListener("levelchange", updateBattery);
        batteryManager.addEventListener("chargingchange", updateBattery);
        batteryManager.addEventListener("chargingtimechange", updateBattery);
        batteryManager.addEventListener("dischargingtimechange", updateBattery);
      } catch (error) {
        console.log("Battery API unavailable", error);
      }
    };

    attachBattery();
    return () => {
      mounted = false;
      if (batteryManager) {
        batteryManager.removeEventListener("levelchange", updateBattery);
        batteryManager.removeEventListener("chargingchange", updateBattery);
        batteryManager.removeEventListener("chargingtimechange", updateBattery);
        batteryManager.removeEventListener("dischargingtimechange", updateBattery);
      }
    };
  }, []);

  const requestMic = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicAllowed(false);
        return "Unsupported";
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicAllowed(true);
      return "Allowed";
    } catch (error) {
      console.error("Microphone permission error:", error);
      setMicAllowed(false);
      return error?.name === "NotAllowedError" ? "Denied" : "Unavailable";
    }
  };

  const requestCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return "Unsupported";
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("Allowed");
      return "Allowed";
    } catch (error) {
      console.log("Camera permission:", error);
      setCameraStatus(error?.name === "NotAllowedError" ? "Denied" : "Unavailable");
      return "Denied";
    }
  };

  const fetchWeather = async (latitude, longitude) => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather request failed");
      const data = await response.json();
      const current = data.current;
      const normalized = {
        temperature: current.temperature_2m,
        apparent: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        wind: current.wind_speed_10m,
        code: current.weather_code,
        time: current.time,
        timezone: data.timezone,
      };
      weatherRef.current = normalized;
      setWeather(normalized);
      return { ...current, timezone: data.timezone };
    } catch (error) {
      console.error("Weather error:", error);
      setWeatherError("Current weather could not be loaded.");
      return null;
    } finally {
      setWeatherLoading(false);
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationStatus("Unsupported");
      return "Unsupported";
    }
    return new Promise((resolve) => {
      let finished = false;
      const finish = (value) => {
        if (finished) return;
        finished = true;
        setLocationStatus(value);
        resolve(value);
      };
      const timeout = setTimeout(() => finish("Timed out"), 9000);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeout);
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setLocationCoords(coords);
          await fetchWeather(coords.latitude, coords.longitude);
          finish("Allowed");
        },
        (error) => {
          clearTimeout(timeout);
          finish(error.code === 1 ? "Denied" : "Unavailable");
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined" || !Notification.requestPermission) {
      setNotificationStatus("Unsupported");
      return "Unsupported";
    }
    try {
      const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise((resolve) => setTimeout(() => resolve(Notification.permission), 2000)),
      ]);
      setNotificationStatus(permission);
      return permission;
    } catch {
      setNotificationStatus("Unavailable");
      return "Unavailable";
    }
  };

  const requestAllSupportedPermissions = async () => {
    setIsStarting(true);
    await requestMic();
    await requestNotifications();
    await requestCamera();
    await requestLocation();
    setIsStarting(false);
  };

  const startAssistant = async () => {
    await requestAllSupportedPermissions();
    setShowPermissionScreen(false);
  };

  const weatherDescription = (code) => {
    const map = {
      0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
      45: "fog", 48: "depositing rime fog", 51: "light drizzle", 53: "moderate drizzle",
      55: "dense drizzle", 56: "light freezing drizzle", 57: "dense freezing drizzle",
      61: "slight rain", 63: "moderate rain", 65: "heavy rain", 66: "light freezing rain",
      67: "heavy freezing rain", 71: "slight snow", 73: "moderate snow", 75: "heavy snow",
      77: "snow grains", 80: "slight rain showers", 81: "moderate rain showers",
      82: "violent rain showers", 85: "slight snow showers", 86: "heavy snow showers",
      95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail",
    };
    return map[code] || "current conditions";
  };

  const buildSystemContext = () => {
    const currentWeather = weatherRef.current;
    return `
You are AI System Assistant, a polished general-purpose AI assistant inside a futuristic web app.
Answer naturally like a professional ChatGPT-style assistant. Be accurate, useful, concise when possible, and use clean readable Markdown.
Never output decorative separator strings such as ###----, ---====, repeated hashes, or ASCII-art dividers. Use normal headings, bullets, numbered lists, and code blocks only when helpful.
If the user asks about current weather, use the CURRENT WEATHER DATA below when present. Do not claim you know live weather from your own knowledge.

Browser-accessible device context:
- Network: ${online ? "Online" : "Offline"}
- Logical CPU cores: ${browserStats.cores}
- Device memory class: ${browserStats.ram}
- Platform: ${browserStats.platform}
- Browser language: ${browserStats.language}
- Screen: ${browserStats.screen}
- Browser storage usage: ${storage ? `${storage.usageGB.toFixed(2)} GB` : "Unavailable"}
- Browser storage quota: ${storage ? `${storage.quotaGB.toFixed(2)} GB` : "Unavailable"}
- Battery: ${battery ? `${battery.level}%${battery.charging ? " and charging" : ""}` : "Unavailable in this browser"}
- Location permission: ${locationStatus}
${currentWeather ? `- CURRENT WEATHER DATA: ${currentWeather.temperature}°C, feels like ${currentWeather.apparent}°C, ${weatherDescription(currentWeather.code)}, humidity ${currentWeather.humidity}%, wind ${currentWeather.wind} km/h, local time ${currentWeather.time}, timezone ${currentWeather.timezone}` : "- CURRENT WEATHER DATA: Not available"}

Never invent CPU utilization, total RAM usage, physical disk capacity/free space, battery health, battery cycle count, temperatures, fan speed, or background-process data. Normal browser APIs do not expose those unrestricted Windows metrics. If asked, clearly explain the browser limitation and what a native Windows/Android companion could provide.
`;
  };

  const askGemini = async (question) => {
    const wantsWeather = /\b(weather|temperature|rain|raining|forecast|climate)\b/i.test(question);
    if (wantsWeather && !weatherRef.current && locationStatus !== "Denied") {
      if (locationCoords) {
        await fetchWeather(locationCoords.latitude, locationCoords.longitude);
      } else {
        await requestLocation();
      }
    }
    const recentConversation = messages.slice(-12).map((message) =>
      `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`
    ).join("\n");
    const prompt = `${buildSystemContext()}\nPrevious conversation:\n${recentConversation}\n\nCurrent user question:\n${question}\n\nIf the user asks for weather and current weather data is unavailable, say that location permission is needed to fetch live weather, rather than guessing. Answer the user directly.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  };

  useEffect(() => {
    if (!voiceOutput && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [voiceOutput]);

  useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!chatOpen || !chatScrollRef.current) return;
    requestAnimationFrame(() => {
      const el = chatScrollRef.current;
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, isThinking, chatOpen]);

  const cleanForSpeech = (text) => text
    .replace(/```[\s\S]*?```/g, "Code omitted from voice reply.")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\n{2,}/g, ". ")
    .trim();

  const speakResponse = (text) => {
    if (!voiceOutput || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (messageText = input) => {
    const question = messageText.trim();
    if (!question || isThinking) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setIsThinking(true);
    try {
      const response = await askGemini(question);
      const finalResponse = response || "I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: "assistant", text: finalResponse }]);
      speakResponse(finalResponse);
    } catch (error) {
      console.error("Gemini error:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "I couldn't reach Gemini right now. Please check your connection and Firebase AI Logic configuration." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const startVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported by this browser. Please use the latest Google Chrome or Microsoft Edge.");
      return;
    }
    if (isThinking) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    const mic = await requestMic();
    if (mic !== "Allowed") {
      alert("Microphone access is required for voice input. Please allow the microphone for this site in the browser address-bar permissions.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) setInput(transcript);
      if (event.results?.[event.results.length - 1]?.isFinal && transcript) {
        sendMessage(transcript);
      }
    };
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicAllowed(false);
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const openChat = (prompt = "") => {
    setChatOpen(true);
    if (prompt) setTimeout(() => sendMessage(prompt), 0);
  };

  const formatMessage = (text, role) => {
    if (role === "user") return <span>{text}</span>;
    const lines = text.replace(/\r/g, "").split("\n");
    const blocks = [];
    let code = null;
    let list = [];
    const flushList = () => {
      if (!list.length) return;
      blocks.push(<ul className="v2-md-list" key={`list-${blocks.length}`}>{list.map((item, i) => <li key={i}>{inlineMarkdown(item)}</li>)}</ul>);
      list = [];
    };
    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) {
        if (code !== null) {
          blocks.push(<pre className="v2-code" key={`code-${index}`}><code>{code.trim()}</code></pre>);
          code = null;
        } else code = "";
        return;
      }
      if (code !== null) { code += `${line}\n`; return; }
      const clean = line.replace(/^#{1,6}\s+/, "").replace(/^[-*_]{3,}\s*$/, "").trim();
      if (!clean) { flushList(); return; }
      const bullet = clean.match(/^[-*+]\s+(.+)/);
      const numbered = clean.match(/^\d+[.)]\s+(.+)/);
      if (bullet || numbered) { list.push((bullet || numbered)[1]); return; }
      flushList();
      if (/^#{1,6}\s+/.test(line)) blocks.push(<h4 className="v2-md-heading" key={index}>{inlineMarkdown(clean)}</h4>);
      else blocks.push(<p className="v2-md-p" key={index}>{inlineMarkdown(clean)}</p>);
    });
    flushList();
    if (code !== null) blocks.push(<pre className="v2-code" key="code-end"><code>{code.trim()}</code></pre>);
    return blocks;
  };

  const inlineMarkdown = (value) => {
    const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (/^`[^`]+`$/.test(part)) return <code className="v2-inline-code" key={index}>{part.slice(1, -1)}</code>;
      return part;
    });
  };


  const batteryText = batterySupported ? (battery ? `${battery.level}%` : "Reading…") : "Unavailable";
  const chargingText = battery ? (battery.charging ? "Charging" : "On battery") : "Browser unavailable";
  const storageText = storage ? `${storage.usageGB.toFixed(2)} GB / ${storage.quotaGB.toFixed(2)} GB` : "Unavailable";

  return (
    <div className="assistant-v2">
      <style>{`
        *{box-sizing:border-box}.assistant-v2{min-height:100vh;color:#eef3ff;background:#070b14;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}.assistant-v2 button,.assistant-v2 input{font:inherit}.assistant-v2 a{text-decoration:none;color:inherit}
        .v2-bg{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 20% 0%,rgba(61,122,255,.16),transparent 34%),radial-gradient(circle at 90% 20%,rgba(128,75,255,.13),transparent 32%),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:auto,auto,40px 40px,40px 40px;z-index:0}.v2-shell{position:relative;z-index:1;max-width:1400px;margin:auto;padding:0 28px}.v2-topbar{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);backdrop-filter:blur(18px);position:sticky;top:0;background:rgba(7,11,20,.78);z-index:30}.v2-brand{display:flex;gap:12px;align-items:center}.v2-logo{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#2997ff,#725cff);box-shadow:0 10px 35px rgba(50,120,255,.3);animation:v2pulse 4s infinite}.v2-brand strong{font-size:15px}.v2-brand small{display:block;color:#7e8aa4;font-size:11px;margin-top:2px}.v2-nav{display:flex;gap:6px;align-items:center}.v2-nav button{border:0;background:transparent;color:#8995ad;padding:10px 14px;border-radius:10px;cursor:pointer}.v2-nav button:hover,.v2-nav button.active{background:rgba(255,255,255,.06);color:#fff}.v2-menu{display:none;background:transparent;border:0;color:white}.v2-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:50px;align-items:center;min-height:530px;padding:70px 0}.v2-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#73aaff;text-transform:uppercase;letter-spacing:1.8px;font-size:11px;font-weight:800}.v2-hero h1{font-size:clamp(44px,6vw,78px);line-height:.98;margin:18px 0;background:linear-gradient(120deg,#fff 15%,#83b6ff 55%,#a184ff);-webkit-background-clip:text;color:transparent;letter-spacing:-3px}.v2-hero p{max-width:680px;color:#8e9bb5;font-size:17px;line-height:1.7}.v2-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.v2-primary,.v2-secondary{display:inline-flex;align-items:center;gap:8px;border-radius:13px;padding:13px 18px;border:1px solid rgba(255,255,255,.1);cursor:pointer}.v2-primary{background:linear-gradient(135deg,#258dff,#705cff);color:white;box-shadow:0 14px 35px rgba(45,113,255,.22)}.v2-secondary{background:rgba(255,255,255,.04);color:#c4cee2}.v2-orb{min-height:390px;display:grid;place-items:center;position:relative}.v2-core{width:155px;height:155px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#4c9cff,#684cff 65%,#18233f);box-shadow:0 0 80px rgba(72,128,255,.35);animation:v2float 4s ease-in-out infinite}.v2-core svg{filter:drop-shadow(0 5px 15px rgba(255,255,255,.3))}.v2-ring{position:absolute;border:1px solid rgba(101,157,255,.22);border-radius:50%;animation:v2spin 18s linear infinite}.v2-ring.r1{width:250px;height:250px}.v2-ring.r2{width:350px;height:350px;animation-direction:reverse;animation-duration:25s}.v2-float{position:absolute;padding:9px 13px;border-radius:12px;background:rgba(16,23,40,.82);border:1px solid rgba(130,170,255,.16);color:#a8b7d2;font-size:11px;backdrop-filter:blur(12px);animation:v2float 5s ease-in-out infinite}.v2-f1{top:25px;right:8%}.v2-f2{bottom:55px;left:3%;animation-delay:1s}.v2-f3{top:48%;right:0;animation-delay:2s}.v2-section{padding:70px 0}.v2-heading{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}.v2-heading h2{margin:5px 0 0;font-size:31px;letter-spacing:-1px}.v2-muted{color:#75829b}.v2-live{display:inline-flex;align-items:center;gap:7px;color:#79e6a7;font-size:12px}.v2-live i{width:7px;height:7px;border-radius:50%;background:#5de49a;box-shadow:0 0 12px #5de49a}.v2-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.v2-card{padding:21px;border:1px solid rgba(255,255,255,.08);border-radius:19px;background:linear-gradient(145deg,rgba(19,28,48,.9),rgba(12,17,30,.8));box-shadow:0 20px 50px rgba(0,0,0,.15);transition:.25s;position:relative;overflow:hidden}.v2-card:hover{transform:translateY(-4px);border-color:rgba(115,165,255,.25)}.v2-card:before{content:"";position:absolute;inset:-80px auto auto -40px;width:120px;height:120px;background:rgba(64,132,255,.11);filter:blur(30px);border-radius:50%}.v2-card-top{display:flex;justify-content:space-between;align-items:center;color:#7eaaff}.v2-card-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(74,135,255,.11)}.v2-card-label{color:#7f8ca5;font-size:12px}.v2-card-value{font-size:24px;font-weight:800;margin-top:16px}.v2-card-note{font-size:11px;color:#64718a;margin-top:6px}.v2-progress{height:5px;background:#1b2538;border-radius:999px;margin-top:14px;overflow:hidden}.v2-progress span{display:block;height:100%;background:linear-gradient(90deg,#3d9aff,#785dff);border-radius:inherit}.v2-system-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-top:16px}.v2-panel{border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(13,19,32,.82);padding:22px}.v2-panel h3{margin:0 0 18px;font-size:16px}.v2-info-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v2-info{padding:13px;border-radius:13px;background:rgba(255,255,255,.035)}.v2-info small{display:block;color:#69768e;font-size:10px;text-transform:uppercase;letter-spacing:.8px}.v2-info strong{display:block;margin-top:5px;font-size:13px;word-break:break-word}.v2-health{display:flex;align-items:center;gap:16px}.v2-health-ring{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#49d991 ${battery?.level || 0}%,#1c2638 0);position:relative}.v2-health-ring:after{content:"";position:absolute;inset:8px;border-radius:50%;background:#0d1320}.v2-health-ring strong{position:relative;z-index:1;font-size:17px}.v2-health-copy strong{font-size:14px}.v2-health-copy p{font-size:11px;color:#6e7b92;line-height:1.5;margin:5px 0 0}.v2-chat-preview{border:1px solid rgba(255,255,255,.08);border-radius:22px;background:linear-gradient(145deg,rgba(18,26,44,.95),rgba(9,14,24,.96));overflow:hidden}.v2-chat-head{display:flex;align-items:center;justify-content:space-between;padding:16px 19px;border-bottom:1px solid rgba(255,255,255,.07)}.v2-chat-title{display:flex;align-items:center;gap:10px}.v2-chat-avatar{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#288fff,#7659ff)}.v2-chat-head small{display:block;color:#6f7d96;font-size:10px;margin-top:2px}.v2-preview-messages{height:350px;padding:20px;overflow:hidden}.v2-preview-msg{max-width:78%;padding:13px 15px;border-radius:16px;margin-bottom:13px;font-size:13px;line-height:1.6;color:#ccd6e9;background:#131d31;border:1px solid rgba(255,255,255,.06)}.v2-preview-msg.user{margin-left:auto;background:linear-gradient(135deg,#237ddd,#554fe0);color:#fff}.v2-open-chat{margin:0 20px 20px;width:calc(100% - 40px);height:48px;border:0;border-radius:13px;background:linear-gradient(135deg,#278eff,#6b5cff);color:white;font-weight:750;cursor:pointer}.v2-permissions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.v2-perm{display:flex;align-items:center;gap:13px;padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(255,255,255,.025)}.v2-perm-icon{width:40px;height:40px;border-radius:12px;background:rgba(74,132,255,.1);display:grid;place-items:center;color:#81aeff}.v2-perm-body{flex:1}.v2-perm-body strong{display:block;font-size:13px}.v2-perm-body span{display:block;color:#68768e;font-size:11px;margin-top:3px}.v2-perm-status{font-size:10px;font-weight:800;color:#6ee6a3;white-space:nowrap}.v2-download{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:28px;border:1px solid rgba(115,164,255,.15);border-radius:22px;background:linear-gradient(120deg,rgba(32,65,120,.28),rgba(46,29,92,.22))}.v2-download h2{margin:0 0 7px}.v2-download p{margin:0;color:#7f8ca5;font-size:13px}.v2-footer{padding:30px 0 45px;color:#5e6b83;border-top:1px solid rgba(255,255,255,.07);display:flex;justify-content:space-between;font-size:11px}.v2-overlay{position:fixed;inset:0;z-index:1000;background:rgba(3,6,12,.94);backdrop-filter:blur(18px);display:flex;animation:v2fade .2s ease}.v2-chat-app{width:100%;height:100%;display:grid;grid-template-columns:260px 1fr}.v2-chat-side{border-right:1px solid rgba(255,255,255,.07);background:#090e18;padding:16px;display:flex;flex-direction:column}.v2-chat-side-logo{display:flex;align-items:center;gap:9px;padding:8px;margin-bottom:20px}.v2-newchat{height:44px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.04);color:#d7e1f3;display:flex;align-items:center;gap:8px;padding:0 12px;cursor:pointer}.v2-side-label{color:#536078;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;margin:24px 9px 8px}.v2-side-item{padding:10px 11px;border-radius:10px;color:#78859c;font-size:12px;cursor:pointer}.v2-side-item.active,.v2-side-item:hover{background:rgba(255,255,255,.05);color:#e8efff}.v2-chat-main{min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;background:#0b101b}.v2-chatbar{height:65px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid rgba(255,255,255,.07)}.v2-model{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:750}.v2-model-dot{width:8px;height:8px;border-radius:50%;background:#65e39b;box-shadow:0 0 10px #65e39b}.v2-chat-controls{display:flex;gap:7px}.v2-icon-btn{width:38px;height:38px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.035);color:#a4b1c9;display:grid;place-items:center;cursor:pointer}.v2-icon-btn:hover{background:rgba(255,255,255,.07);color:white}.v2-chat-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:34px max(24px,calc((100vw - 850px)/2));scroll-behavior:smooth}.v2-message{display:flex;gap:13px;margin-bottom:28px;animation:v2slide .3s ease}.v2-message.user{flex-direction:row-reverse}.v2-message-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:11px;display:grid;place-items:center;background:#18243a;color:#89b6ff}.v2-message.user .v2-message-avatar{background:linear-gradient(135deg,#258fff,#685bff);color:white;font-size:10px;font-weight:800}.v2-message-content{position:relative;max-width:min(820px,82%);font-size:14px;line-height:1.75;color:#d5deed}.v2-message-content p{margin:0 0 9px}.v2-message-content p:last-child{margin-bottom:0}.v2-md-heading{font-size:16px;line-height:1.35;margin:4px 0 10px;color:#f4f7ff}.v2-md-list{margin:5px 0 12px;padding-left:22px}.v2-md-list li{margin:5px 0}.v2-inline-code{padding:2px 6px;border-radius:6px;background:rgba(120,160,255,.12);color:#a9c8ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.v2-code{margin:10px 0;padding:13px 14px;overflow:auto;border-radius:11px;background:#070b13;border:1px solid rgba(255,255,255,.08);color:#c9dcff;font-size:12px;line-height:1.6}.v2-copy{position:absolute;right:0;top:-4px;width:28px;height:28px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.04);color:#6f7d95;display:grid;place-items:center;cursor:pointer;opacity:.35;transition:.2s}.v2-message-content:hover .v2-copy{opacity:1}.v2-message.user .v2-message-content{background:linear-gradient(135deg,#1d67bd,#4d46c8);padding:11px 15px;border-radius:17px 5px 17px 17px;color:#fff}.v2-typing{display:flex;gap:5px;padding:12px 0}.v2-typing span{width:6px;height:6px;border-radius:50%;background:#7faeff;animation:v2dot 1s infinite}.v2-typing span:nth-child(2){animation-delay:.15s}.v2-typing span:nth-child(3){animation-delay:.3s}.v2-chat-composer{padding:15px max(24px,calc((100vw - 850px)/2)) 22px;background:linear-gradient(transparent,#0b101b 20%)}.v2-composer-box{display:flex;align-items:end;gap:8px;padding:8px;border:1px solid rgba(133,164,221,.18);border-radius:17px;background:#101827;box-shadow:0 15px 40px rgba(0,0,0,.25)}.v2-composer-box textarea{flex:1;min-height:42px;max-height:150px;resize:none;border:0;outline:0;background:transparent;color:#eaf1ff;padding:10px 8px;font-size:14px}.v2-composer-box textarea::placeholder{color:#56637b}.v2-mic{position:relative}.v2-mic.listening{color:#ff6d8d;border-color:rgba(255,109,141,.4);animation:v2mic 1s infinite}.v2-send{width:42px;height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,#278fff,#6d5cff);color:white;display:grid;place-items:center;cursor:pointer}.v2-send:disabled{opacity:.45}.v2-composer-hint{text-align:center;color:#536078;font-size:10px;margin-top:8px}.v2-startup{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:22px;background:rgba(2,5,12,.94);backdrop-filter:blur(25px);animation:v2fade .25s ease}.v2-start-card{width:min(850px,100%);max-height:92vh;overflow:auto;padding:35px;border:1px solid rgba(122,168,255,.2);border-radius:28px;background:linear-gradient(145deg,rgba(17,25,44,.98),rgba(8,13,24,.98));box-shadow:0 40px 120px rgba(0,0,0,.55)}.v2-start-head{text-align:center}.v2-start-logo{width:72px;height:72px;margin:0 auto 16px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg,#258fff,#735cff);box-shadow:0 15px 50px rgba(48,122,255,.3);animation:v2float 4s infinite}.v2-start-card h2{font-size:34px;margin:0}.v2-start-card>p{color:#8390a8;text-align:center;line-height:1.6;max-width:650px;margin:12px auto 28px}.v2-start-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v2-start-perm{display:flex;align-items:center;gap:12px;padding:14px;border-radius:15px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}.v2-start-perm-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(77,135,255,.1);color:#84afff}.v2-start-perm-body{flex:1}.v2-start-perm-body strong{display:block;font-size:12px}.v2-start-perm-body span{display:block;color:#69758b;font-size:10px;margin-top:3px;line-height:1.4}.v2-start-status{font-size:9px;font-weight:800;color:#6fe5a3}.v2-start-note{margin-top:16px;padding:13px 15px;border-radius:14px;background:rgba(255,190,80,.05);border:1px solid rgba(255,190,80,.08);color:#8b96aa;font-size:10px;line-height:1.6}.v2-start-note strong{color:#ffc76a}.v2-start-actions{display:flex;gap:10px;margin-top:20px}.v2-start-actions button{flex:1;height:48px;border-radius:13px;border:1px solid rgba(255,255,255,.08);cursor:pointer}.v2-start-main{background:linear-gradient(135deg,#278fff,#6d5cff);color:white;border:0!important;font-weight:800}.v2-start-limited{background:rgba(255,255,255,.03);color:#9aa7bd}.v2-battery-line{display:flex;align-items:center;gap:8px;color:#71e5a3;font-size:11px}.v2-unavailable{color:#e0a55f!important}.v2-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.05);color:#8794ac;font-size:10px}.v2-perm-action{border:1px solid rgba(110,157,255,.2);background:rgba(65,125,255,.07);color:#8cb6ff;border-radius:9px;padding:7px 9px;font-size:10px;cursor:pointer}.v2-perm-action:hover{background:rgba(65,125,255,.13)}
        @keyframes v2float{50%{transform:translateY(-9px)}}@keyframes v2spin{to{transform:rotate(360deg)}}@keyframes v2pulse{50%{box-shadow:0 0 0 10px rgba(72,128,255,0)}}@keyframes v2fade{from{opacity:0}}@keyframes v2slide{from{opacity:0;transform:translateY(7px)}}@keyframes v2dot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}@keyframes v2mic{50%{box-shadow:0 0 0 8px rgba(255,109,141,.08)}}
        @media(max-width:1000px){.v2-grid{grid-template-columns:1fr 1fr}.v2-system-grid{grid-template-columns:1fr}.v2-hero{grid-template-columns:1fr}.v2-orb{display:none}.v2-chat-app{grid-template-columns:220px 1fr}}
        @media(max-width:720px){.v2-shell{padding:0 15px}.v2-nav{display:none}.v2-menu{display:block}.v2-hero{padding:50px 0}.v2-grid,.v2-permissions,.v2-start-grid{grid-template-columns:1fr}.v2-heading{align-items:start;flex-direction:column}.v2-info-list{grid-template-columns:1fr}.v2-download{flex-direction:column;align-items:start}.v2-chat-app{grid-template-columns:1fr}.v2-chat-side{display:none}.v2-chat-scroll{padding:24px 15px}.v2-chat-composer{padding:12px 12px 18px}.v2-start-card{padding:24px 17px}.v2-start-card h2{font-size:27px}.v2-start-actions{flex-direction:column}.v2-hero h1{letter-spacing:-2px}}
      `}</style>


      <style>{`
        .assistant-v2{
          background:
            radial-gradient(circle at 50% 8%,rgba(43,199,255,.10),transparent 22%),
            radial-gradient(circle at 8% 45%,rgba(75,93,255,.08),transparent 28%),
            radial-gradient(circle at 92% 72%,rgba(161,76,255,.08),transparent 25%),
            #030711 !important;
        }
        .v2-bg{
          background:
            radial-gradient(circle at 50% 45%,rgba(61,169,255,.10),transparent 25%),
            radial-gradient(circle at 85% 10%,rgba(133,76,255,.12),transparent 28%),
            linear-gradient(rgba(86,196,255,.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(86,196,255,.025) 1px,transparent 1px) !important;
          background-size:auto,auto,42px 42px,42px 42px !important;
          animation:v2bgdrift 18s linear infinite;
        }
        .v2-bg:before,.v2-bg:after{
          content:"";position:absolute;inset:-20%;pointer-events:none;
          background:radial-gradient(circle,rgba(77,227,255,.13) 0 1px,transparent 1.5px);
          background-size:58px 58px;opacity:.20;animation:v2particles 24s linear infinite;
        }
        .v2-bg:after{background-size:91px 91px;opacity:.12;animation-duration:34s;animation-direction:reverse}
        .v2-topbar{box-shadow:0 10px 50px rgba(0,0,0,.18),inset 0 -1px 0 rgba(91,215,255,.05)}
        .v2-logo{position:relative;overflow:visible;box-shadow:0 0 24px rgba(48,145,255,.32),inset 0 0 18px rgba(104,207,255,.13) !important}
        .v2-logo:after{content:"";position:absolute;inset:-5px;border:1px solid rgba(78,220,255,.20);border-radius:17px;animation:v2halo 2.8s ease-in-out infinite}
        .v2-hero{position:relative}
        .v2-hero:before{content:"";position:absolute;left:-20%;right:-20%;bottom:4%;height:1px;background:linear-gradient(90deg,transparent,rgba(70,226,255,.22),transparent);box-shadow:0 0 25px rgba(70,226,255,.16);}
        .v2-hero h1{text-shadow:0 0 35px rgba(90,154,255,.08)}
        .v2-orb{filter:drop-shadow(0 0 40px rgba(49,184,255,.10))}
        .v2-core{position:relative;border-color:rgba(100,230,255,.55) !important;box-shadow:0 0 35px rgba(67,207,255,.28),0 0 110px rgba(79,92,255,.18),inset 0 0 35px rgba(70,205,255,.18) !important}
        .v2-core:before{content:"";position:absolute;inset:-24px;border:1px dashed rgba(79,217,255,.18);border-radius:50%;animation:v2spinFast 12s linear infinite}
        .v2-core:after{content:"";position:absolute;inset:9px;border:1px solid rgba(142,104,255,.15);border-radius:50%;animation:v2spinFast 7s linear infinite reverse}
        .v2-ring{box-shadow:0 0 18px rgba(75,204,255,.06);border-style:dashed}
        .v2-float{box-shadow:0 0 25px rgba(49,153,255,.09),inset 0 0 15px rgba(75,205,255,.03) !important}
        .v2-card,.v2-panel,.v2-chat-preview,.v2-perm,.v2-download{
          box-shadow:0 18px 55px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.025),inset 0 0 30px rgba(65,156,255,.018) !important;
        }
        .v2-card:hover{transform:translateY(-6px) scale(1.012) !important;box-shadow:0 25px 70px rgba(0,0,0,.28),0 0 28px rgba(61,157,255,.07) !important}
        .v2-card:after,.v2-panel:after{content:"";position:absolute;left:-30%;right:-30%;height:1px;top:0;background:linear-gradient(90deg,transparent,rgba(81,222,255,.24),transparent);animation:v2scan 5s ease-in-out infinite}
        .v2-card{isolation:isolate}
        .v2-card > *{position:relative;z-index:1}
        .v2-live i{animation:v2blink 1.5s infinite}
        .v2-chat-preview{position:relative}
        .v2-chat-preview:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(transparent 0%,rgba(85,221,255,.018) 50%,transparent 100%);background-size:100% 12px;animation:v2scanDown 6s linear infinite}
        .v2-chat-avatar,.v2-chat-side-logo .v2-logo{box-shadow:0 0 24px rgba(65,176,255,.22) !important}
        .v2-message{animation:v2messageIn .35s cubic-bezier(.2,.8,.2,1)}
        .v2-message.user .v2-message-content{box-shadow:0 8px 30px rgba(54,83,206,.15)}
        .v2-composer-box{box-shadow:0 0 0 1px rgba(74,171,255,.025),0 18px 60px rgba(0,0,0,.30),inset 0 0 25px rgba(65,157,255,.025) !important}
        .v2-composer-box:focus-within{border-color:rgba(73,215,255,.32);box-shadow:0 0 35px rgba(52,196,255,.08),inset 0 0 25px rgba(65,157,255,.04) !important}
        .v2-send{box-shadow:0 0 22px rgba(67,151,255,.22);transition:.2s}
        .v2-send:hover:not(:disabled){transform:translateY(-2px) scale(1.04);box-shadow:0 0 30px rgba(67,193,255,.30)}
        .v2-mic.listening{box-shadow:0 0 0 8px rgba(73,227,255,.07),0 0 25px rgba(73,227,255,.16);color:#69ecff !important}
        .v2-startup{background:radial-gradient(circle at 50% 45%,rgba(40,151,255,.08),rgba(2,6,14,.96) 52%),rgba(3,6,12,.96) !important}
        .v2-start-card{position:relative;overflow:hidden;box-shadow:0 45px 130px rgba(0,0,0,.70),0 0 60px rgba(48,148,255,.08),inset 0 1px 0 rgba(255,255,255,.035) !important}
        .v2-start-card:before{content:"";position:absolute;left:0;right:0;top:-1px;height:1px;background:linear-gradient(90deg,transparent,#5beaff,transparent);box-shadow:0 0 20px #5beaff;animation:v2scan 4s ease-in-out infinite}
        .v2-start-logo{box-shadow:0 0 45px rgba(61,157,255,.28) !important}
        .v2-start-perm{transition:.2s}
        .v2-start-perm:hover{transform:translateY(-2px);border-color:rgba(77,220,255,.20);background:rgba(75,176,255,.035)}
        @keyframes v2bgdrift{to{background-position:0 0,0 0,42px 42px,-42px -42px}}
        @keyframes v2particles{to{transform:translate3d(58px,58px,0)}}
        @keyframes v2halo{50%{transform:scale(1.10);opacity:.15}}
        @keyframes v2spinFast{to{transform:rotate(360deg)}}
        @keyframes v2scan{0%,100%{transform:translateX(-35%);opacity:0}25%,75%{opacity:1}50%{transform:translateX(35%)}}
        @keyframes v2scanDown{to{transform:translateY(100%)}}
        @keyframes v2blink{50%{opacity:.35;box-shadow:0 0 5px transparent}}
        @keyframes v2messageIn{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
      `}</style>

      <div className="v2-bg" />

      <header className="v2-topbar">
        <div className="v2-shell" style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div className="v2-brand">
            <div className="v2-logo"><Bot size={23}/></div>
            <div><strong>AI System Assistant</strong><small>Intelligent device companion</small></div>
          </div>
          <button className="v2-menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
          <nav className={`v2-nav ${mobileMenu ? "open" : ""}`}>
            {["dashboard","chat","permissions","android"].map((page) => (
              <button key={page} className={activePage===page?"active":""} onClick={() => {setActivePage(page);setMobileMenu(false); if(page==="chat") setChatOpen(true);}}>
                {page === "dashboard" ? "Dashboard" : page === "chat" ? "AI Chat" : page === "permissions" ? "Permissions" : "Android APK"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="v2-shell">
        <section className="v2-hero">
          <div>
            <div className="v2-eyebrow"><Sparkles size={14}/> AI-powered personal assistant</div>
            <h1>Your system.<br/>Your AI.</h1>
            <p>Chat naturally with Gemini, use your microphone, see browser-accessible device information, monitor battery status when the browser exposes it, and prepare for native Android/desktop system monitoring.</p>
            <div className="v2-actions">
              <button className="v2-primary" onClick={() => openChat()}>Open AI Chat <ChevronRight size={17}/></button>
              <button className="v2-secondary" onClick={() => {setActivePage("permissions");document.getElementById("permissions")?.scrollIntoView({behavior:"smooth"})}}><ShieldCheck size={16}/> Permission Center</button>
            </div>
          </div>
          <div className="v2-orb">
            <div className="v2-ring r1"/><div className="v2-ring r2"/>
            <div className="v2-core"><Bot size={52}/></div>
            <span className="v2-float v2-f1">Gemini AI</span><span className="v2-float v2-f2">Voice control</span><span className="v2-float v2-f3">Live device data</span>
          </div>
        </section>

        <section id="dashboard" className="v2-section">
          <div className="v2-heading"><div><div className="v2-eyebrow"><Activity size={13}/> LIVE OVERVIEW</div><h2>System dashboard</h2></div><div className="v2-live"><i/>{online ? "Online" : "Offline"}</div></div>
          <div className="v2-grid">
            <InfoCard icon={<BatteryCharging/>} label="Battery" value={batteryText} note={chargingText} progress={battery?.level}/>
            <InfoCard icon={<Cpu/>} label="CPU" value={`${browserStats.cores} cores`} note="Logical core count only"/>
            <InfoCard icon={<Database/>} label="Memory" value={browserStats.ram} note="Browser-reported device class"/>
            <InfoCard icon={<HardDrive/>} label="Web storage" value={storageText} note="Website storage, not full disk"/>
            <InfoCard icon={<Globe/>} label="Weather" value={weather ? `${weather.temperature}°C` : (weatherLoading ? "Loading…" : "Live on request")} note={weather ? weatherDescription(weather.code) : (weatherError || "Allow location to fetch live weather")}/>
          </div>
          <div className="v2-system-grid">
            <div className="v2-panel"><h3>Device information</h3><div className="v2-info-list">
              <Info label="Platform" value={browserStats.platform}/><Info label="Browser" value={browserStats.browser}/><Info label="Screen" value={browserStats.screen}/><Info label="Language" value={browserStats.language}/><Info label="Network" value={online ? "Connected" : "Offline"}/><Info label="Battery state" value={battery ? `${battery.level}% • ${battery.charging ? "Charging" : "Discharging"}` : "Unavailable"}/>
            </div></div>
            <div className="v2-panel"><h3>Battery & health</h3><div className="v2-health"><div className="v2-health-ring"><strong>{battery ? `${battery.level}%` : "—"}</strong></div><div className="v2-health-copy"><strong>{battery ? (battery.charging ? "Charging now" : "Running on battery") : "Battery API unavailable"}</strong><p>{battery ? "Live charge percentage and charging state are available." : "This browser does not expose battery status."}<br/>Battery health/cycles are OS-native data and cannot be read by a normal webpage.</p></div></div></div>
          </div>
        </section>

        <section id="chat-preview" className="v2-section">
          <div className="v2-heading"><div><div className="v2-eyebrow"><Sparkles size={13}/> AI CONVERSATION</div><h2>ChatGPT-style assistant</h2></div><span className="v2-chip"><span style={{width:6,height:6,borderRadius:"50%",background:"#69e5a0"}}/> Gemini AI</span></div>
          <div className="v2-chat-preview">
            <div className="v2-chat-head"><div className="v2-chat-title"><div className="v2-chat-avatar"><Bot size={18}/></div><div><strong>AI System Assistant</strong><small>Ready to help with anything</small></div></div><button className="v2-icon-btn" onClick={() => setChatOpen(true)}><Sparkles size={17}/></button></div>
            <div className="v2-preview-messages"><div className="v2-preview-msg">Hi! Ask me anything — coding, AI, study questions, writing, technology, or your available device information.</div><div className="v2-preview-msg user">Explain machine learning simply.</div><div className="v2-preview-msg">Machine learning is a way for computers to learn patterns from examples and use those patterns to make predictions or decisions.</div></div>
            <button className="v2-open-chat" onClick={() => setChatOpen(true)}>Open full AI Chat</button>
          </div>
        </section>

        <section id="permissions" className="v2-section">
          <div className="v2-heading"><div><div className="v2-eyebrow"><ShieldCheck size={13}/> PRIVACY CENTER</div><h2>Browser permissions</h2></div><button className="v2-secondary" onClick={requestAllSupportedPermissions}><Zap size={15}/> Request supported permissions</button></div>
          <div className="v2-permissions">
            <Permission icon={<Mic/>} title="Microphone" desc="Voice input and speech control" status={micAllowed ? "Allowed" : "Not granted"} onClick={requestMic}/>
            <Permission icon={<Camera/>} title="Camera" desc="Available for future visual assistant features" status={cameraStatus} onClick={requestCamera}/>
            <Permission icon={<MapPin/>} title="Location" desc="Optional browser geolocation access" status={locationStatus} onClick={requestLocation}/>
            <Permission icon={<Bell/>} title="Notifications" desc="Assistant notification support" status={statusLabel(notificationStatus)} onClick={requestNotifications}/>
            <Permission icon={<Clipboard/>} title="Clipboard" desc="Browser clipboard API availability" status={clipboardStatus} onClick={() => setClipboardStatus(navigator.clipboard && window.isSecureContext ? "Available" : "Restricted")}/>
            <Permission icon={<BatteryCharging/>} title="Battery status" desc="Charge percentage when browser exposes it" status={batterySupported ? "Available" : "Restricted"}/>
            <Permission icon={<Wifi/>} title="Network" desc="Online/offline and connection information" status={online ? "Online" : "Offline"}/>
            <Permission icon={<HardDrive/>} title="Full disk monitoring" desc="Requires native Windows/desktop companion" status="Native required"/>
          </div>
        </section>

        <section id="android" className="v2-section">
          <div className="v2-download"><div><div className="v2-eyebrow"><Smartphone size={13}/> ANDROID NATIVE VERSION</div><h2>Deeper device monitoring is next.</h2><p>Android can provide native RAM, CPU, storage, battery, network and device information that a normal browser cannot.</p></div><button className="v2-primary" onClick={() => alert("Android APK download will be connected after the native Android build is ready.")}><Download size={17}/> Download APK</button></div>
        </section>

        <footer className="v2-footer"><span>© AI System Assistant</span><span>Gemini AI • Voice • Permissions • Device dashboard • Android native support</span></footer>
      </main>

      {showPermissionScreen && <StartupScreen online={online} battery={battery} batterySupported={batterySupported} micAllowed={micAllowed} cameraStatus={cameraStatus} locationStatus={locationStatus} notificationStatus={notificationStatus} isStarting={isStarting} onStart={startAssistant} onLimited={() => setShowPermissionScreen(false)}/>} 

      {chatOpen && <div className="v2-overlay">
        <div className="v2-chat-app">
          <aside className="v2-chat-side">
            <div className="v2-chat-side-logo"><div className="v2-logo" style={{width:35,height:35,borderRadius:10}}><Bot size={18}/></div><strong>AI Assistant</strong></div>
            <button className="v2-newchat" onClick={() => setMessages(initialMessages)}><Plus size={16}/> New chat</button>
            <div className="v2-side-label">Workspace</div>
            <div className="v2-side-item active">Current conversation</div>
            <div className="v2-side-item" onClick={() => {setChatOpen(false);document.getElementById("dashboard")?.scrollIntoView({behavior:"smooth"})}}>System dashboard</div>
            <div className="v2-side-item" onClick={() => {setChatOpen(false);document.getElementById("permissions")?.scrollIntoView({behavior:"smooth"})}}>Permission center</div>
            <div className="v2-side-label">Assistant</div>
            <div className="v2-side-item">Gemini AI</div>
            <div className="v2-side-item">Voice interaction</div>
            <div style={{marginTop:"auto",color:"#536078",fontSize:10,lineHeight:1.5}}>Web mode shows only information exposed by the browser. Native monitoring will be added separately.</div>
          </aside>
          <section className="v2-chat-main">
            <header className="v2-chatbar"><div className="v2-model"><span className="v2-model-dot"/> Gemini AI <span style={{color:"#58667d",fontWeight:400}}>• AI System Assistant</span></div><div className="v2-chat-controls"><button className="v2-icon-btn" title={voiceOutput?"Disable voice replies":"Enable voice replies"} onClick={() => { const next = !voiceOutput; setVoiceOutput(next); if (!next && "speechSynthesis" in window) window.speechSynthesis.cancel(); }}>{voiceOutput ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><button className="v2-icon-btn" onClick={() => { setChatOpen(false); if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} } if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }}><X size={18}/></button></div></header>
            <div className="v2-chat-scroll" ref={chatScrollRef}>
              {messages.map((message,index) => <div className={`v2-message ${message.role}`} key={index}><div className="v2-message-avatar">{message.role === "assistant" ? <Bot size={17}/> : "YOU"}</div><div className="v2-message-content">{formatMessage(message.text, message.role)}{message.role === "assistant" && <button className="v2-copy" title="Copy response" onClick={() => navigator.clipboard?.writeText(message.text)}><Copy size={13}/></button>}</div></div>)}
              {isThinking && <div className="v2-message"><div className="v2-message-avatar"><Bot size={17}/></div><div className="v2-typing"><span/><span/><span/></div></div>}
            </div>
            <div className="v2-chat-composer">
              <div className="v2-composer-box"><textarea value={input} disabled={isThinking} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Message AI System Assistant…"/><button className={`v2-icon-btn v2-mic ${isListening?"listening":""}`} disabled={!voiceSupported||isThinking} onClick={startVoiceInput} title="Voice input"><Mic size={18}/></button><button className="v2-send" disabled={isThinking||!input.trim()} onClick={()=>sendMessage()}><Send size={17}/></button></div><div className="v2-composer-hint">Enter to send • Shift+Enter for a new line • {voiceSupported ? "Microphone ready" : "Voice input unavailable"}</div>
            </div>
          </section>
        </div>
      </div>}
    </div>
  );
}

function InfoCard({icon,label,value,note,progress}){return <div className="v2-card"><div className="v2-card-top"><div className="v2-card-label">{label}</div><div className="v2-card-icon">{icon}</div></div><div className="v2-card-value">{value}</div><div className="v2-card-note">{note}</div>{typeof progress === "number"&&<div className="v2-progress"><span style={{width:`${progress}%`}}/></div>}</div>}
function Info({label,value}){return <div className="v2-info"><small>{label}</small><strong>{value}</strong></div>}
function Permission({icon,title,desc,status,onClick}){const good=["Allowed","Online","Available","granted"].includes(status);return <div className="v2-perm"><div className="v2-perm-icon">{icon}</div><div className="v2-perm-body"><strong>{title}</strong><span>{desc}</span></div><div className={`v2-perm-status ${good?"":"v2-unavailable"}`}>{good?<CheckCircle2 size={13}/>:status}</div>{onClick&&<button className="v2-perm-action" onClick={onClick}>Check</button>}</div>}
function StartupScreen({online,battery,batterySupported,micAllowed,cameraStatus,locationStatus,notificationStatus,isStarting,onStart,onLimited}){return <div className="v2-startup"><div className="v2-start-card"><div className="v2-start-head"><div className="v2-start-logo"><Bot size={38}/></div><div className="v2-eyebrow"><Sparkles size={13}/> AI SYSTEM ASSISTANT</div><h2>Welcome to your AI System Assistant</h2><p>Allow the browser features you want to use. The assistant will request supported permissions and then open your dashboard.</p></div><div className="v2-start-grid"><StartPerm icon={<Mic/>} title="Microphone" desc="Voice input" status={micAllowed?"Allowed":"Not requested"}/><StartPerm icon={<Camera/>} title="Camera" desc="Optional visual features" status={cameraStatus}/><StartPerm icon={<MapPin/>} title="Location" desc="Optional geolocation" status={locationStatus}/><StartPerm icon={<Bell/>} title="Notifications" desc="Assistant alerts" status={statusLabel(notificationStatus)}/><StartPerm icon={<Network/>} title="Network" desc="AI connection" status={online?"Online":"Offline"}/><StartPerm icon={<BatteryCharging/>} title="Battery" desc="Live percentage when exposed" status={batterySupported?(battery?`${battery.level}%`:"Reading…"):"Browser restricted"}/></div><div className="v2-start-note"><strong>Important:</strong> A normal website cannot obtain unrestricted Windows CPU usage, total RAM usage, disk health/free space, temperatures, fan speed, battery health/cycle count, or background-process data. Giving browser permissions does not bypass those OS security boundaries. A native Windows companion or Android app is required for those deeper metrics.</div><div className="v2-start-actions"><button className="v2-start-main" onClick={onStart} disabled={isStarting}>{isStarting?"Requesting permissions…":"Allow supported permissions & Start"}</button><button className="v2-start-limited" onClick={onLimited} disabled={isStarting}>Continue with limited access</button></div></div></div>}
function StartPerm({icon,title,desc,status}){return <div className="v2-start-perm"><div className="v2-start-perm-icon">{icon}</div><div className="v2-start-perm-body"><strong>{title}</strong><span>{desc}</span></div><div className="v2-start-status">{status}</div></div>}

createRoot(document.getElementById("root")).render(<App />);
