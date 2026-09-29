import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let peerCount = 0;

io.on('connection', (socket) => {
  peerCount++;
  io.emit('peer-count', peerCount);

  socket.on('chat-message', (msg) => {
    // Broadcast the message to all OTHER connected clients
    socket.broadcast.emit('chat-message', msg);
  });

  socket.on('disconnect', () => {
    peerCount--;
    io.emit('peer-count', peerCount);
  });
});

// Serve static files from the Vite build output directory
const distPath = join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA fallback
  app.get(/.*/, (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
} else {
  app.get(/.*/, (req, res) => {
    res.send('Backend is running! Please run "npm run build" to serve the frontend.');
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
