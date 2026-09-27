import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend
} from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyBNcTdqvuh37wE7E4QRIQBxj-Yi-PwpPts",
  authDomain: "ai-system-assistant-8ae13.firebaseapp.com",
  projectId: "ai-system-assistant-8ae13",
  storageBucket: "ai-system-assistant-8ae13.firebasestorage.app",
  messagingSenderId: "650341371232",
  appId: "1:650341371232:web:afdf3b5f36a5ea3301a205"
};

const app = initializeApp(firebaseConfig);

// Firebase App Check
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "6Le3F9ItAAAAAIzr1OeO2FxlU0siCb0bv5XAG0Pn"
  ),
  isTokenAutoRefreshEnabled: true
});

// Firebase AI Logic
const ai = getAI(app, {
  backend: new GoogleAIBackend()
});

export const model = getGenerativeModel(ai, {
  model: "gemini-3.5-flash-lite"
});