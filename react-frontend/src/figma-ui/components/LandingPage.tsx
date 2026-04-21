import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  Zap,
  BarChart3,
  Shield,
  Play,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ParticleNetwork } from './ParticleNetwork';

/* ─── Animation variants ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Data ─── */

const PIPELINE_STEPS = [
  {
    icon: Users,
    title: 'Generate Personas',
    description:
      'AI creates diverse, realistic user profiles with unique goals, motivations, and pain points.',
  },
  {
    icon: Play,
    title: 'Simulate Experiences',
    description:
      'Each persona interacts with your product in a step-by-step simulated walkthrough.',
  },
  {
    icon: MessageSquare,
    title: 'Conduct Interviews',
    description:
      'Structured Q\u200A&\u200AA sessions uncover reactions, frustrations, and desires from each persona.',
  },
  {
    icon: Lightbulb,
    title: 'Extract Needs',
    description:
      'Latent user needs are identified, categorized, and prioritized from interview data.',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Fast Results',
    description:
      'Get actionable insights in minutes instead of weeks of user interviews.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Built In',
    description:
      'Track token usage, latency, and cost per analysis with a built-in dashboard.',
  },
  {
    icon: Shield,
    title: 'Reproducible',
    description:
      'Run consistency tests to measure how stable your results are across iterations.',
  },
];

type NeedCategory =
  | 'Functional'
  | 'Usability'
  | 'Performance'
  | 'Safety'
  | 'Emotional'
  | 'Social'
  | 'Accessibility';

const NEED_CATEGORIES: NeedCategory[] = [
  'Functional',
  'Usability',
  'Performance',
  'Safety',
  'Emotional',
  'Social',
  'Accessibility',
];

interface SampleNeed {
  category: NeedCategory;
  priority: 'High' | 'Medium' | 'Low';
  need: string;
  implication: string;
}

const SAMPLE_NEEDS: Record<NeedCategory, SampleNeed[]> = {
  Functional: [
    {
      category: 'Functional',
      priority: 'High',
      need: 'Users need the ability to export generated requirements directly to project management tools like Jira or Linear.',
      implication: 'Provide one-click export with field mapping to common PM tool formats.',
    },
    {
      category: 'Functional',
      priority: 'Medium',
      need: 'Users need to customize persona demographics and domain expertise before running the pipeline.',
      implication: 'Add configurable persona templates with editable attributes.',
    },
  ],
  Usability: [
    {
      category: 'Usability',
      priority: 'High',
      need: 'Users need intuitive onboarding that lets them accomplish their first task within 60 seconds of signing up.',
      implication: 'Design a guided walkthrough with contextual tooltips for first-time users.',
    },
    {
      category: 'Usability',
      priority: 'Medium',
      need: 'Users need clear visual indicators of pipeline progress so they know how long to wait.',
      implication: 'Show a multi-stage progress bar with estimated time remaining.',
    },
  ],
  Performance: [
    {
      category: 'Performance',
      priority: 'High',
      need: 'Users need the full pipeline to complete within 3 minutes for typical product descriptions.',
      implication: 'Optimize parallel execution and streaming for faster perceived completion.',
    },
    {
      category: 'Performance',
      priority: 'Low',
      need: 'Users need results to load progressively rather than all-at-once after completion.',
      implication: 'Stream partial results as each pipeline stage finishes.',
    },
  ],
  Safety: [
    {
      category: 'Safety',
      priority: 'High',
      need: 'Users need assurance that their product descriptions are not used to train external models.',
      implication: 'Display clear data-handling policies and use ephemeral API sessions.',
    },
    {
      category: 'Safety',
      priority: 'Medium',
      need: 'Users need confidence that generated personas do not perpetuate harmful stereotypes.',
      implication: 'Implement bias-detection checks on persona generation output.',
    },
  ],
  Emotional: [
    {
      category: 'Emotional',
      priority: 'Medium',
      need: 'Users need to feel a sense of progress and accomplishment as they use the product over time.',
      implication: 'Introduce milestone celebrations and visible progress indicators.',
    },
    {
      category: 'Emotional',
      priority: 'Low',
      need: 'Users need the interface to feel calm and trustworthy, not overwhelming.',
      implication: 'Use generous whitespace, muted palettes, and progressive disclosure.',
    },
  ],
  Social: [
    {
      category: 'Social',
      priority: 'Medium',
      need: 'Users need to share analysis results with stakeholders via a shareable link.',
      implication: 'Generate read-only shareable URLs for completed analyses.',
    },
    {
      category: 'Social',
      priority: 'Low',
      need: 'Users need to see how other teams are using NeedGen for inspiration.',
      implication: 'Add anonymized public case studies or showcase gallery.',
    },
  ],
  Accessibility: [
    {
      category: 'Accessibility',
      priority: 'High',
      need: 'Users need full keyboard navigation support throughout the analysis workflow.',
      implication: 'Ensure all interactive elements are focusable and operable via keyboard.',
    },
    {
      category: 'Accessibility',
      priority: 'Medium',
      need: 'Users need screen-reader-compatible output for all generated need cards.',
      implication: 'Use semantic HTML and ARIA labels for all dynamic content.',
    },
  ],
};

const PRIORITY_STYLES: Record<string, string> = {
  High: 'border-l-amber-400 bg-amber-400/5',
  Medium: 'border-l-cyan-400 bg-cyan-400/5',
  Low: 'border-l-slate-500 bg-slate-500/5',
};

const PRIORITY_BADGE: Record<string, string> = {
  High: 'bg-amber-400/15 text-amber-300',
  Medium: 'bg-cyan-400/15 text-cyan-300',
  Low: 'bg-slate-400/15 text-slate-400',
};

/* ─── Pipeline SVG connector (desktop) ─── */

function PipelineConnector({ inView }: { inView: boolean }) {
  return (
    <svg
      className="absolute top-1/2 left-0 w-full h-4 -translate-y-1/2 hidden md:block pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 1000 16"
      fill="none"
    >
      <defs>
        <linearGradient id="pipe-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M 80 8 L 920 8"
        stroke="url(#pipe-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="840"
        strokeDashoffset={inView ? '0' : '840'}
        style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
      />
    </svg>
  );
}

/* ─── Section wrapper ─── */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-400/80 mb-3">
      {children}
    </p>
  );
}

/* ─── Main component ─── */

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<NeedCategory>('Usability');
  const pipelineRef = useRef<HTMLDivElement>(null);
  const pipelineInView = useInView(pipelineRef, { once: true, margin: '-100px' });

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 overflow-x-hidden">
      {/* ── Nav ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-navy-950/80 backdrop-blur-xl border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>NeedGen</span>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold text-sm px-5 py-2 transition-colors"
          >
            Launch App
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16"
      >
        <ParticleNetwork />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/70 mb-6"
          >
            Powered by the Elicitron methodology
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-balance"
          >
            Turn AI Into Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              User Research Team
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-lg sm:text-xl text-slate-400 max-w-[640px] mx-auto mb-10 leading-relaxed"
          >
            NeedGen generates diverse user personas, simulates their product
            experiences, interviews them, and extracts the latent needs that real
            users struggle to articulate — all in minutes.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold text-base px-8 py-3 transition-colors"
            >
              Try NeedGen
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById('pipeline')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-medium text-base px-8 py-3 transition-all"
            >
              See How It Works
            </button>
          </motion.div>

          {/* App preview placeholder */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="relative max-w-3xl mx-auto"
          >
            <div className="absolute -inset-4 rounded-2xl bg-amber-500/10 blur-3xl" />
            <div className="relative rounded-xl border border-white/10 ring-1 ring-white/5 overflow-hidden bg-navy-900/80 backdrop-blur-sm shadow-2xl"
              style={{ transform: 'perspective(1200px) rotateX(2deg)' }}
            >
              {/* Mock title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-navy-900/60">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="text-xs text-slate-500 font-mono">needgen.app</div>
                </div>
              </div>
              {/* Mock app content */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="h-3 w-32 bg-white/10 rounded" />
                  <div className="ml-auto h-3 w-20 bg-amber-500/20 rounded" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {['Personas', 'Experiences', 'Interviews', 'Needs'].map(
                    (label, i) => (
                      <div
                        key={label}
                        className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center"
                      >
                        <div
                          className={`text-xs font-mono mb-2 ${
                            i < 3 ? 'text-teal-400' : 'text-amber-400'
                          }`}
                        >
                          {label}
                        </div>
                        <div className="h-2 bg-white/5 rounded mb-1.5" />
                        <div className="h-2 bg-white/5 rounded w-3/4 mx-auto" />
                      </div>
                    )
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-2 bg-white/5 rounded w-full" />
                    <div className="h-2 bg-white/5 rounded w-5/6" />
                    <div className="h-2 bg-white/5 rounded w-4/6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 bg-white/5 rounded w-full" />
                    <div className="h-2 bg-white/5 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-5 h-5 text-slate-500 animate-scroll-hint" />
        </div>
      </section>

      {/* ── Thesis ── */}
      <section
        id="thesis"
        className="relative py-32 px-6"
        style={{
          background:
            'linear-gradient(180deg, #050816 0%, #0a0e1a 40%, #0f172a 100%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-2xl sm:text-3xl leading-relaxed text-slate-300 font-light">
            Real user research takes weeks.{' '}
            <span className="text-slate-100 font-normal">
              NeedGen runs a full research cycle in minutes
            </span>{' '}
            — surfacing the needs your users can't articulate.
          </p>
        </motion.div>
      </section>

      {/* ── Pipeline / How It Works ── */}
      <section id="pipeline" className="relative py-24 sm:py-32 px-6 landing-dot-grid">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <SectionEyebrow>How It Works</SectionEyebrow>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              A four-stage AI pipeline that mirrors{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-amber-400">
                real user research
              </span>
            </h2>
          </div>

          <div ref={pipelineRef} className="relative">
            <PipelineConnector inView={pipelineInView} />

            {/* Desktop: horizontal grid | Mobile: vertical stack with left line */}
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
              {/* Mobile connecting line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-teal-400/40 to-amber-400/40 md:hidden" />

              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  variants={fadeUp}
                  custom={i}
                  className="relative pl-14 md:pl-0"
                >
                  {/* Step number — mobile: on the left line, desktop: top-left */}
                  <div className="absolute left-3 md:left-0 top-0 md:-top-3 w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-amber-400 text-navy-950 text-xs font-bold flex items-center justify-center z-10">
                    {i + 1}
                  </div>

                  <div className="landing-card-well rounded-xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                      <step.icon className="w-5 h-5 text-teal-400" />
                    </div>
                    <h3 className="font-semibold text-slate-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What You Get ── */}
      <section
        id="output"
        className="relative py-24 sm:py-32 px-6"
        style={{
          background:
            'linear-gradient(180deg, #0a0e1a 0%, #0f172a 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionEyebrow>Output</SectionEyebrow>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
              Structured, prioritized{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                user needs
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every analysis produces categorized needs ready for your product
              backlog, each with priority and design implications.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-nowrap overflow-x-auto gap-2 justify-start sm:justify-center mb-10 pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
            {NEED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeTab === cat
                    ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Need cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto"
            >
              {SAMPLE_NEEDS[activeTab].map((need, i) => (
                <div
                  key={i}
                  className={`rounded-xl border border-white/5 border-l-4 p-5 ${PRIORITY_STYLES[need.priority]}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium rounded-full bg-white/5 px-2.5 py-0.5 text-slate-300">
                      {need.category}
                    </span>
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${PRIORITY_BADGE[need.priority]}`}
                    >
                      {need.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 mb-2 leading-relaxed">
                    {need.need}
                  </p>
                  <p className="text-xs text-slate-400">
                    <span className="font-mono text-slate-500">
                      Design implication →
                    </span>{' '}
                    {need.implication}
                  </p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section id="features" className="relative py-24 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <SectionEyebrow>Why NeedGen</SectionEyebrow>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              Built for speed, rigor, and repeatability
            </h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerChild}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 ring-1 ring-white/10 mb-5">
                  <feature.icon className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section
        id="cta"
        className="relative py-28 sm:py-36 px-6"
        style={{ background: '#050816' }}
      >
        <div className="landing-glow-cta absolute inset-0 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Ready to discover what your users{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              really need
            </span>
            ?
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            Start your first analysis in under a minute. No signup required.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold text-base px-10 py-3.5 transition-colors landing-glow-amber"
          >
            Launch NeedGen
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6" style={{ background: '#050816' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500/60" />
            <span className="font-medium text-slate-400">NeedGen</span>
          </div>
          <p>Based on the Elicitron research methodology</p>
        </div>
      </footer>
    </div>
  );
}
