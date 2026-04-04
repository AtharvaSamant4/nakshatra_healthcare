// Mock data for the rehabilitation app

export const userStats = {
  totalSessions: 47,
  totalReps: 1284,
  streakDays: 12,
  averageAccuracy: 87,
}

export const recentSessions = [
  {
    id: 1,
    type: "Arm Exercises",
    date: "2026-04-04",
    duration: "25 min",
    reps: 45,
    accuracy: 92,
  },
  {
    id: 2,
    type: "Leg Stretches",
    date: "2026-04-03",
    duration: "30 min",
    reps: 38,
    accuracy: 88,
  },
  {
    id: 3,
    type: "Core Stability",
    date: "2026-04-02",
    duration: "20 min",
    reps: 32,
    accuracy: 85,
  },
  {
    id: 4,
    type: "Balance Training",
    date: "2026-04-01",
    duration: "15 min",
    reps: 28,
    accuracy: 90,
  },
  {
    id: 5,
    type: "Shoulder Mobility",
    date: "2026-03-31",
    duration: "22 min",
    reps: 40,
    accuracy: 86,
  },
]

export const progressData = [
  { day: "Mon", reps: 35, accuracy: 82 },
  { day: "Tue", reps: 42, accuracy: 85 },
  { day: "Wed", reps: 38, accuracy: 88 },
  { day: "Thu", reps: 45, accuracy: 87 },
  { day: "Fri", reps: 50, accuracy: 90 },
  { day: "Sat", reps: 48, accuracy: 92 },
  { day: "Sun", reps: 45, accuracy: 89 },
]

export const weeklyProgressData = [
  { week: "Week 1", sessions: 5, totalReps: 180, avgAccuracy: 78 },
  { week: "Week 2", sessions: 6, totalReps: 220, avgAccuracy: 82 },
  { week: "Week 3", sessions: 7, totalReps: 280, avgAccuracy: 85 },
  { week: "Week 4", sessions: 6, totalReps: 260, avgAccuracy: 88 },
  { week: "Week 5", sessions: 7, totalReps: 310, avgAccuracy: 91 },
]

export const aiInsights = [
  "Your posture improved by 12% this week. Keep it up!",
  "Great job on your arm exercises - accuracy is up 8%",
  "Try to maintain your 12-day streak. You're doing amazing!",
  "Your reaction time has improved by 15% since last month",
]

export const exerciseTypes = [
  { id: "arm", name: "Arm Exercises", description: "Strengthen and mobilize your arms" },
  { id: "leg", name: "Leg Stretches", description: "Improve flexibility and strength" },
  { id: "core", name: "Core Stability", description: "Build core strength and balance" },
  { id: "balance", name: "Balance Training", description: "Improve coordination and stability" },
  { id: "shoulder", name: "Shoulder Mobility", description: "Increase range of motion" },
]

export const gameResults = {
  memory: {
    bestTime: "45s",
    gamesPlayed: 23,
    averageMoves: 18,
    lastScore: 850,
  },
  reaction: {
    bestTime: "0.24s",
    gamesPlayed: 31,
    averageTime: "0.38s",
    lastScore: 920,
  },
}
