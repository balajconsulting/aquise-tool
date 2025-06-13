// Socket-Service zur Vermeidung zirkulärer Abhängigkeiten
let io = null;

// Globale Zustände für die Scoring-Queue
let currentQueue = [];
let currentLead = null;
let scoringResults = [];
let progressData = { processed: 0, total: 0 };

// Socket.io-Instanz initialisieren
function initializeSocket(socketIo) {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('Neuer Client verbunden');
    
    // Beim Beitreten aktuellen Status senden
    socket.emit('scoring-status-update', getScoringStatus());
    
    socket.on('disconnect', () => {
      console.log('Client getrennt');
    });
  });
}

// Hilfsfunktion zum Abrufen des aktuellen Scoring-Status
function getScoringStatus() {
  return {
    queue: currentQueue,
    current: currentLead,
    results: scoringResults,
    progress: progressData
  };
}

// Hilfsfunktion zum Senden von Status-Updates an alle Clients
function broadcastScoringStatus(status) {
  // Aktualisiere die globalen Zustände
  if (status.queue) currentQueue = status.queue;
  if (status.current) currentLead = status.current;
  if (status.results) scoringResults = status.results;
  if (status.progress) progressData = status.progress;
  
  // Broadcast an alle verbundenen Clients
  if (io) {
    console.log('[SocketService] Sende scoring-status-update an Clients:', io.engine.clientsCount, JSON.stringify(getScoringStatus()));
    io.emit('scoring-status-update', getScoringStatus());
  }
}

module.exports = {
  initializeSocket,
  broadcastScoringStatus,
  getScoringStatus
}; 