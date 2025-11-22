// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Locked In';
  const options = {
    body: data.body || 'You have a notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'workout-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/gym');
    })
  );
});

