// Notification utility for workout reminders

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function scheduleWorkoutNotification(date: Date, workoutName: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Schedule notification for 11:45 AM
  const notificationTime = new Date(date);
  notificationTime.setHours(11, 45, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  const now = new Date();
  if (notificationTime <= now) {
    notificationTime.setDate(notificationTime.getDate() + 1);
  }

  const timeUntilNotification = notificationTime.getTime() - now.getTime();

  // Only schedule if it's within 24 hours
  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      // Check if workout is still not completed before showing notification
      const todayStr = new Date().toISOString().split('T')[0];
      const workoutStatus = localStorage.getItem(`workout_${todayStr}`);
      const hasCompleted = localStorage.getItem(`workout_data_${todayStr}`);
      
      if (workoutStatus !== 'completed' && !hasCompleted) {
        new Notification('💪 Missed Workout Reminder', {
          body: `Don't forget your ${workoutName} workout today!`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `workout-${todayStr}`,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        });
      }
    }, timeUntilNotification);
  }
}

export function cancelWorkoutNotification(date: Date): void {
  // Cancel any scheduled notifications for this date
  if ('Notification' in window && Notification.permission === 'granted') {
    const todayStr = date.toISOString().split('T')[0];
    // Notifications with the same tag will replace each other
    // We can't directly cancel setTimeout, but we can prevent it from showing
    // by checking completion status in the notification handler
  }
}

export async function showWorkoutReminder(workoutName: string): Promise<void> {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return;
    }
  }

  const notificationOptions: NotificationOptions = {
    body: `Time for your ${workoutName} workout! Don't forget to complete it.`,
    tag: 'workout-reminder',
    requireInteraction: false,
  };

  // Add icon and badge if available (won't break if files don't exist)
  try {
    notificationOptions.icon = '/icon-192x192.png';
    notificationOptions.badge = '/icon-192x192.png';
  } catch (e) {
    // Icon files optional
  }

  // Add vibrate if supported (mobile)
  if ('vibrate' in navigator) {
    notificationOptions.vibrate = [200, 100, 200];
  }

  new Notification('💪 Workout Reminder', notificationOptions);
}

