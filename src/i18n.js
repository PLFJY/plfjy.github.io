import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh-CN.json";
import enUS from "./locales/en-US.json";

const STORAGE_KEY = "preferred-locale";
const supportedLocales = ["zh-CN", "en-US"];

function resolveInitialLocale() {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const savedLocale = window.localStorage.getItem(STORAGE_KEY);
  if (savedLocale && supportedLocales.includes(savedLocale)) {
    return savedLocale;
  }

  const systemLocales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  const matchedZh = systemLocales.some((locale) => locale.toLowerCase().startsWith("zh"));
  return matchedZh ? "zh-CN" : "en-US";
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS }
  },
  lng: resolveInitialLocale(),
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
