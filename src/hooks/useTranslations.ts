import { useEffect, useState } from "react";
import { getTranslation } from "@/lib/translations";

export function useTranslations() {
  const [language, setLanguage] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("app_lang") || "en";
    setLanguage(savedLang);
  }, []);

  // Listen for changes to app_lang in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedLang = localStorage.getItem("app_lang") || "en";
      setLanguage(savedLang);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const t = (key: string): string => {
    if (!mounted) return key;
    return getTranslation(key, language);
  };

  return { t, language, mounted };
}
