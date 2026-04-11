/*
 * CONTINUUM — HeroSection
 * Design: Void Cartography — asymmetric layout, Playfair Display headline
 * Left: headline + subheadline + CTAs | Right: animated knowledge graph
 * Background: near-black with subtle radial gradient + grid
 */
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import KnowledgeGraph from "@/components/landing/KnowledgeGraph";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
});

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background gradient layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 70% 50%, oklch(0.72 0.14 195 / 0.07) 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 15% 30%, oklch(0.72 0.14 195 / 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 50% 100%, oklch(0.09 0.012 260) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(1 0 0 / 0.06) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      <div className="container relative z-10 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-8 items-center">
          {/* Left: Text content */}
          <div className="max-w-xl">
            {/* Badge */}
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[oklch(0.72_0.14_195/0.3)] bg-[oklch(0.72_0.14_195/0.06)] mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.14_195)] animate-pulse" />
                <span className="label-caps text-[oklch(0.72_0.14_195)]">Knowledge Management</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.2)}
              className="font-display text-[clamp(2.75rem,6vw,5rem)] font-bold leading-[1.05] tracking-[-0.025em] text-[oklch(0.93_0.005_60)] mb-6"
            >
              Your thoughts,
              <br />
              <em className="not-italic text-[oklch(0.72_0.14_195)] italic">finally connected.</em>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              {...fadeUp(0.3)}
              className="font-body text-[1.0625rem] leading-[1.75] text-[oklch(0.5_0.008_260)] mb-10 max-w-md"
            >
              Continuum is built for speed, clarity, and real thinking. Organize, connect, and discover your knowledge at the speed of thought.
            </motion.p>

            {/* CTAs */}
            <motion.div {...fadeUp(0.4)} className="flex flex-wrap gap-3">
              <a href="#cta" className="btn-primary animate-pulse-glow">
                Get started
                <ArrowRight size={16} />
              </a>
              <a href="#how-it-works" className="btn-secondary">
                <Play size={14} className="opacity-70" />
                See how it works
              </a>
            </motion.div>
          </div>

          {/* Right: Knowledge Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            className="relative h-[420px] lg:h-[540px]"
          >
            {/* Outer glow ring */}
            <div
              className="absolute inset-4 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 60% at 50% 50%, oklch(0.72 0.14 195 / 0.1) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Canvas */}
            <KnowledgeGraph className="relative z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
