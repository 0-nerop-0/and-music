# 🎨 Design Reference - Mei Music Desktop

## Color Palette (Material 3 Dark)

```css
/* Main Backgrounds */
--surface:           #1c1b1f   /* Primary background */
--surface-container: #211f26   /* Cards, panels, sidebar */
--surface-bright:    #3b383e   /* Hover states */
--surface-dim:       #141218   /* Deep backgrounds */

/* Accent Colors */
--primary:           #d0bcff   /* Purple accent */
--primary-container: #4f378b   /* Primary background */
--secondary:         #ccc2dc   /* Secondary accent */
--secondary-container: #4a4458 /* Secondary background */

/* Status Colors */
--error:             #f2b8b5   /* Error text */
--error-container:   #8c1d18   /* Error background */
```

---

## UI Components

### Sidebar Navigation

```
┌───────────────────┐
│                   │
│  Mei Music        │  ← Logo / Title
│                   │
│  ┌──────────────┐ │
│  │ 📚 Library   │ │  ← Active (primary-container bg)
│  └──────────────┘ │
│                   │
│  📋 Playlists     │  ← Hover (surface-bright bg)
│  ⏱ Queue         │
│                   │
│  ── My Playlists ─│  ← Divider
│                   │
│  🎵 Favorites     │  ← Custom playlists
│  🔥 Workout       │     with colored avatars
│  🌙 Chill        │
│                   │
│ ┌────────────────┐│
│ │ Add Folder    ││  ← Primary button
│ └────────────────┘│
└───────────────────┘
```

### Bottom Player (Collapsed)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌───┐                                                           │
│  │🎵│  Song Title              ⏮ ▶ ⏭    🔊 ▬▬▬▬▬▬▬▬          │
│  └───┘  Artist Name             ━━━━━━━━━━━━━━━━━━             │
│         0:00                    2:34 / 3:45                     │
└─────────────────────────────────────────────────────────────────┘
```

### Fullscreen Player (Expanded)

```
┌─────────────────────────────────────────────────────────────────┐
│                    [Blur backdrop from album cover]              │
│                                                                  │
│                         ▼ (swipe down)                           │
│                                                                  │
│                    ┌─────────────────┐                          │
│                    │                 │                          │
│                    │   Album Art     │  ← Large cover (300x300)│
│                    │   (with shadow) │                          │
│                    │                 │                          │
│                    └─────────────────┘                          │
│                                                                  │
│                    Song Title Here                               │
│                    Artist Name                                   │
│                                                                  │
│                    ━━━━━━━━━━━━━━━━━━━━                        │
│                    2:34              3:45                        │
│                                                                  │
│                    ⏮   ▶   ⏭                                   │
│                                                                  │
│                    🔁  🔀  ❤️                                  │
│                                                                  │
│                    Track Volume  ▬▬▬▬▬▬▬▬                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Library View (Track List)

```
┌─────────────────────────────────────────────────────────────────┐
│  Library                                      🔍 Search tracks...│
│                                                                  │
│  ┌─┬──────────────────┬─────────────┬─────────────┬──────┐    │
│  │#│ Title            │ Artist      │ Album       │ Time │    │
│  ├─┼──────────────────┼─────────────┼─────────────┼──────┤    │
│  │🎵│ Blinding Lights │ The Weeknd  │ After Hours │ 3:20 │    │
│  │🎵│ Levitating      │ Dua Lipa    │ Future Nos..│ 3:23 │    │
│  │🎵│ Save Your Tears │ The Weeknd  │ After Hours │ 3:35 │    │
│  │  │                  │             │             │      │    │
│  │  │   (Virtualized list - 10,000+ tracks)        │      │    │
│  │  │                  │             │             │      │    │
│  └─┴──────────────────┴─────────────┴─────────────┴──────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Context Menu (Right Click)

```
┌──────────────────────────┐
│ ▶ Play Now               │
│ ➕ Add to Queue          │
│ ➕ Add to Playlist       │
│ ─────────────────────────│
│ 🔊 Adjust Track Volume   │
│ ℹ️ Show File Location    │
│ 🗑️ Remove from Library   │
└──────────────────────────┘
```

### Playlist Grid

```
┌─────────────────────────────────────────────────────────────────┐
│  Playlists                                         + New Playlist│
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ 💜      │  │ 💙      │  │ 💚      │  │ 🧡      │          │
│  │         │  │         │  │         │  │         │          │
│  │Favorites│  │ Workout │  │  Chill  │  │  Party  │          │
│  │ 42 songs│  │ 28 songs│  │ 15 songs│  │ 67 songs│          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Animations

### Bottom Player Expand

```
State 1: Collapsed (height: 80px)
   ↓ (click anywhere on player)
   ↓ [Spring animation: cubic-bezier(0.34, 1.56, 0.64, 1)]
   ↓
State 2: Fullscreen (height: 100vh)
```

**Framer Motion code:**
```typescript
<motion.div
  initial={{ height: 80 }}
  animate={{ height: isExpanded ? '100vh' : 80 }}
  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
/>
```

### Track Row Hover

```
Default:     bg-transparent
   ↓ (hover)
   ↓ [150ms ease-out]
   ↓
Hover:       bg-surface-bright (20% opacity)
```

### Blur Backdrop Effect

```css
.fullscreen-player-backdrop {
  position: fixed;
  inset: 0;
  background-image: url(album-cover.jpg);
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.4) saturate(1.5);
  transform: scale(1.2);  /* Prevent blur edge artifacts */
}
```

---

## Typography Scale

```css
/* Headings */
h1 { font-size: 32px; font-weight: 700; line-height: 1.2; }  /* Page titles */
h2 { font-size: 24px; font-weight: 600; line-height: 1.3; }  /* Section titles */
h3 { font-size: 18px; font-weight: 600; line-height: 1.4; }  /* Card titles */

/* Body */
body { font-size: 14px; font-weight: 400; line-height: 1.5; }
small { font-size: 12px; font-weight: 400; line-height: 1.4; }

/* Special */
.track-title { font-size: 14px; font-weight: 500; }
.artist-name { font-size: 12px; font-weight: 400; opacity: 0.7; }
```

---

## Spacing System (Tailwind)

```css
gap-1  → 4px   /* Tight spacing */
gap-2  → 8px   /* Controls, icons */
gap-3  → 12px  /* Default */
gap-4  → 16px  /* Card padding */
gap-6  → 24px  /* Section spacing */
gap-8  → 32px  /* Major sections */

p-4   → 16px   /* Card padding */
p-6   → 24px   /* Page padding */
```

---

## Border Radius

```css
rounded-lg    → 12px   /* Cards, buttons */
rounded-full  → 9999px /* Pills, avatar */
rounded-xl    → 16px   /* Modals */
```

---

## Shadows (Elevation)

```css
/* Material 3 uses NO drop shadows, only surface colors */
/* Elevation is shown through background color changes: */

Level 0: surface          (#1c1b1f)
Level 1: surface-container (#211f26)  ← Sidebar, cards
Level 2: surface-bright    (#3b383e)  ← Hover states
```

---

## Icons

**Library:** lucide-react (20px default)

```typescript
import { 
  Music,      // 🎵 Music notes
  Play,       // ▶ Play button
  Pause,      // ⏸ Pause button
  SkipForward,// ⏭ Next
  SkipBack,   // ⏮ Previous
  Volume2,    // 🔊 Volume
  ListMusic,  // 📋 Playlist
  Clock,      // ⏱ Queue
  Search,     // 🔍 Search
  Heart,      // ❤️ Favorite
  Repeat,     // 🔁 Repeat
  Shuffle     // 🔀 Shuffle
} from 'lucide-react'
```

---

## Motion Principles

### 1. Purposeful
Every animation serves a function (not decoration)

### 2. Spring-based
Natural, physics-based motion (not linear)

### 3. Fast
- Micro-interactions: 150ms
- Layout changes: 300ms
- Page transitions: 400ms

### 4. Consistent
Same easing curve throughout app:
```css
cubic-bezier(0.34, 1.56, 0.64, 1)  /* Spring effect */
```

---

## Responsive Breakpoints

```css
/* Desktop-first (no mobile in v1) */
min-width: 1024px  /* Minimum supported width */
max-width: none    /* No maximum */
```

---

## Accessibility

### Color Contrast
- Text on surface: AAA (7:1)
- Primary on primary-container: AA (4.5:1)

### Focus States
```css
focus:ring-2 focus:ring-primary focus:outline-none
```

### Keyboard Navigation
- Tab: Navigate through controls
- Space: Play/Pause
- Arrow keys: Seek (left/right), Volume (up/down)
- Enter: Select track

---

## Design Inspirations

### Reference Images (Mental Model)

**Mei Music (Chinese App)**
- Blur backdrop in fullscreen player
- Clean track list with covers
- Spring animations
- Material You colors

**Apple Music (macOS)**
- Sidebar navigation
- Track grid/list toggle
- Now Playing view

**Spotify (Desktop)**
- Bottom player controls
- Queue panel
- Playlist management

---

## Implementation Notes

### Album Cover Blur
1. Load cover image into `<img>`
2. Extract as Base64 or URL
3. Apply as `background-image` to backdrop div
4. Use CSS `filter: blur(60px)`

### Dominant Color Extraction
```typescript
// Use canvas to sample album cover
const img = new Image()
img.src = coverUrl
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
ctx.drawImage(img, 0, 0, 1, 1)
const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
// Use rgb(r, g, b) as accent color
```

### Smooth Progress Bar
```typescript
// Update every frame, not every second
const animate = () => {
  setProgress(audioPlayer.getCurrentTime())
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
```

---

This design system ensures **visual consistency** across all components! 🎨
