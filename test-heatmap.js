// Test script for heatmap generation
const generateWeeklyHeatmap = (heatmapData, historyDays = 90) => {
  const today = new Date();
  const weeks = {};

  // Calculate start date based on plan limits
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - historyDays + 1);

  // Generate all dates within the history limit
  for (let i = 0; i < historyDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate week key (YYYY-MM-DD of Sunday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = {};
    }

    weeks[weekKey][dayOfWeek] = {
      date: dateStr,
      count: heatmapData[dateStr] || 0
    };
  }

  return weeks;
};

// Test data
const testHeatmap = {
  "2024-04-15": 1, // Monday
  "2024-04-16": 2, // Tuesday
  "2024-04-17": 1, // Wednesday
  "2024-04-18": 0, // Thursday
  "2024-04-19": 3, // Friday
  "2024-04-20": 1, // Saturday
  "2024-04-21": 2, // Sunday
};

const result = generateWeeklyHeatmap(testHeatmap, 30);
console.log('Heatmap result:', JSON.stringify(result, null, 2));