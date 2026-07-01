# Design Specifications - Glassmorphism UI (모두의 외근)

This document defines the visual design system, color tokens, and layout guidelines for applying Glassmorphism aesthetics across the "모두의 외근" application.

---

## 1. Color System

### Base Colors
- **Primary**: `#4F8EF7` (Soft Bright Blue) - Highlights, active navigation states, primary buttons
- **Secondary**: `#5BAE85` (Mint/Emerald Green) - Secondary callouts, success status
- **Text (Dark)**: `#1F2937` (Dark Navy/Slate 800) - Title and content text requiring strong contrast
- **Text (Gray)**: `#6B7280` (Slate 500) - Secondary information, subtitles, labels

### Background Gradient
- **Page Background**: `linear-gradient(135deg, #EAF3FF 0%, #F1F8F0 100%)`
  - A diagonal, soft pastel gradient flowing from top-left (light blue) to bottom-right (light green-yellow).

### Customer Status Colors
These status colors are used in map pins, status badges, and dashboard summary charts.
- **미방문 (Unvisited)**: `#E87B72` (Coral Red)
- **진행중 (In Progress)**: `#F2B84B` (Soft Yellow-Orange)
- **완료 (Completed)**: `#5B9CF6` (Soft Blue)
- **취소 (Cancelled / Address Error)**: `#9AA3AF` (Neutral Gray)

---

## 2. Glassmorphism Specifications

### Glass Cards (`.glass-card`)
- **Background**: `rgba(255, 255, 255, 0.6)`
- **Backdrop Blur**: `backdrop-filter: blur(20px)`
- **Border**: `1.5px solid rgba(79, 142, 247, 0.18)`
- **Border Radius**: `20px`
- **Box Shadow**: `0 8px 32px 0 rgba(31, 38, 135, 0.08)`
- **Hover/Interaction Overlay**: Slight opacity increase to `rgba(255, 255, 255, 0.8)` on hover/focus.

### Glass Header & Nav Bar (`.glass-header`, `.glass-nav`)
- **Background**: `rgba(255, 255, 255, 0.45)`
- **Backdrop Blur**: `backdrop-filter: blur(24px)`
- **Border (Header - Bottom)**: `1px solid rgba(255, 255, 255, 0.6)`
- **Border (BottomNav - Top)**: `1px solid rgba(255, 255, 255, 0.6)`
- **Box Shadow**: Soft shadow to prevent page scroll bleed.

---

## 3. Typography & Spacing

- **Primary Font**: `Noto Sans KR`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Layout Margins**:
  - Content padding: `16px` (or `20px` depending on screen context)
  - Card-to-card vertical margin: `16px`
  - Button radius: `14px`
  - Input form radius: `12px`
- **Dimensions**:
  - Header Height: `56px` + safe-area-top
  - Bottom Tabnav Height: `64px` + safe-area-bottom
