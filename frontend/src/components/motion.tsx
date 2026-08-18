"use client";

import {
 type ReactNode } from "react";
import {
 AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
 cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise on mount. Used for page sections and panels. */
export function FadeIn({
  children,
  delay = 0,
  y = 8,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: EASE }}
      className={cn("min-w-0", className)}
    >
      {children}
    </motion.div>
  );
}

/** Parent that staggers direct <StaggerItem> children. */
export function Stagger({
  children,
  className,
  gap = 0.045,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : "hidden"}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn("min-w-0", className)}
    >
      {children}
    </motion.div>
  );
}

/** Route-level crossfade. Keyed by pathname from the caller. */
export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Swaps a formatted value with a soft ticker transition when it changes. */
export function TickerValue({ value, className }: { value: string; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{value}</span>;
  return (
    <span className={cn("relative inline-block overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Subtle hover lift for cards and interactive tiles. */
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const hover = reduced ? {} : { whileHover: { y: -2 }, whileTap: { scale: 0.995 } };
  return (
    <motion.div
      {...hover}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn("min-w-0", className)}
    >
      {children}
    </motion.div>
  );
}
