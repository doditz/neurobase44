import React, { useState, useEffect } from "react";
import HomeHero from "@/components/home/HomeHero";
import FeatureGrid from "@/components/home/FeatureGrid";
import HowItWorks from "@/components/home/HowItWorks";
import { homeTranslations } from "@/components/home/translations";

const getInitialLang = () => {
  const saved = localStorage.getItem("home_lang");
  if (saved === "en" || saved === "fr") return saved;
  return "fr"; // Loi 101 : le français est la langue d'affichage par défaut

};

export default function Home() {
  const [lang, setLang] = useState(getInitialLang);
  const t = homeTranslations[lang];

  /**
   * Keep the document language in sync with the selected locale so that
   * screen readers, search engines and LLM crawlers read the correct language.
   */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleLangChange = (l) => {
    setLang(l);
    localStorage.setItem("home_lang", l);
  };

  return (
    <main className="min-h-full bg-slate-900" lang={lang}>
      <HomeHero t={t} lang={lang} onLangChange={handleLangChange} />
      <FeatureGrid t={t} />
      <HowItWorks t={t} />
    </main>
  );
}