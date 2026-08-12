---
name: shadcn-component
description: Add and port shadcn/ui components with Tailwind v4 to v3 conversion. Use when you need to add new UI components, port components from algo-desk-central, or install shadcn components.
---

# shadcn/ui Component Management

You are a frontend engineer managing shadcn/ui components for the GoTrading platform. Your task is to add new components and port existing ones from the reference UI.

## Project Setup

| Property | Value |
|----------|-------|
| Target | `gotrading/frontend/` |
| Reference | `algo-desk-central/` (Tailwind v4) |
| Style | New York |
| Base Color | Zinc |
| CSS Variables | Yes |
| RSC | Enabled |

## Component Locations

| Location | Framework | Tailwind |
|----------|-----------|----------|
| `gotrading/frontend/src/components/ui/` | Next.js 14 | v3 |
| `algo-desk-central/src/components/ui/` | TanStack Start | v4 |

## Workflow

### Option 1: Install New Component (Preferred)

```bash
cd gotrading/frontend
npx shadcn@latest add <component>
```

Available components: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, data-table, date-picker, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip

### Option 2: Port from Reference

1. Copy from `algo-desk-central/src/components/ui/`
2. Apply Tailwind v4 → v3 conversions
3. Save to `gotrading/frontend/src/components/ui/`

## Tailwind v4 → v3 Conversion Rules

### CSS Variable Syntax

```tsx
// v4 (algo-desk-central)
className="origin-(--radix-dropdown-menu-content-transform-origin)"

// v3 (gotrading/frontend)
className="origin-[var(--radix-dropdown-menu-content-transform-origin)]"
```

### Arbitrary Value Syntax

```tsx
// v4
className="text-(--foreground)"
className="bg-(--background)"

// v3
className="text-[var(--foreground)]"
className="bg-[var(--background)]"
```

### Color Opacity

```tsx
// v4
className="bg-primary/50"  // Same in both

// v4 with CSS var
className="bg-(--primary)/50"

// v3 with CSS var
className="bg-[var(--primary)]/50"
```

### Container Queries (v4 only)

```tsx
// v4 - container queries
className="@container"
className="@lg:flex"

// v3 - use responsive breakpoints instead
className="lg:flex"
```

### Nested Group/Peer Selectors

```tsx
// v4
className="group-hover/sidebar:opacity-100"

// v3 - same syntax (supported)
className="group-hover/sidebar:opacity-100"
```

## Component Template

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Import from Radix or other primitives as needed
// import * as PrimitiveName from "@radix-ui/react-primitive";

interface ComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  // Add specific props
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "base-classes-here",
          className
        )}
        {...props}
      />
    );
  }
);
Component.displayName = "Component";

export { Component };
```

## Currently Installed (gotrading/frontend)

Check `gotrading/frontend/src/components/ui/` for current components:
- button, card, skeleton, badge, tabs
- scroll-area, input, label, select
- dialog, toast (sonner), chart

## Pending Migration (from algo-desk-central)

Priority components to port:
1. **Critical:** sheet, form, accordion, checkbox, popover
2. **Important:** calendar, slider, textarea, progress, tooltip
3. **Nice to have:** separator, alert, avatar, collapsible

## Port Component Checklist

When porting a component:

- [ ] Copy source file from `algo-desk-central/src/components/ui/`
- [ ] Add `"use client"` directive if using hooks/state
- [ ] Convert Tailwind v4 syntax to v3
- [ ] Verify `@/lib/utils` import works
- [ ] Check Radix UI dependency versions match
- [ ] Test component renders without errors
- [ ] Update `memory-bank/progress.md` with completion

## Common Radix Dependencies

Ensure these are installed in `gotrading/frontend/package.json`:

```json
{
  "@radix-ui/react-accordion": "^1.x",
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-dropdown-menu": "^2.x",
  "@radix-ui/react-popover": "^1.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-slot": "^1.x",
  "@radix-ui/react-tabs": "^1.x",
  "@radix-ui/react-tooltip": "^1.x"
}
```

## Example: Porting Sheet Component

```tsx
// 1. Original from algo-desk-central (Tailwind v4)
<SheetContent 
  className="origin-(--radix-dialog-content-transform-origin)"
>

// 2. Converted for gotrading/frontend (Tailwind v3)
<SheetContent 
  className="origin-[var(--radix-dialog-content-transform-origin)]"
>
```

## Troubleshooting

### "Module not found" for Radix
Install the missing Radix package:
```bash
npm install @radix-ui/react-<primitive>
```

### Styles not applying
Check that the component classes are in `tailwind.config.ts` content paths.

### Hydration mismatch
Ensure `"use client"` is at the top of the file for interactive components.
