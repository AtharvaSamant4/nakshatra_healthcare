# Target User Persona

> Who we're building for and how it shapes every design decision.

---

## Primary User: Rehabilitation Patient

### Profile

| Attribute | Details |
|---|---|
| **Who** | Physiotherapy patient recovering from injury or surgery |
| **Age range** | 25–65+ (wide range, skews older) |
| **Tech comfort** | Low to moderate — can use a web browser but not power users |
| **Context** | At home, doing prescribed rehab exercises between clinic visits |
| **Device** | Laptop or desktop with webcam (not mobile) |
| **Motivation** | Wants to recover but exercises are boring and lonely without a therapist |
| **Pain points** | Unsure if they're doing exercises correctly, no feedback between appointments, hard to track progress |

### Example Users

1. **Ravi, 34** — ACL reconstruction recovery, 4 weeks post-op. Needs knee extension and flexion exercises. Forgets to exercise daily.
2. **Priya, 58** — Frozen shoulder rehabilitation. Struggles with overhead movements. Needs encouragement and clear instructions.
3. **Arjun, 42** — Wrist fracture recovery. Doing range-of-motion exercises. Wants to see if he's improving week over week.

---

## What This Means for the Product

### UX Implications

| Principle | Implementation |
|---|---|
| **Simple, not clever** | Big buttons, clear labels, no jargon. "Start Exercise" not "Initialize Session" |
| **Encouraging tone** | AI feedback is positive-first. Never say "you performed poorly" |
| **Visual progress** | Charts showing improvement over time — even small gains should feel significant |
| **Minimal steps** | Exercise flow: pick exercise → start → do it → see results. 3 clicks max |
| **Large text + high contrast** | Older users may have reduced vision. Avoid small grey text |
| **Clear webcam instructions** | Users may not be comfortable with webcam. Explain what's happening and that no video is stored |
| **Forgiving error states** | If webcam fails, don't show a cryptic error. Show a friendly message with instructions |

### Language & Tone

| Do | Don't |
|---|---|
| "Great job! You completed 12 reps" | "Session metrics: 12 repetitions logged" |
| "Your shoulder is moving 5° further this week!" | "avg_angle increased by 5.0" |
| "Let's try 2 more reps next time" | "Target not met. Increase reps" |
| "Take a break if you feel pain" | — (always include safety messaging) |

### Accessibility Considerations (V1 Minimum)

- Large, clickable targets (44px+ touch/click areas)
- High contrast text (WCAG AA minimum)
- Clear visual feedback during exercises (green = good form, red = adjust)
- No reliance on audio-only cues
- Loading states that explain what's happening ("Setting up your camera...")

---

## Secondary User: Physiotherapist (Future)

Not in V1, but good to keep in mind:
- Would want to assign exercises to patients
- Would want to view patient progress remotely
- Would want to customize exercise parameters

For V1, the app is **self-directed** — the patient chooses and does exercises independently.

---

## Non-Users (Out of Scope)

- **System administrators** — no admin panel
- **Insurance companies** — no reporting/billing
- **Other clinicians** — no multi-provider support
- **Caregivers/family** — no shared access
