// Einstiegspunkt für das Backend (Express)

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const leadRoutes = require('./routes/leadRoutes');
const crawlerJobRoutes = require('./routes/crawlerJobRoutes');
const scoringRoutes = require('./routes/scoringRoutes');
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const socketService = require('./services/socketService');

const io = new Server(server, {
  cors: {
    origin: "*", // Erlaubt alle Ursprünge im Entwicklungsmodus
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Akquise-Tool Backend läuft!');
});

app.use('/api/leads', leadRoutes);
app.use('/api/crawler', crawlerJobRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/auth', authRoutes);

authController.initAdmin();

// Socket.io an den Socket-Service übergeben
socketService.initializeSocket(io);

// Export für andere Module
module.exports = { app };

server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log(`Socket.io-Server läuft auf Port ${PORT}`);
}); 