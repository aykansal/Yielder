import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import permaswapLogo from "@/assets/permaswap.png";

type Icon = { src: string; alt: string };

type IntegrationsHubProps = {
  title?: string;
  subtitle?: string;
  // Accept any length but we will only render the first three for even spacing
  icons?: Icon[];
  className?: string;
  projectLogo?: Icon;
};

export function IntegrationsHub({
  title = "Unified DEX Integrations",
  subtitle = "Aggregate quotes across DEXs and execute the best route — all in one place.",
  icons = [
    { src: "/dexi.svg", alt: "DeXi" },
    { src: "/botega.svg", alt: "Botega" },
    { src: permaswapLogo, alt: "Permaswap" },
  ],
  className,
  projectLogo = { src: "/permaswap.png", alt: "Permaswap" },
}: IntegrationsHubProps) {
  const prefersReducedMotion = useReducedMotion();

  // Primary: sky-600; Neutrals: white, slate-900, slate-500; Accent: lime-500

  const baseDuration = 5.6; // total cycle length (seconds) for full sequence
  const ease = [0.22, 1, 0.36, 1] as const;

  const items = icons.slice(0, 3);

  // Compute equally spaced starting positions (120° apart) around a radius
  const radius = 180;
  const angles = [-90, 150, 30]; // top, bottom-left, bottom-right
  const startOffsets = angles.map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    // y axis positive is downward in CSS transform space
    const x = Math.round(Math.cos(rad) * radius);
    const y = Math.round(Math.sin(rad) * radius);
    const r = i === 0 ? 0 : i === 1 ? -8 : 8;
    return { x, y, r };
  });

  const movePortion = 0.6; // 60% of cycle to travel to center
  const dissolvePortion = 0.15; // 15% to dissolve
  const logoShowPortion = 0.18; // 18% show time for logo

  const renderIcon = (icon: Icon, idx: number) => {
    const size = 56;
    const s = startOffsets[idx] || { x: 0, y: 0, r: 0 };

    // Smooth, simultaneous animation (no per-item delay)
    return (
      <motion.div
        key={`${icon.alt}-${idx}`}
        className="absolute left-1/2 top-1/2 z-[20]"
        initial={{
          x: s.x,
          y: s.y,
          rotate: s.r,
          opacity: 0,
          filter: "blur(0px)",
        }}
        animate={{
          x: [s.x, 0, 0, 0],
          y: [s.y, 0, 0, 0],
          rotate: [s.r, 0, 0, 0],
          opacity: [0, 1, 0.2, 0],
          filter: ["blur(0px)", "blur(0px)", "blur(6px)", "blur(6px)"],
          scale: [1, 1, 0.96, 0.96],
        }}
        transition={{
          duration: baseDuration,
          ease,
          times: [0, movePortion, movePortion + dissolvePortion, 1],
          repeat: Number.POSITIVE_INFINITY,
          repeatDelay: 0,
        }}
        style={{ translateX: "-50%", translateY: "-50%" }}
      >
        <motion.div
          className="rounded-2xl bg-primary shadow-lg ring-1 ring-border p-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img
            src={icon.src}
            alt={icon.alt}
            width={size}
            height={size}
            className="rounded-xl"
          />
        </motion.div>
      </motion.div>
    );
  };

  return (
    <section
      aria-label="DEX integrations"
      className={cn(
        "relative mx-auto w-full p-6 sm:p-10",
        className,
      )}
    >
      {/* Title */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-pretty text-2xl font-semibold text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      </div>

      {/* Stage */}
      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-card">
        {/* Watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="select-none text-[11vw] font-semibold tracking-tight text-foreground/5">
            INTEGRATIONS
          </span>
        </div>

        {/* Concentric guides */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-border" />
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-border/70" />
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-border/50" />
        </div>

        {/* Unified Hub (replaces folder) */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative grid h-40 w-40 place-items-center rounded-full border border-border bg-card shadow-lg">
            {/* Inner recess */}
            <div className="absolute inset-6 rounded-full bg-muted ring-1 ring-border" />
            {/* Inward chevrons implying aggregation */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center text-muted-foreground/70">
              <div className="col-start-2 row-start-1">
                {String.fromCharCode(0x2193)}
              </div>
              <div className="col-start-1 row-start-2">
                {String.fromCharCode(0x2192)}
              </div>
              <div className="col-start-3 row-start-2">
                {String.fromCharCode(0x2190)}
              </div>
            </div>
            {/* Brand chip */}
            <div className="relative z-10 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
              Unified Hub
            </div>
            {/* Top rim overlay so icons appear to enter */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card"
              aria-hidden
            />
          </div>

          {/* Pulse ring synchronized near icon arrival */}
          {!prefersReducedMotion && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 z-[25] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-lime-500/70"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: [0, 120, 180, 0],
                height: [0, 120, 180, 0],
                opacity: [0, 0.5, 0, 0],
              }}
              transition={{
                duration: baseDuration,
                ease,
                times: [
                  movePortion - 0.1,
                  movePortion + 0.05,
                  movePortion + dissolvePortion,
                  1,
                ],
                repeat: Number.POSITIVE_INFINITY,
              }}
              aria-hidden
            />
          )}
        </div>

        {!prefersReducedMotion ? (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[40] -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{
              opacity: [0, 0, 1, 1, 0],
              scale: [0.9, 0.9, 1, 1, 1],
              filter: [
                "blur(4px)",
                "blur(4px)",
                "blur(0px)",
                "blur(0px)",
                "blur(2px)",
              ],
            }}
            transition={{
              duration: baseDuration,
              ease,
              times: [
                0,
                movePortion + dissolvePortion - 0.02, // just before icons finish dissolving
                movePortion + dissolvePortion + 0.02, // fade in quickly
                movePortion + dissolvePortion + logoShowPortion, // hold
                1, // fade out before loop
              ],
              repeat: Number.POSITIVE_INFINITY,
            }}
            aria-hidden
          >
            <div className="grid place-items-center rounded-full bg-card p-3 shadow-md ring-1 ring-border">
              <img
                src={projectLogo.src}
                alt={projectLogo.alt || "Project logo"}
                width={64}
                height={64}
                className="rounded-xl"
              />
            </div>
          </motion.div>
        ) : (
          // Reduced-motion: show logo statically in the center
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[40] -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <div className="grid place-items-center rounded-full bg-card p-3 shadow-md ring-1 ring-border">
              <img
                src={
                  projectLogo.src ||
                  "/placeholder.svg?height=64&width=64&query=Project%20logo"
                }
                alt={projectLogo.alt || "Project logo"}
                width={64}
                height={64}
                className="rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Animated icons (exactly 3) */}
        {items.map((icon, i) => renderIcon(icon, i))}
      </div>
    </section>
  );
}
