import React from "react";
import HomeHero from "@/components/home/HomeHero";
import FeatureGrid from "@/components/home/FeatureGrid";
import HowItWorks from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <div className="min-h-full bg-slate-900">
      <HomeHero />
      <FeatureGrid />
      <HowItWorks />
    </div>
  );
}