/*
 * CONTINUUM — CTASection
 * Design: Void Cartography — full-width, high contrast, strong typography
 * The final conversion moment. No distractions.
 */
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInView } from "@/hooks/useInView";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CTASection() {
  const { ref, inView } = useInView(0.15);
  const navigate = useNavigate();

  return (
    <section id="cta" ref={ref} className="relative py-28 lg:py-40 overflow-hidden">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background: strong cyan glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.72 0.14 195 / 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 50% 50%, oklch(0.72 0.14 195 / 0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.72 0.14 195) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.72 0.14 195) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {inView && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mb-8"
              >
                <span className="label-caps text-[oklch(0.72_0.14_195)]">Get started today</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
                className="font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.025em] text-[oklch(0.93_0.005_60)] mb-6"
              >
                Transform how you think.
                <br />
                <span className="italic text-[oklch(0.72_0.14_195)]">Build your knowledge graph today.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                className="font-body text-[1.0625rem] leading-[1.75] text-[oklch(0.45_0.008_260)] mb-12 max-w-lg mx-auto"
              >
                Join thousands of users creating their second brain with Continuum. 
                Start organizing, connecting, and discovering your knowledge now.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
              >
                <button
                  onClick={() => navigate("/login")}
                  className="btn-primary animate-pulse-glow text-lg"
                >
                  Get started now
                  <ArrowRight size={20} />
                </button>
              </motion.div>

              {/* Reassurances */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-6"
              >
                {[
                  "No credit card required",
                  "Instant setup",
                  "Try risk-free",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 label-caps text-[oklch(0.35_0.008_260)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.14_195)]" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
