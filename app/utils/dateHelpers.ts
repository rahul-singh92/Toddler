export function getWeekNumber(date: Date): number {
  const firstDayofYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - firstDayofYear.getTime()) / 86400000;
  return Math.ceil((pastDays + firstDayofYear.getDay() + 1) / 7);
}

export function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const weekDates = [];
  
  for (let i = -1; i <= 3; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    weekDates.push(date);
  }
  
  return weekDates;
}

export function isThisWeek(date: Date): boolean {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const todayDay = todayStart.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  const mondayStart = new Date(todayStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
  
  const sundayEnd = new Date(mondayStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
  
  return date >= mondayStart && date <= sundayEnd;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

export function isThisMonth(date: Date): boolean {
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}
