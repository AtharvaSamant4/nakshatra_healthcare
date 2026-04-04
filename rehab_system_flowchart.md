# AI-Powered Rehabilitation System — System Flowchart

## Overview

This flowchart describes the complete pipeline of the AI-powered rehabilitation system, covering physical joint recovery tracking via pose detection and cognitive memory improvement through the integrated memory game module.

---

## Mermaid Flowchart

```mermaid
flowchart TD
    %% ── Entry ──────────────────────────────────────────────────────────────
    START([🟢 START]):::oval --> UI

    %% ── User Interface ──────────────────────────────────────────────────────
    UI[/User Interface\nWeb App/]:::parallelogram --> AUTH

    AUTH{User\nAuthenticated?}:::diamond
    AUTH -- No --> LOGIN[Login / Register]:::rect --> UI
    AUTH -- Yes --> SEL

    SEL[Select Mode:\nPhysical Rehab ⟵⟶ Cognitive Game]:::rect

    %% ── PHYSICAL REHAB BRANCH ───────────────────────────────────────────────
    SEL -- Physical\nRehab --> CAM

    CAM[/📷 Camera Input\nWebcam Stream/]:::parallelogram --> POSE

    POSE[Pose Detection\nMediaPipe Holistic/Pose]:::rect --> VIS

    VIS{Landmark\nVisibility ≥ Threshold?}:::diamond
    VIS -- No --> CAM
    VIS -- Yes --> LAND

    LAND[Landmark Extraction\nShoulder · Elbow · Wrist\nHip · Knee · Ankle]:::rect --> ANGLE

    ANGLE[Angle Calculation Module\narccos dot-product of joint vectors]:::rect --> SMOOTH

    %% ── Data Processing Layer ───────────────────────────────────────────────
    subgraph DPL [" 🔧  Data Processing Layer "]
        direction TB
        SMOOTH[Angle Smoothing\nMoving Average Filter]:::rect --> NOISE
        NOISE[Noise Filtering\nSpike Removal]:::rect --> DIR
        DIR[Direction Detection\nUP / DOWN Movement]:::rect --> SM
        SM[State Machine\nUP · DOWN · TRANSITION stages]:::rect --> HYS
        HYS{Hysteresis\nThreshold Check?}:::diamond
        HYS -- Not met --> DEBOUNCE
        HYS -- Met --> RANGE
        DEBOUNCE[Time Debouncing\nIgnore transient triggers]:::rect --> SM
        RANGE{Range Validation\nFull Rep Detected?}:::diamond
    end

    ANGLE --> SMOOTH
    RANGE -- No --> SM
    RANGE -- Yes --> REP

    %% ── Rep Counting Engine ─────────────────────────────────────────────────
    REP[Rep Counting Engine\nIncrement counter · Log timestamp]:::rect --> FB

    %% ── Real-Time Feedback ──────────────────────────────────────────────────
    FB[/Real-Time Feedback\nText overlay · Audio cue/]:::parallelogram --> CONT

    CONT{Continue\nExercise Session?}:::diamond
    CONT -- Yes --> CAM
    CONT -- No --> PROG

    %% ── COGNITIVE BRANCH ────────────────────────────────────────────────────
    SEL -- Cognitive\nGame --> MEM

    MEM[Cognitive Module\nMemory Game Engine]:::rect --> SCORE

    SCORE[Score Calculation\nAccuracy · Reaction Time · Streak]:::rect --> PROG

    %% ── Progress & Storage ──────────────────────────────────────────────────
    PROG[Progress Tracking & Analytics\nGraphs · Session Reports · Trends]:::rect --> STORE

    STORE[(Data Storage\nLocal / Cloud DB\nOptional)]:::rect --> DASH

    DASH[/Dashboard Output\nVisualise Progress/]:::parallelogram --> END

    END([🔴 END]):::oval

    %% ── Real-Time Loop annotation ───────────────────────────────────────────
    FB -.->|Real-Time Loop| CAM

    %% ── Styles ──────────────────────────────────────────────────────────────
    classDef oval     fill:#2E86AB,stroke:#1a5276,color:#fff,rx:40,ry:40
    classDef rect     fill:#1B4F72,stroke:#154360,color:#fff
    classDef diamond  fill:#117A65,stroke:#0E6655,color:#fff
    classDef parallelogram fill:#6C3483,stroke:#5B2C6F,color:#fff

    style DPL fill:#0d1b2a,stroke:#2E86AB,stroke-width:2px,color:#aad4f5
```

---

## Symbol Key

| Symbol | Mermaid Shape | Meaning |
|---|---|---|
| **Oval** `([…])` | Rounded pill | Start / End |
| **Rectangle** `[…]` | Box | Process / Module |
| **Diamond** `{…}` | Rhombus | Decision / Conditional check |
| **Parallelogram** `[/…/]` | Skewed box | Input / Output |
| **Cylinder** `[(…)]` | Database | Data storage |
| **Subgraph** | Bordered region | Grouped sub-system |

---

## Module Descriptions

### 1 · User Interface (Web App)
Entry point for the patient/therapist. Handles authentication and mode selection between physical rehabilitation and the cognitive memory game.

### 2 · Camera Input (Webcam)
Captures the live video feed used for real-time pose analysis. Feeds frames continuously into the pose detection pipeline.

### 3 · Pose Detection — MediaPipe
Google MediaPipe Pose/Holistic model runs inference on each frame to produce 33 body-landmark coordinates with per-landmark visibility scores.

### 4 · Landmark Extraction
Selects clinically relevant joints (shoulder, elbow, wrist, hip, knee, ankle) from the full landmark set for downstream processing.

### 5 · Angle Calculation Module
Computes the interior angle at each joint using the dot-product formula applied to the two bone vectors meeting at that joint.

### 6 · Data Processing Layer

| Sub-module | Purpose |
|---|---|
| **Angle Smoothing** | N-frame moving average reduces jitter |
| **Noise Filtering** | Discards spike values outside ±σ threshold |
| **Visibility Check** | Drops frames where landmark confidence < threshold |
| **Direction Detection** | Determines whether joint is moving up or down |
| **State Machine** | Tracks UP / DOWN / TRANSITION stages |
| **Hysteresis Threshold** | Prevents rapid oscillation around the rep boundary |
| **Time Debouncing** | Enforces minimum time between valid rep triggers |
| **Range Validation** | Confirms a rep only when full ROM is completed |

### 7 · Rep Counting Engine
Increments the exercise repetition counter and logs the timestamp whenever the Data Processing Layer confirms a complete rep.

### 8 · Cognitive Module
Presents the memory game, collects player responses, and calculates a composite cognitive score based on accuracy, reaction time, and streak length.

### 9 · Real-Time Feedback System
Delivers immediate corrective feedback as on-screen text overlays and optional audio cues (e.g., "Straighten your elbow", "Good rep!").

### 10 · Progress Tracking & Analytics
Aggregates session data into time-series graphs, ROM trend reports, cognitive score history, and exportable session summaries.

### 11 · Data Storage
Persists session records locally (browser IndexedDB / localStorage) or to a cloud database for longitudinal tracking and therapist review.

---

## Real-Time Loop

The dashed arrow from **Real-Time Feedback → Camera Input** represents the continuous processing loop that runs at the webcam frame rate (typically 30 fps), ensuring sub-second latency between movement and feedback.

---

## Rendering Instructions

Paste the fenced Mermaid block above into any of the following tools to render the diagram:

- **GitHub / GitLab** — Natively renders `mermaid` code blocks in Markdown files
- **[Mermaid Live Editor](https://mermaid.live)** — Paste and export as SVG/PNG
- **[draw.io](https://app.diagrams.net)** — Import via Extras → Edit Diagram
- **Notion / Confluence** — Use the Mermaid diagram block
- **VS Code** — Install the *Markdown Preview Mermaid Support* extension
