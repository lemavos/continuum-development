/**
 * Service Worker for background timer functionality
 * Runs timer even when app is in background
 */

let activeTimer = null;
let timerInterval = null;

/**
 * Service Worker for background timer functionality
 * Runs timer even when app is in background
 */

let activeTimer = null;
let timerInterval = null;

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'START_TIMER') {
    console.log('Service Worker: Starting timer', data);
    activeTimer = {
      timerId: data.timerId,
      entityId: data.entityId,
      startTime: data.startTime,
      initialElapsed: data.initialElapsed || 0,
    };

    // Start local timer with delta calculation
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (activeTimer) {
        const elapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.initialElapsed;
        // Notify all clients about the update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'TIMER_UPDATE',
              data: { elapsedSeconds: elapsed }
            });
          });
        });
      }
    }, 1000); // Update every second for background sync
  }
  else if (type === 'STOP_TIMER') {
    console.log('Service Worker: Stopping timer');
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    // Calculate final elapsed time
    const finalElapsed = activeTimer ?
      Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.initialElapsed : 0;

    activeTimer = null;

    // Notify clients that timer stopped
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'TIMER_STOPPED',
          data: { finalElapsed }
        });
      });
    });
  }
  else if (type === 'GET_TIMER_STATUS') {
    const status = activeTimer ? {
      timerId: activeTimer.timerId,
      entityId: activeTimer.entityId,
      elapsedSeconds: Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.initialElapsed,
      isActive: true
    } : null;

    event.ports[0].postMessage({
      type: 'TIMER_STATUS',
      data: status
    });
  }
});

// Periodic sync for syncing timer with backend (every 30 seconds)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-timer' && activeTimer) {
    const elapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.initialElapsed;

    event.waitUntil(
      fetch('/api/time-tracking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeTimer.timerId,
          elapsedSeconds: elapsed
        })
      }).catch(err => console.error('Background sync failed:', err))
    );
  }
});

// Handle app termination
self.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});
