export function calculateMotivationalAnalytics(activityLog: { date: string, problems_solved: number }[], totalProblems: number, solvedCount: number) {
  // Sort descending by date
  const sorted = [...activityLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate weighted rolling 14 days
  let weightedPoints = 0;
  let totalWeights = 0;
  const now = new Date();
  
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const record = sorted.find(r => r.date === dateStr);
    const weight = 14 - i; // Recent days matter more
    totalWeights += weight;
    
    if (record) {
      weightedPoints += (record.problems_solved * weight);
    }
  }
  
  const weightedDailyAverage = Math.max((weightedPoints / totalWeights) || 0, 1); // Minimum 1 problem/day pace
  const pace = Math.round(weightedDailyAverage);
  
  const remaining = Math.max(0, totalProblems - solvedCount);
  const expectedFinishDays = Math.ceil(remaining / pace);
  
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + expectedFinishDays);
  
  // Dynamic Quote logic
  let quote = "Keep the momentum going!";
  if (pace >= 3) quote = "You're on fire! Unstoppable pace.";
  else if (pace >= 2) quote = "Consistent progress. The finish line is near.";
  else if (pace === 1 && activityLog.length > 0) quote = "Slow and steady wins the race. Keep chipping away.";
  else quote = "Time to build momentum. Let's solve one problem today!";
  
  return {
    targetToday: pace,
    currentPace: pace,
    remainingProblems: remaining,
    expectedFinishDate: expectedFinishDays === 0 ? "Today" : finishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    quote
  };
}
