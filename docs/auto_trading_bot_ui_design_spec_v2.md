# Auto Trading Bot — UI Design Specification v2.0
## Target Market: India | Multi-Broker | Multi-Strategy
### Prepared for: Antigravity Design Team
### Style: Dark Cinematic Fintech | Glassmorphism | Motion-First

---

## 1. Design Philosophy & Visual Language (Pinterest-Inspired)

### 1.1 Core Aesthetic: "Dark Cinematic Fintech"
Inspired by the best trading dashboard designs on Dribbble and Pinterest, the UI follows a **dark cinematic fintech** aesthetic — not the flat corporate blue of traditional banks, but a premium, immersive experience that feels like a Bloomberg Terminal meets Apple Design.

**Key Visual Principles:**
- **Deep space dark backgrounds** — not just dark gray, but near-black with subtle blue/purple ambient glows
- **Glassmorphism cards** — frosted glass panels with 1px borders and subtle inner shadows
- **Neon accent glows** — green for profit, red for loss, but with soft glow effects (not flat colors)
- **High-contrast data** — numbers pop with monospaced fonts and color-coded states
- **Cinematic depth** — layered panels with z-depth, subtle parallax, and ambient lighting

### 1.2 Color Palette (2026 Fintech Trend)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#030712` | Deepest background (near black) |
| `--bg-secondary` | `#0A0F1C` | Card backgrounds |
| `--bg-elevated` | `#111827` | Elevated panels, modals |
| `--bg-glass` | `rgba(17, 24, 39, 0.7)` | Glassmorphism panels |
| `--border-subtle` | `rgba(255, 255, 255, 0.06)` | Invisible borders |
| `--border-glow` | `rgba(59, 130, 246, 0.15)` | Active/hover borders |
| `--text-primary` | `#F8FAFC` | Headlines, key data |
| `--text-secondary` | `#94A3B8` | Labels, descriptions |
| `--text-muted` | `#475569` | Timestamps, inactive |
| `--accent-green` | `#22C55E` | Profits, active, buy, start |
| `--accent-green-glow` | `rgba(34, 197, 94, 0.2)` | Green glow effect |
| `--accent-red` | `#EF4444` | Losses, sell, stop, errors |
| `--accent-red-glow` | `rgba(239, 68, 68, 0.2)` | Red glow effect |
| `--accent-blue` | `#3B82F6` | Primary actions, links |
| `--accent-blue-glow` | `rgba(59, 130, 246, 0.2)` | Blue glow effect |
| `--accent-amber` | `#F59E0B` | Warnings, pending states |
| `--accent-purple` | `#8B5CF6` | Strategy badges, premium features |
| `--accent-cyan` | `#06B6D4` | Info states, broker indicators |

### 1.3 Typography (Modern Fintech Stack)
- **Display/Numbers**: `JetBrains Mono` or `Geist Mono` — excellent for financial data, tabular numbers
- **Headlines**: `Inter` or `Geist` — clean, modern, excellent readability at all sizes
- **Body**: `Inter` — 400 weight for readability
- **Scale**:
  - Hero Display: `48px/700` — Total Portfolio Value (with gradient text)
  - H1: `28px/600` — Page titles
  - H2: `18px/600` — Card titles
  - H3: `14px/600` — Section labels
  - Body: `14px/400` — Standard text
  - Caption: `12px/500` — Labels, timestamps
  - Mono Display: `32px/500` — Live prices, P&L figures
  - Mono Body: `13px/400` — Order details, quantities

### 1.4 Spacing & Layout (Grid System)
- **Grid**: 12-column, 24px gutter, 32px outer padding
- **Border Radius**: 
  - Cards: `16px` (larger, softer than v1)
  - Buttons: `12px`
  - Inputs: `10px`
  - Badges/Pills: `9999px`
- **Shadows**:
  - Card default: `0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)`
  - Card hover: `0 0 0 1px rgba(59,130,246,0.2), 0 8px 32px rgba(0,0,0,0.5)`
  - Glow green: `0 0 20px rgba(34,197,94,0.15)`
  - Glow red: `0 0 20px rgba(239,68,68,0.15)`
- **Transitions**: `200ms cubic-bezier(0.4, 0, 0.2, 1)` for all interactive elements

---

## 2. shadcn/ui Component Architecture

### 2.1 Recommended shadcn/ui Components (Install via CLI)
```bash
npx shadcn add button card badge avatar tabs table dialog dropdown-menu
npx shadcn add input label select switch slider separator scroll-area
npx shadcn add tooltip toast sonner skeleton accordion collapsible
npx shadcn add chart  # For Recharts integration
npx shadcn add data-table  # For TanStack Table integration
```

### 2.2 Custom shadcn/ui Theme Configuration (`globals.css`)
```css
@layer base {
  :root {
    --background: 222 47% 3%;
    --foreground: 210 40% 98%;
    --card: 222 47% 6%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 6%;
    --popover-foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 3%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 217 91% 60%;
    --radius: 0.75rem;
    --chart-1: 142 71% 45%;
    --chart-2: 217 91% 60%;
    --chart-3: 258 90% 66%;
    --chart-4: 43 96% 56%;
    --chart-5: 0 84% 60%;
  }
}
```

### 2.3 Custom Component Overrides

**Glass Card Component** (extends shadcn Card):
```tsx
// components/ui/glass-card.tsx
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GlassCard({ className, children, ...props }) {
  return (
    <Card
      className={cn(
        "bg-[#111827]/70 backdrop-blur-xl border border-white/[0.06]",
        "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        "hover:border-blue-500/20",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
```

**Glow Button Component** (extends shadcn Button):
```tsx
// components/ui/glow-button.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlowButton({ variant = "default", className, children, ...props }) {
  const glowClasses = {
    default: "shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
    success: "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]",
    danger: "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
    warning: "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]",
  };

  return (
    <Button
      className={cn(
        "rounded-xl font-semibold transition-all duration-300",
        glowClasses[variant] || glowClasses.default,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
```

---

## 3. Framer Motion Animation System

### 3.1 Animation Tokens
```typescript
// lib/animations.ts
export const animations = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  },

  // Card stagger
  cardStagger: {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  },

  // Number counter (for P&L)
  numberCount: {
    transition: { duration: 1.2, ease: "easeOut" }
  },

  // Pulse for live data
  livePulse: {
    animate: { 
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1]
    },
    transition: { duration: 2, repeat: Infinity }
  },

  // Glow pulse for active strategies
  glowPulse: {
    animate: {
      boxShadow: [
        "0 0 20px rgba(34,197,94,0.15)",
        "0 0 30px rgba(34,197,94,0.3)",
        "0 0 20px rgba(34,197,94,0.15)"
      ]
    },
    transition: { duration: 2, repeat: Infinity }
  },

  // Slide in from right (sidebar)
  slideRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },

  // Scale up (modals)
  scaleUp: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { duration: 0.2 }
  },

  // Stagger children
  stagger: {
    animate: { transition: { staggerChildren: 0.1 } }
  }
};
```

### 3.2 Key Animation Patterns

**Dashboard Card Entrance:**
```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
  whileHover={{ y: -4, transition: { duration: 0.2 } }}
>
  <GlassCard>
    {/* Card content */}
  </GlassCard>
</motion.div>
```

**Live P&L Counter:**
```tsx
import { motion, useSpring, useTransform } from "framer-motion";

function AnimatedNumber({ value }) {
  const spring = useSpring(value, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => `₹${v.toLocaleString("en-IN")}`);

  return <motion.span>{display}</motion.span>;
}
```

**Strategy Status Pulse:**
```tsx
<motion.div
  className="w-2 h-2 rounded-full bg-green-500"
  animate={{
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1]
  }}
  transition={{ duration: 1.5, repeat: Infinity }}
/>
```

**Page Transitions:**
```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

**Toast Notifications (Sonner + Framer):**
```tsx
import { toast } from "sonner";
import { motion } from "framer-motion";

toast.custom((t) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className="glass-card p-4 rounded-xl"
  >
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-sm font-medium">Strategy started successfully</span>
    </div>
  </motion.div>
));
```

---

## 4. Page Structure & Navigation

### 4.1 Global Layout (Glass Sidebar + Top Bar)
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard  Strategies  Brokers  Orders  Logs  [🔔][👤] │  ← Top Bar (68px, glass)
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  Sidebar │              Main Content Area                         │
│ (260px)  │         (Adaptive, min-width 1024px)                 │
│  Glass   │                                                      │
│          │                                                      │
│  📊 Portfolio  │                                              │
│  📈 Positions  │                                              │
│  🔔 Alerts     │                                              │
│  ⚙️ Settings   │                                              │
│  🔌 API Status │                                              │
│  ───────────── │                                              │
│  Risk Panel    │                                              │
│  Market Status │                                              │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 4.2 Top Bar Design (Glassmorphism)
- **Height**: 68px
- **Background**: `rgba(3, 7, 18, 0.8)` with `backdrop-blur-xl`
- **Border**: `1px solid rgba(255,255,255,0.06)` bottom
- **Left**: Logo + Navigation pills (active state has blue glow)
- **Right**: 
  - Market status indicator ("Market Open · 2h 14m left")
  - Notification bell with animated badge
  - User avatar dropdown

### 4.3 Sidebar Design (Collapsible Glass Panel)
- **Width**: 260px (collapsible to 72px)
- **Background**: `rgba(10, 15, 28, 0.9)` with `backdrop-blur-xl`
- **Active item**: Blue left border + subtle blue background glow
- **Hover**: `rgba(255,255,255,0.03)` background shift

---

## 5. Core Pages (Detailed Designs)

### 5.1 Dashboard (`/dashboard`) — The Command Center

#### Hero Section (Top)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Portfolio Overview                              [Start All] [⏸]│
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐│
│  │             │  │             │  │             │  │        ││
│  │  ₹45.23L    │  │  +₹12,400   │  │  7 Active   │  │ 68.4%  ││
│  │  Total AUM  │  │  Today's P&L│  │  Strategies │  │ Win Rate││
│  │  +2.3% ▲    │  │  +1.2% ▲   │  │  3 Paused   │  │ 142 trades│
│  │  [Sparkline]│  │  [Sparkline]│  │  [Mini bars]│  │ [Donut]││
│  │             │  │             │  │             │  │        ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Card Design (GlassCard):**
- Large monospaced numbers with gradient text for primary values
- Mini sparkline charts (using Recharts) at bottom of each card
- Color-coded delta badges (green glow for positive, red glow for negative)
- Hover: Card lifts up (`translateY: -4px`) + border glow intensifies

#### Strategy Performance Chart (Center)
```
┌─────────────────────────────────────────────────────────────────┐
│  Strategy Performance                    [Day] [Week] [Month] [All]│
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ₹                                                              │
│  │    ╭─╮                                                       │
│  │   ╱   ╲    ╭──╮                                              │
│  │  ╱     ╲  ╱    ╲    ╭────╮                                   │
│  │ ╱       ╲╱      ╲  ╱      ╲                                  │
│  │╱                ╲╱        ╲──────────                          │
│  └────────────────────────────────────────────────────────────   │
│     Jan   Feb   Mar   Apr   May   Jun   Jul                    │
│                                                                 │
│  ● Intraday Momentum  ● Swing Master  ● Options Scalper       │
└─────────────────────────────────────────────────────────────────┘
```

**Chart Specs:**
- Library: Recharts (AreaChart with gradient fill)
- Gradient fill: `rgba(59, 130, 246, 0.1)` to `rgba(59, 130, 246, 0)`
- Line stroke: `3px` with glow filter
- Tooltip: Glassmorphism card with animated entrance
- Legend: Interactive — click to toggle strategy visibility

#### Active Strategies Table (Bottom Left)
```
┌─────────────────────────────────────────────────────────────────┐
│  Active Strategies                          [Filter ▼] [Search] │
│  ─────────────────────────────────────────────────────────────  │
│  Strategy          Status    Broker     Capital    P&L    Win% │
│  ─────────────────────────────────────────────────────────────  │
│  🔵 Intraday Mom.  ● Running  Zerodha   ₹5L       +₹3.2K  72%  │
│  🟣 Swing Master   ● Running  Upstox    ₹3L       +₹1.8K  65%  │
│  🟢 Options Scalp  ● Running  Fyers     ₹2L       +₹890   58%  │
│  🟡 BankNifty BB   ⏸ Paused   Zerodha   ₹4L       -₹450   45%  │
│  🔴 Mean Reversion ● Error    Angel     ₹1L       --      --   │
│                                                                 │
│  [▶] [⏸] [⚙] [🗑]  ← Action buttons per row                   │
└─────────────────────────────────────────────────────────────────┘
```

**Table Specs:**
- Library: TanStack Table (React Table)
- Row hover: `rgba(255,255,255,0.03)` background
- Status dot: Animated pulse for "Running"
- Action buttons: Icon-only, tooltip on hover
- Sortable columns with animated sort indicator

#### Broker Health Panel (Bottom Right)
```
┌─────────────────────────────────────────────────────────────────┐
│  Broker Health                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  🏦 Zerodha  │  │  🏦 Upstox   │  │  🏦 Fyers    │            │
│  │  ● Connected │  │  ● Connected │  │  ● Connected │            │
│  │  45ms        │  │  62ms        │  │  38ms        │            │
│  │  ₹12.45L     │  │  ₹8.23L      │  │  ₹5.67L      │            │
│  │  24 orders   │  │  18 orders   │  │  12 orders   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Strategies Page (`/strategies`)

#### Strategy Grid (Main View)
```
┌─────────────────────────────────────────────────────────────────┐
│  My Strategies                    [+ Create] [📥 Import] [🏪 Store]│
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │  🔵 Intraday     │ │  🟣 Swing        │ │  🟢 Options      │ │
│  │  Momentum        │ │  Master          │ │  Scalper         │ │
│  │                  │ │                  │ │                  │ │
│  │  NIFTY 50        │ │  Multi-Stock     │ │  BANKNIFTY       │ │
│  │  Zerodha         │ │  Upstox          │ │  Fyers           │ │
│  │                  │ │                  │ │                  │ │
│  │  Capital: ₹5L    │ │  Capital: ₹3L    │ │  Capital: ₹2L    │ │
│  │  P&L: +₹3.2K     │ │  P&L: +₹1.8K     │ │  P&L: +₹890      │ │
│  │  Win: 72%        │ │  Win: 65%        │ │  Win: 58%        │ │
│  │                  │ │                  │ │                  │ │
│  │  [▶ Start]       │ │  [⏸ Pause]      │ │  [▶ Start]       │ │
│  │  [📊 Backtest]   │ │  [⚙ Settings]    │ │  [📊 Backtest]   │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Strategy Card Design:**
- Top-left: Strategy icon (colored circle with strategy type icon)
- Top-right: Status badge (Running = green glow pulse, Paused = amber, Error = red)
- Center: Strategy name + instrument + broker
- Bottom: Key metrics in 3-column grid
- Action buttons: Full-width Start/Pause button + secondary actions
- Hover: Card scales up slightly (`scale: 1.02`) + enhanced shadow

#### Strategy Detail Panel (Slide-over)
```
┌─────────────────────────────────────────────────────────────────┐
│  Strategy: Intraday Momentum (NIFTY)              [✕ Close]     │
│  ─────────────────────────────────────────────────────────────  │
│  ┌──────────┬──────────┬──────────┬──────────┐                   │
│  │ Overview │ Backtest │ Settings │ Logs     │                   │
│  └──────────┴──────────┴──────────┴──────────┘                   │
│                                                                 │
│  [Tab Content — Animated slide transition]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tab Animation:**
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {tabContent}
  </motion.div>
</AnimatePresence>
```

---

### 5.3 Broker Configuration Page (`/brokers`)

#### Broker Cards
```
┌─────────────────────────────────────────────────────────────────┐
│  Connected Brokers                          [+ Add Broker]      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏦 ZERODHA                                             │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                         │   │
│  │  Status:    ● Connected (pulsing green)                 │   │
│  │  Latency:   45ms ●●●○○ (signal bars)                  │   │
│  │  Account:   AB1234                                      │   │
│  │  Balance:   ₹12,45,000                                  │   │
│  │  Used:      ₹4,50,000  [████████░░░░░░░░░░] 36%         │   │
│  │  Available: ₹7,95,000                                   │   │
│  │  Today's:   24 orders | 0 errors                        │   │
│  │                                                         │   │
│  │  [🔑 API Keys] [📊 Details] [🔄 Test] [🗑 Remove]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏦 UPSTOX                                              │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                         │   │
│  │  Status:    ● Disconnected (red, static)                │   │
│  │  Last Error: API timeout (3 attempts)                   │   │
│  │  [🔄 Reconnect] [🔑 API Keys] [🗑 Remove]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Broker Card Animations:**
- Connection status dot: Pulsing animation when connected
- Latency bars: Animated fill on load
- Margin bar: Animated width on load
- Error state: Subtle red glow pulse

#### Add Broker Modal (Animated)
```tsx
<Dialog>
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
  >
    <GlassCard className="p-6 max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">Add New Broker</DialogTitle>
      </DialogHeader>

      {/* Broker Selection Grid */}
      <div className="grid grid-cols-3 gap-3 my-4">
        {brokers.map((broker) => (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-xl border border-white/10 hover:border-blue-500/50 transition-colors"
          >
            <broker.icon className="w-8 h-8 mx-auto mb-2" />
            <span className="text-xs">{broker.name}</span>
          </motion.button>
        ))}
      </div>

      {/* API Key Inputs */}
      <div className="space-y-3">
        <Input placeholder="API Key" className="bg-white/5 border-white/10" />
        <Input placeholder="API Secret" type="password" className="bg-white/5 border-white/10" />
        <Input placeholder="Redirect URL" className="bg-white/5 border-white/10" />
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1">Cancel</Button>
        <GlowButton className="flex-1">Test & Connect</GlowButton>
      </div>
    </GlassCard>
  </motion.div>
</Dialog>
```

---

### 5.4 Orders Page (`/orders`)

#### Order Book Table
```
┌─────────────────────────────────────────────────────────────────┐
│  Order Book                                                                │
│  [All] [Pending] [Executed] [Rejected] [Cancelled]            │
│  Filter: [Broker ▼] [Strategy ▼] [Symbol ▼] [Date Range 📅] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Time     | Symbol      | Type | Qty | Price   | Status    | Broker   │
│  ─────────────────────────────────────────────────────────────  │
│  09:45:12 | NIFTY       | BUY  | 50  | 22,450  | ● FILLED  | Zerodha  │
│  09:47:33 | BANKNIFTY   | SELL | 25  | 47,800  | ○ PENDING | Upstox   │
│  09:52:01 | RELIANCE    | BUY  | 100 | 2,850   | ✕ REJECTED| Fyers    │
│  10:15:22 | INFY        | BUY  | 50  | 1,650   | ● FILLED  | Zerodha  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Table Features:**
- Virtualized scrolling for >1000 rows
- Animated row entrance on new orders
- Status badges with color-coded backgrounds
- Hover: Row highlight + action buttons appear
- Click: Expand row to show order details (animated accordion)

---

### 5.5 Positions Page (`/positions`)

#### Position Cards (Grid Layout)
```
┌─────────────────────────────────────────────────────────────────┐
│  Open Positions: 7  |  Total MTM: +₹8,450 (+1.2%)            │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NIFTY 24JUL CE 22500                                  │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                         │   │
│  │  Qty: 50        |  Avg: ₹245.00    |  LTP: ₹267.00     │   │
│  │  Invested: ₹12,250  |  Current: ₹13,350  |  MTM: +₹1,100│   │
│  │                                                         │   │
│  │  [MTM Bar: ████████████████░░░░░░░░] +8.9%             │   │
│  │                                                         │   │
│  │  Broker: Zerodha  |  Strategy: Intraday Momentum         │   │
│  │                                                         │   │
│  │  [🔒 Square Off] [📈 Chart] [⚙ Modify SL]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Position Card Animations:**
- MTM bar: Animated width on load + color change based on P&L
- LTP: Number counter animation on price update
- Card: Subtle border glow matching P&L color

---

## 6. Essential UI Components (shadcn/ui + Custom)

### 6.1 Start/Stop Controls (CRITICAL — Enhanced)

**Global Controls (Dashboard Header):**
```
┌─────────────────────────────────────────────────────────────────┐
│  [▶ START ALL]  [⏸ PAUSE ALL]  [🛑 EMERGENCY STOP]          │
└─────────────────────────────────────────────────────────────────┘
```

**Button Variants:**
```tsx
// Start All — Green glow, pulsing when strategies are running
<GlowButton variant="success" size="lg" className="gap-2">
  <motion.div
    animate={{ scale: [1, 1.2, 1] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    <Play className="w-4 h-4" />
  </motion.div>
  Start All
</GlowButton>

// Emergency Stop — Red glow, requires confirmation
<GlowButton 
  variant="danger" 
  size="lg"
  onClick={() => setShowEmergencyModal(true)}
>
  <AlertTriangle className="w-4 h-4" />
  Emergency Stop
</GlowButton>
```

**Emergency Stop Modal:**
```tsx
<Dialog open={showEmergencyModal}>
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="glass-card border-red-500/30 p-6 max-w-md"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-red-400">Emergency Stop</h3>
        <p className="text-sm text-muted-foreground">This action cannot be undone</p>
      </div>
    </div>

    <div className="bg-red-500/10 rounded-lg p-4 mb-4">
      <p className="text-sm text-red-300">
        This will immediately:
      </p>
      <ul className="text-sm text-red-300 mt-2 space-y-1">
        <li>• Cancel all pending orders</li>
        <li>• Square off all open positions</li>
        <li>• Stop all running strategies</li>
      </ul>
      <p className="text-sm font-semibold text-red-400 mt-3">
        Estimated impact: 7 positions across 3 brokers
      </p>
    </div>

    <p className="text-sm text-muted-foreground mb-4">
      Type "STOP ALL" to confirm:
    </p>
    <Input 
      placeholder="STOP ALL" 
      className="bg-white/5 border-red-500/30 mb-4"
    />

    <div className="flex gap-3">
      <Button variant="outline" className="flex-1">Cancel</Button>
      <GlowButton variant="danger" className="flex-1">Confirm Stop</GlowButton>
    </div>
  </motion.div>
</Dialog>
```

### 6.2 Real-Time Data Components

**Live Ticker Bar (Top of Dashboard):**
```tsx
<div className="flex gap-6 py-2 px-4 bg-white/[0.02] border-b border-white/[0.06]">
  {tickers.map((ticker) => (
    <motion.div 
      key={ticker.symbol}
      className="flex items-center gap-2"
      animate={ticker.changed ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <span className="text-xs text-muted-foreground">{ticker.symbol}</span>
      <span className={`text-sm font-mono ${ticker.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {ticker.price.toLocaleString()}
      </span>
      <span className={`text-xs ${ticker.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {ticker.change >= 0 ? '+' : ''}{ticker.changePercent}%
      </span>
    </motion.div>
  ))}
</div>
```

**WebSocket Status Indicator:**
```tsx
<div className="flex items-center gap-2">
  <motion.div
    className="w-2 h-2 rounded-full bg-green-500"
    animate={{ 
      scale: [1, 1.3, 1],
      opacity: [1, 0.7, 1]
    }}
    transition={{ duration: 2, repeat: Infinity }}
  />
  <span className="text-xs text-green-400">Live</span>
  <span className="text-xs text-muted-foreground">· Updated 2s ago</span>
</div>
```

### 6.3 Risk Management Panel (Sidebar)
```
┌─────────────────────────────────────────────────────────────────┐
│  Risk Management                                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Daily Loss Limit                                               │
│  ₹50,000 / ₹50,000                                              │
│  [████████████████████████████████████████] 100% 🔴            │
│  ⚠️ Limit reached! All strategies paused.                     │
│                                                                 │
│  Max Open Positions                                             │
│  7 / 10                                                         │
│  [████████████████████████████░░░░░░░░░░░░] 70%               │
│                                                                 │
│  Max Capital per Strategy                                       │
│  30% per strategy                                               │
│                                                                 │
│  Circuit Breaker                                                │
│  ● Enabled                                                      │
│  Trigger: -5% portfolio drawdown                                │
│  Action: Pause all strategies                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Progress Bar Animation:**
```tsx
<motion.div
  className="h-2 rounded-full bg-white/10 overflow-hidden"
>
  <motion.div
    className={`h-full rounded-full ${getColor(percentage)}`}
    initial={{ width: 0 }}
    animate={{ width: `${percentage}%` }}
    transition={{ duration: 1, ease: "easeOut" }}
  />
</motion.div>
```

### 6.4 Notification Center (Sonner + Framer)

**Toast Types:**
```typescript
// Success toast
toast.success("Strategy started", {
  description: "Intraday Momentum is now running on Zerodha",
  icon: <motion.div animate={{ rotate: 360 }} transition={{ duration: 1 }}>
    <CheckCircle className="w-4 h-4" />
  </motion.div>
});

// Error toast
toast.error("Order rejected", {
  description: "Insufficient margin. Required: ₹25,000, Available: ₹18,500",
  icon: <XCircle className="w-4 h-4" />
});

// Warning toast
toast.warning("High latency detected", {
  description: "Upstox API latency: 320ms (normal: <100ms)",
  icon: <AlertTriangle className="w-4 h-4" />
});
```

---

## 7. India Market Specific Features (Enhanced)

### 7.1 Market Hours Widget
```
┌─────────────────────────────────────────────────────────────────┐
│  Market Status                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  NSE     ● OPEN     Closes in 2h 14m                          │
│  BSE     ● OPEN     Closes in 2h 14m                          │
│  MCX     ○ CLOSED   Opens tomorrow 9:00 AM                    │
│                                                                 │
│  [Countdown Timer: 02:14:33]                                    │
│                                                                 │
│  Next Holiday: Independence Day (15 Aug)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Broker-Specific UI Elements

**Zerodha Integration:**
- Product type selector: `[CNC]` `[MIS]` `[CO]` `[BO]` `[AMO]`
- GTT order support indicator
- Kite Connect branding

**Upstox Integration:**
- AMO toggle
- Smart order routing indicator

**Fyers Integration:**
- Bracket order builder
- Cover order toggle

### 7.3 Currency & Number Formatting
```typescript
// Indian number formatting
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

// Output: ₹12,45,000.00 (NOT ₹1,245,000.00)

// Lakhs/Crores display
const formatIndian = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return formatINR(amount);
};
```

### 7.4 SEBI Compliance Badges
```tsx
<div className="flex items-center gap-2 text-xs text-muted-foreground">
  <Shield className="w-3 h-3" />
  <span>SEBI Registered Investment Advisor</span>
  <Separator orientation="vertical" className="h-3" />
  <span>Risk Disclosure: Trading involves substantial risk</span>
</div>
```

---

## 8. Responsive Design (Mobile-First)

### 8.1 Breakpoints
| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 768px | Bottom nav, single column, cards stack, simplified dashboard |
| Tablet | 768-1024px | 2-column grid, collapsible sidebar |
| Desktop | 1024-1440px | Full layout, 3-4 column grids |
| Wide | > 1440px | Multi-panel dashboard, side-by-side views |

### 8.2 Mobile Bottom Navigation
```tsx
<div className="fixed bottom-0 left-0 right-0 bg-[#030712]/90 backdrop-blur-xl border-t border-white/[0.06] md:hidden">
  <div className="flex justify-around py-2">
    {navItems.map((item) => (
      <motion.button
        key={item.path}
        whileTap={{ scale: 0.9 }}
        className="flex flex-col items-center gap-1 p-2"
      >
        <item.icon className="w-5 h-5" />
        <span className="text-[10px]">{item.label}</span>
      </motion.button>
    ))}
  </div>
</div>
```

---

## 9. Accessibility (WCAG 2.1 AA)

- **Color-blind friendly**: Status indicators use icons + text + color
- **Keyboard navigation**: All interactive elements focusable with visible focus rings
- **Screen readers**: `aria-label` on all icon buttons, `aria-live` for status updates
- **Reduced motion**: Respect `prefers-reduced-motion` media query
- **High contrast**: All text meets 4.5:1 contrast ratio

---

## 10. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Time to Interactive | < 2.5s |
| WebSocket Reconnection | < 1.5s |
| Table Virtualization | > 1000 rows |
| Chart FPS | 60fps |
| Animation Jank | 0 frames dropped |

---

## 11. Tech Stack (Final)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4+ |
| Components | shadcn/ui (custom themed) |
| Animations | Framer Motion |
| Charts | Recharts + TradingView Lightweight Charts |
| Tables | TanStack Table (React Table) |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Icons | Lucide React |
| Notifications | Sonner |
| Date/Time | date-fns |
| Build | Vite / Next.js |
| Fonts | Inter, JetBrains Mono (Google Fonts) |

---

## 12. Recommended shadcn/ui Templates to Study

1. **Shadcn Admin** — Most popular on GitHub, collapsible sidebar, Cmd+K search
2. **Tremor** — Dashboard-focused chart components, works great with shadcn
3. **Taxonomy** — Next.js 13+ app router example with shadcn
4. **Next.js Enterprise Boilerplate** — Production-ready patterns

---

*Document Version: 2.0*
*Prepared for: Antigravity Design Team*
*Market: India (NSE, BSE, MCX)*
*Date: July 2026*
*Style: Dark Cinematic Fintech | Glassmorphism | Motion-First*
