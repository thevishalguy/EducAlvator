import { Link, useNavigate } from "react-router-dom";
import { PublicNav, PublicFooter } from "../components/layouts";
import { Badge, LogoMark } from "../components/ui";
import { GAMES, GameIcon } from "../lib/games";
import { PLANS, CUSTOM_PLAN, CONTACT } from "../lib/api";

const WORLD_BG = { maths: "bg-pastel-orange", english: "bg-pastel-purple", science: "bg-pastel-teal" };
const raisedCard = "rounded-3xl border border-black/5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:-translate-y-1 dark:border-white/5";
const primaryBtn = "rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-deep";
const outlineBtn = "rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-bg-soft";
const whiteBtn = "rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-[#E05D43] shadow-sm transition-colors hover:bg-gray-50";
const ghostBtn = "rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5";

const EDUPANEL_STEPS = [
  { bg: "bg-pastel-orange", title: "Open your study page", body: "Open any PDF or web page in Chrome — a worksheet, a chapter, or notes." },
  { bg: "bg-pastel-purple", title: "Click the EduPanel icon", body: "The side panel opens beside the page and reads it, PDFs embedded in the page included." },
  { bg: "bg-pastel-teal", title: "Ask, type or speak", body: "Type a question or tap the mic. Paste up to 3 links and EduPanel reads those too." },
];

// Picture of EduPanel at work: a PDF in the browser with the side panel open beside it.
function EduPanelPicture() {
  const line = "h-2 rounded-full bg-ink/10";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
      {/* browser bar */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </div>
        <div className="flex-1 truncate rounded-full bg-bg-soft px-4 py-1.5 text-xs font-semibold text-faint">
          Science — Chapter 6 Life Processes.pdf
        </div>
        <LogoMark className="h-5 w-5" />
      </div>
      <div className="flex min-h-[340px]">
        {/* the PDF page */}
        <div className="hidden flex-1 bg-bg-soft p-5 sm:block">
          <div className="h-full rounded-xl bg-surface p-5 shadow-sm">
            <p className="text-sm font-extrabold text-ink">6.2 Nutrition in plants</p>
            <div className="mt-4 space-y-2.5">
              <div className={`${line} w-full`} />
              <div className={`${line} w-11/12`} />
              <div className={`${line} w-full`} />
              <div className="h-2 w-3/4 rounded-full bg-accent/40" />
              <div className={`${line} w-10/12`} />
            </div>
            <div className="mt-5 grid h-20 place-items-center rounded-xl bg-pastel-teal text-xs font-bold text-muted">Figure 6.1</div>
            <div className="mt-5 space-y-2.5">
              <div className={`${line} w-full`} />
              <div className={`${line} w-9/12`} />
            </div>
          </div>
        </div>
        {/* the EduPanel side panel */}
        <div className="flex w-full flex-col bg-bg sm:w-64 sm:border-l sm:border-line">
          <div className="flex items-center gap-2 bg-sidebar px-4 py-3 text-white">
            <LogoMark className="h-6 w-6" />
            <span className="text-sm font-extrabold">EduPanel<span className="text-accent">.</span></span>
          </div>
          <div className="flex-1 space-y-3 p-4 text-xs font-medium">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-white">
              Explain the highlighted line in simple words.
            </div>
            <div className="max-w-[90%] rounded-2xl bg-surface px-3 py-2 text-ink shadow-sm">
              Plants make their own food: leaves use sunlight to turn water and carbon dioxide into glucose and oxygen.
            </div>
          </div>
          <div className="m-3 flex items-center justify-between rounded-full border border-line bg-surface px-4 py-2 text-xs shadow-sm">
            <span className="font-medium text-faint">Ask about this page…</span>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">↑</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dark panel with the soft accent glow from the design's leaderboard widget.
function DarkPanel({ id, className = "", children }) {
  return (
    <section id={id} className={`relative scroll-mt-24 overflow-hidden rounded-[2rem] bg-sidebar p-8 text-white shadow-xl md:p-10 ${className}`}>
      <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-accent opacity-20 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const waLink = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent("Hi EducAlvator, I'd like to know more about a custom plan.")}`;
  const mailLink = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Custom plan enquiry")}`;

  return (
    <div className="min-h-screen bg-bg font-sans">
      <PublicNav />

      <main className="mx-auto max-w-7xl space-y-10 px-5 py-8 lg:space-y-14 lg:px-10 lg:py-12">
        {/* ---------------- Hero ---------------- */}
        <section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-sm font-bold text-faint">
              Now new · <span className="text-accent">A brighter way to learn</span>
            </p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink lg:text-7xl">
              Learning that knows how to play.
            </h1>
            <p className="mt-5 text-lg font-medium text-muted">One curious learner · Many ways to grow</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate("/sign-in")} className={primaryBtn}>
                Student sign in
              </button>
              <button onClick={() => navigate("/sign-in")} className={outlineBtn}>
                Parent sign in
              </button>
            </div>
          </div>

          {/* study-buddy preview card */}
          <div className="relative overflow-hidden rounded-[2rem] bg-sidebar p-6 text-white shadow-xl md:p-8 lg:col-span-5">
            <div className="absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-accent opacity-20 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">EducAlvator Study Buddy</span>
                <span className="shrink-0 whitespace-nowrap rounded-md bg-accent/10 px-2 py-1 text-xs font-bold text-accent">● Ready</span>
              </div>
              <div className="mt-6 space-y-3 text-sm font-medium">
                <div className="rounded-2xl bg-white/5 p-4 text-gray-200">
                  • I've got a fractions worksheet. Can you help?
                </div>
                <div className="rounded-2xl bg-accent p-4 text-white shadow-[0_4px_12px_rgba(224,93,67,0.3)]">
                  • Absolutely. Let's turn it into a quick flight challenge.
                  <span className="mt-3 block w-fit rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">
                    Fractions worksheet.pdf
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
                <span className="font-medium text-gray-400">Ask, upload, or speak…</span>
                <span className="font-bold text-accent">Send</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Testimonial band ---------------- */}
        <section className={`${raisedCard} bg-pastel-purple p-8 md:p-10`}>
          <span className="text-sm font-bold text-muted">What early families say</span>
          <p className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">
            "EducAlvator completely changed how my son views math homework."
          </p>
        </section>

        {/* ---------------- Why (motive) ---------------- */}
        <section id="motive" className="grid scroll-mt-24 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="card flex flex-col items-start p-8 lg:col-span-4">
            <span className="text-sm font-bold text-faint">Our Motive</span>
            <h2 className="mt-3 flex-1 text-3xl leading-tight tracking-tight text-ink">
              Why EducAlvator exists.
            </h2>
            <button onClick={() => navigate("/parent-sign-up")} className={`mt-8 ${primaryBtn}`}>
              Read our story
            </button>
          </div>
          <DarkPanel className="lg:col-span-8">
            <p className="text-base font-medium leading-relaxed text-gray-200">
              • Homework can feel like a wall when every wrong answer adds pressure. We turn that
              moment into a small, welcoming next step — so children can explore, try again, and feel
              the progress for themselves.
            </p>
            <p className="mt-4 text-base font-medium leading-relaxed text-gray-200">
              • Every playful challenge is grounded in real STEM learning. By pairing academic rigor
              with genuine curiosity, EducAlvator helps prevent burnout and grow the confidence to keep
              learning for life.
            </p>
          </DarkPanel>
        </section>

        {/* ---------------- Game worlds (features) ---------------- */}
        <section id="features" className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl tracking-tight text-ink">Game Worlds</h2>
            <span className="text-sm font-bold text-accent">Pick your subject →</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {GAMES.map((g) => (
              <div key={g.slug} className={`${WORLD_BG[g.slug]} ${raisedCard} flex h-full flex-col p-6`}>
                <div className="flex items-start justify-between">
                  <Badge>{g.subject}</Badge>
                  <span className="text-accent"><GameIcon type={g.icon} size={26} /></span>
                </div>
                <h3 className="mt-6 text-xl leading-tight text-ink">{g.name}</h3>
                <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-muted">{g.long}</p>
                <button onClick={() => navigate("/sign-in")} className="mt-6 w-fit rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-accent-deep">
                  Play now
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- EduPanel ---------------- */}
        <section id="edupanel" className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl tracking-tight text-ink">EduPanel</h2>
            <span className="text-sm font-bold text-accent">For Google Chrome →</span>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
            <div className={`${raisedCard} bg-pastel-orange p-5 sm:p-8 lg:col-span-7`}>
              <EduPanelPicture />
            </div>
            <DarkPanel className="flex flex-col justify-center lg:col-span-5">
              <span className="text-sm font-bold text-gray-400">Meet EduPanel</span>
              <blockquote className="mt-3 text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
                "The Place for <span className="text-accent">Progress</span>"
              </blockquote>
              <p className="mt-5 text-base font-medium leading-relaxed text-gray-300">
                EduPanel reads the PDF or web page in your Chrome tab and answers your questions beside
                it, typed or spoken.
              </p>
            </DarkPanel>
          </div>
          <h3 className="mb-6 mt-10 text-xl text-ink">How it works</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {EDUPANEL_STEPS.map((s, i) => (
              <div key={s.title} className={`${s.bg} ${raisedCard} flex h-full flex-col p-6`}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-extrabold text-white shadow-md">
                  {i + 1}
                </span>
                <h4 className="mt-5 text-lg text-ink">{s.title}</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl tracking-tight text-ink">Simple, transparent plans.</h2>
            <span className="text-sm font-bold text-faint">• No hidden fees. No BS.</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "bg-gradient-to-br from-[#E05D43] to-[#c95138] text-white shadow-xl"
                    : "border border-line bg-surface text-ink shadow-sm"
                }`}
              >
                <span className={`text-sm font-bold ${plan.featured ? "text-white/80" : "text-faint"}`}>{plan.name}</span>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">₹{plan.price.toLocaleString("en-IN")}</span>
                  <span className={`mb-1 text-xs font-bold ${plan.featured ? "text-white/80" : "text-muted"}`}>/ {plan.cadence}</span>
                </div>
                <p className={`mt-1 text-xs font-bold ${plan.featured ? "text-white/80" : "text-muted"}`}>
                  {plan.students} {plan.students > 1 ? "students" : "student"}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm font-medium">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className={plan.featured ? "text-white/70" : "text-accent"}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/parent-sign-up")}
                  className={`mt-6 w-full py-2.5 text-sm transition-colors ${
                    plan.featured
                      ? "rounded-xl bg-white font-extrabold text-[#E05D43] shadow-sm hover:bg-gray-50"
                      : "rounded-full bg-accent font-bold text-white shadow-md hover:bg-accent-deep"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* custom / school plan */}
        <section className="card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h3 className="text-xl text-ink">Custom / School</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{CUSTOM_PLAN.tagline}</p>
            <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm font-medium text-ink sm:grid-cols-2">
              {CUSTOM_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-accent">—</span>{f}</li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href={mailLink} className={primaryBtn}>Email us</a>
            <a href={waLink} target="_blank" rel="noopener" className={outlineBtn}>WhatsApp</a>
          </div>
        </section>

        {/* ---------------- About / final CTA band ---------------- */}
        <DarkPanel id="about">
          <h2 className="text-3xl leading-tight tracking-tight md:text-5xl">
            Built for students,<br />trusted by parents.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <p className="text-sm font-medium leading-relaxed text-gray-400">
              • EducAlvator began with a simple question: what if studying felt more like discovering
              something than getting through it? Educators and technology makers built that feeling.
            </p>
            <p className="text-sm font-medium leading-relaxed text-gray-400">
              • An intuitive study companion that helps children find their own way into a lesson — and
              gives families a clearer, kinder view of how learning is going.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sign-in" className={whiteBtn}>Sign in</Link>
            <Link to="/parent-sign-up" className={ghostBtn}>Create account</Link>
          </div>
        </DarkPanel>
      </main>

      <PublicFooter />
    </div>
  );
}
