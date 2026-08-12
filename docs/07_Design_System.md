# Design System Document

## Colors (Dark Mode First)
*   **Primary Background:** `#0F172A` (Slate 900 - Easy on eyes for long sessions)
*   **Secondary Surface:** `#1E293B` (Slate 800 - Cards and Modals)
*   **Accent / Brand:** `#3B82F6` (Blue 500)
*   **Success (Profit):** `#10B981` (Emerald 500 - For positive MTM)
*   **Error (Loss):** `#EF4444` (Red 500 - For negative MTM)
*   **Text Primary:** `#F8FAFC` (Slate 50)
*   **Text Secondary:** `#94A3B8` (Slate 400)

## Typography (Inter Font)
*   **H1 (Page Titles):** 24px, Bold, Slate 50
*   **H2 (Section Headers):** 18px, Semi-Bold, Slate 200
*   **Body (Tables/Data):** 14px, Regular, Mono-spaced (for numbers to prevent layout shift)
*   **Caption (Tooltips):** 12px, Regular, Slate 400

## Components
*   **Microphone Button:** Fixed at bottom center. Large hit area (64x64px). Pulses Red when recording.
*   **Data Tables:** Zebra striped `bg-slate-800` and `bg-slate-800/50`. Sticky headers. Monospace font for price columns.
*   **Cards:** 1px `border-slate-700`, rounded-lg `rounded-lg`, subtle shadow.
*   **Dialogs (Modals):** Glassmorphism effect `backdrop-blur-sm bg-slate-900/80` to keep context of the market visible behind the modal.
