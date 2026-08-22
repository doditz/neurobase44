import React, { useState } from "react";
import HomeHero from "@/components/home/HomeHero";
import FeatureGrid from "@/components/home/FeatureGrid";
import HowItWorks from "@/components/home/HowItWorks";
import { homeTranslations } from "@/components/home/translations";

const getInitialLang = () => {
  const saved = localStorage.getItem("home_lang");
  if (saved === "en" || saved === "fr") return saved;
  return navigator.language?.startsWith("fr") ? "fr" : "en";
};

export default function Home() {
  const [lang, setLang] = useState(getInitialLang);
  const t = homeTranslations[lang];

  const handleLangChange = (l) => {
    setLang(l);
    localStorage.setItem("home_lang", l);
  };

  return (
    <div className="min-h-full bg-slate-900">
      <HomeHero t={t} lang={lang} onLangChange={handleLangChange} />
      <FeatureGrid t={t} />
      <HowItWorks t={t} />
    </div>
  );
}