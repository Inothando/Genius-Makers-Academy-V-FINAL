// src/pages/PricingPage.tsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Check, Minus, Sparkles, Zap, Crown, GraduationCap, Building2, ArrowRight } from "lucide-react";
import { Navbar } from "../components/Navbar";

const TIERS = [
  {
    id: "starter",
    name: "Genius Starter",
    label: "Tier 1 — Free",
    price: 0,
    displayPrice: "R0",
    period: "/month",
    subNote: "Forever free. No card needed.",
    color: "#6b7280", // Keep gray for free
    bgColor: "#ffffff",
    borderColor: "#EAEAEA",
    icon: <GraduationCap className="h-5 w-5" />,
    popular: false,
    features: [
      { text: "NSC past papers vault (all subjects)", included: true },
      { text: "Memoranda access", included: true },
      { text: "Discussion Hub — full access", included: true },
      { text: "Video lessons — Discovery tab", included: true },
      { text: "Public Study Packs — view only", included: true },
      { text: "AI Tutor — 3 questions/day", included: true },
      { text: "AI Semantic Search — preview", included: true },
      { text: "Offline content packs", included: false },
      { text: "AI answer marking", included: false },
    ],
  },
  {
    id: "scholar",
    name: "Genius Scholar",
    label: "Tier 2 — Most Popular",
    price: 7.5,
    displayPrice: "R5",
    period: "/month",
    subNote: "+ R2.50 processing fee = R7.50 total",
    color: "#C29D59", // lux-gold
    bgColor: "#F8F5EE", // light gold tinted bg
    borderColor: "#C29D59",
    icon: <Sparkles className="h-5 w-5" />,
    popular: true,
    features: [
      { text: "Everything in Starter", included: true },
      { text: "AI Tutor — 20 questions/day", included: true },
      { text: "AI Semantic Search — full", included: true },
      { text: "AI Study Plan — 4-week personalised", included: true },
      { text: "AI Hint Mode", included: true },
      { text: "Offline content packs", included: true },
      { text: "Photo problem uploads (10/month)", included: true },
      { text: "Full Courses tab", included: true },
      { text: "Verified Learner Badge", included: true },
    ],
  },
  {
    id: "pro",
    name: "Genius Pro",
    label: "Tier 3 — ~R1/day",
    price: 29,
    displayPrice: "R29",
    period: "/month",
    subNote: "Billed monthly. Less than one tutor minute.",
    color: "#083B2B", // lux-green-900
    bgColor: "#Eef4f2",
    borderColor: "#083B2B",
    icon: <Zap className="h-5 w-5" />,
    popular: false,
    features: [
      { text: "Everything in Scholar", included: true },
      { text: "Unlimited AI questions", included: true },
      { text: "AI answer marking vs official memo", included: true },
      { text: "Mock paper generator (3/month)", included: true },
      { text: "Unlimited photo uploads", included: true },
      { text: "Ask AI questions on videos", included: true },
      { text: "Progress analytics dashboard", included: true },
      { text: "Private Study Packs", included: true },
      { text: "1 peer tutor session/month", included: true },
      { text: "Priority Help Room", included: true },
    ],
  },
  {
    id: "elite",
    name: "Genius Elite",
    label: "Tier 4 — Private coaching",
    price: 79,
    displayPrice: "R79",
    period: "/month",
    subNote: "Includes 1 teacher session credit.",
    color: "#042218", // lux-green-950
    bgColor: "#F0F3F2",
    borderColor: "#042218",
    icon: <Crown className="h-5 w-5" />,
    popular: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited mock paper generator", included: true },
      { text: "AI weak topic auto-detection", included: true },
      { text: "AI exam strategy coach", included: true },
      { text: "1 qualified teacher session/month", included: true },
      { text: "AI parent progress report (monthly)", included: true },
      { text: "Assigned private Study Packs", included: true },
      { text: "GMA Elite badge + leaderboard", included: true },
      { text: "Session recording (48hr)", included: true },
      { text: "Extra sessions at R55 each", included: true },
    ],
  },
];

export function PricingPage() {
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleUpgrade = async (tierId: string) => {
    if (!user) {
      window.location.href = "/sign-in?redirect=/pricing";
      return;
    }

    if (tierId === "starter") return;

    setLoadingTier(tierId);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          tier: tierId,
          email: user.email,
          name: user.displayName || "GMA Learner",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Build PayFast form and submit
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payfastUrl;

      Object.entries(data.data).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      alert("Payment setup failed: " + err.message);
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />
      {/* Header */}
      <div className="bg-lux-green-950 px-4 py-24 pt-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-gold/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-lux-gold relative z-10 inline-flex items-center gap-2">
          <span className="w-6 h-[1px] bg-lux-gold"></span>
          Enrollment Plans
          <span className="w-6 h-[1px] bg-lux-gold"></span>
        </p>
        <h1 className="mb-6 text-5xl md:text-6xl font-serif font-medium text-lux-surface tracking-tight relative z-10">
          Academic excellence, unlocked.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-lux-surface/70 font-light relative z-10">
          Start free forever. Upgrade when you need more. Cancel anytime.
          The Scholar tier is deliberately priced at{" "}
          <strong className="text-lux-gold font-medium">R5/month</strong>.
        </p>
      </div>

      {/* Scholar highlight banner */}
      <div className="border-y border-lux-gold/20 bg-lux-green-900 px-4 py-3 text-center shadow-inner">
        <p className="text-[11px] text-lux-gold-light tracking-wide uppercase font-bold">
          <strong>Scholar = R5 plan + R2.50 processing fee = R7.50/month total.</strong>{" "}
          Transparent processing fee pricing.
        </p>
      </div>

      {/* Tier cards */}
      <div className="mx-auto max-w-7xl px-4 xl:px-8 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition ${
                tier.popular ? "shadow-lg shadow-[#1D9E75]/10" : "shadow-sm"
              }`}
              style={{
                borderColor: tier.borderColor,
                backgroundColor: tier.bgColor,
              }}
            >
              {tier.popular && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  Most Popular
                </div>
              )}

              {/* Icon + label */}
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: tier.color }}
              >
                {tier.icon}
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#5A7A6E]">
                {tier.label}
              </p>
              <h2 className="mb-1 text-xl font-bold text-[#0D1B14]">{tier.name}</h2>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ color: tier.color }}>
                  {tier.displayPrice}
                </span>
                <span className="text-sm text-[#5A7A6E]">{tier.period}</span>
              </div>
              <p className="mb-5 text-xs text-[#5A7A6E]">{tier.subNote}</p>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={loadingTier === tier.id}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-50"
                style={
                  tier.id === "starter"
                    ? { background: "#F3F4F6", color: "#6B7280" }
                    : { backgroundColor: tier.color, color: "#fff" }
                }
              >
                {loadingTier === tier.id ? (
                  "Redirecting..."
                ) : tier.id === "starter" ? (
                  "Current plan"
                ) : (
                  <>
                    Upgrade <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Features */}
              <ul className="flex flex-col gap-2.5">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {feat.included ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: tier.color }}
                      />
                    ) : (
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#D1D5DB]" />
                    )}
                    <span
                      className={
                        feat.included ? "text-[#0D1B14]" : "text-[#9CA3AF]"
                      }
                    >
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* School license */}
        <div className="mt-12 rounded-[2.5rem] border border-lux-border bg-lux-surface p-10 shadow-lux-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-lux-gold/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-lux-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-lux-gold">
                  Enterprise License
                </span>
              </div>
              <h2 className="mb-2 text-2xl font-serif text-lux-surface">School License — R599/month</h2>
              <p className="max-w-lg text-lux-surface/60 font-light text-sm">
                60 learner seats included. All Pro AI features for every seat. Teacher admin
                dashboard. Class-wide AI analytics. HOD subject reports in DBE language.
                R10/learner/month — excellent ROI.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href="mailto:contact@geniusmakers.co.za?subject=School License Enquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-lux-gold px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-lux-green-950 transition hover:bg-lux-gold-light active:scale-95 shadow-lg shadow-lux-gold/20"
              >
                Contact Sales <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-xs text-lux-gold/40 text-center">
                40 schools partnered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
