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
      { text: "NSC past papers vault (Mathematics and Physical Sciences)", included: true },
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
    color: "#AD8A4B", // lux-green-500
    bgColor: "#FDFBF7", // light gold tinted bg
    borderColor: "#AD8A4B",
    icon: <Sparkles className="h-5 w-5" />,
    popular: true,
    features: [
      { text: "Everything in Starter", included: true },
      { text: "AI Tutor — 30 questions/day", included: true },
      { text: "Smart AI Study Generator — Auto-assembles weekly plans", included: true },
      { text: "AI Weakness Tracker & Insights", included: true },
      { text: "AI Semantic Search — Full Vault Access", included: true },
      { text: "AI Hint Mode for Exams", included: true },
      { text: "Offline content & past papers", included: true },
      { text: "Photo problem uploads (20/month)", included: true },
      { text: "Verified Scholar Badge", included: true },
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
    color: "#082914", // lux-green-900
    bgColor: "#F3EFE6",
    borderColor: "#3E3B36",
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
    color: "#04170A", // lux-green-950
    bgColor: "#E8E2D5",
    borderColor: "#2C2A26",
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
      <div className="bg-lux-bg px-4 py-24 pt-28 sm:pt-36 md:pt-48 text-center relative overflow-hidden">
        <div className="absolute inset-0 hidden opacity-[0.03] mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-green-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-lux-green-500 relative z-10 inline-flex items-center gap-2">
          <span className="w-6 h-[1px] bg-lux-green-500"></span>
          Enrollment Plans
          <span className="w-6 h-[1px] bg-lux-green-500"></span>
        </p>
        <h1 className="mb-6 text-5xl md:text-6xl font-serif font-medium text-lux-text tracking-tight relative z-10">
          Academic excellence, unlocked.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-lux-text font-light relative z-10">
          Start free forever. Upgrade when you need more. Cancel anytime.
          The Scholar tier is deliberately priced at{" "}
          <strong className="text-lux-green-500 font-medium">R5/month</strong>.
        </p>
      </div>

      {/* Scholar highlight banner */}
      <div className="border-y border-lux-border bg-lux-bg px-4 py-3 text-center shadow-inner">
        <p className="text-[11px] text-lux-text tracking-wide uppercase font-bold">
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
              className={`relative flex flex-col rounded-2xl sm:rounded-3xl border-2 p-6 transition ${
                tier.popular ? "shadow-lg shadow-lux-green-500/20" : "shadow-sm"
              }`}
              style={{
                borderColor: tier.borderColor,
                backgroundColor: tier.bgColor,
              }}
            >
              {tier.popular && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-lux-text"
                  style={{ backgroundColor: tier.color }}
                >
                  Most Popular
                </div>
              )}

              {/* Icon + label */}
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lux-text"
                style={{ backgroundColor: tier.color }}
              >
                {tier.icon}
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-lux-text">
                {tier.label}
              </p>
              <h2 className="mb-1 text-xl font-bold text-lux-text">{tier.name}</h2>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ color: tier.color }}>
                  {tier.displayPrice}
                </span>
                <span className="text-sm text-lux-text">{tier.period}</span>
              </div>
              <p className="mb-5 text-xs text-lux-text">{tier.subNote}</p>

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
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-lux-text" />
                    )}
                    <span
                      className={
                        feat.included ? "text-lux-text" : "text-lux-text opacity-50"
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
        <div className="mt-12 rounded-[2.5rem] border border-lux-border bg-lux-bg p-10 shadow-lux-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-lux-green-500/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-lux-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500">
                  Enterprise License
                </span>
              </div>
              <h2 className="mb-2 text-2xl font-serif text-lux-text">School License — R599/month</h2>
              <p className="max-w-lg text-lux-text font-light text-sm">
                60 learner seats included. All Pro AI features for every seat. Teacher admin
                dashboard. Class-wide AI analytics. HOD subject reports in DBE language.
                R10/learner/month — excellent ROI.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href="mailto:contact@geniusmakers.co.za?subject=School License Enquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-lux-green-500 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-lux-text transition hover:bg-lux-green-500 hover:text-lux-text  active:scale-95 shadow-lg shadow-lux-green-500/20"
              >
                Contact Sales <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-xs text-lux-green-500/40 text-center">
                40 schools partnered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
