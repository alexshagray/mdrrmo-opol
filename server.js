import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// HTTP trigger endpoint to route Twilio incoming call events to the connected clients
app.post('/api/incoming-call', (req, res) => {
  const { phoneNumber } = req.body;
  console.log('[Socket] Incoming emergency call trigger received for number:', phoneNumber);
  io.emit('incoming_emergency_call', { phoneNumber });
  res.json({ success: true });
});
// HTTP trigger endpoint to route new notifications
app.post('/api/new-notification', (req, res) => {
  console.log('[Socket] New system notification trigger received');
  io.emit('new_notification');
  res.json({ success: true });
});

// Telemetry bridge route for incident coordinates updates
app.post('/api/incident-location-update', (req, res) => {
  const incident = req.body;
  console.log('[Socket] Incident location update received for ID:', incident.incidentId);
  io.emit('incidentUpdate', incident);
  res.json({ success: true });
});

app.post('/api/dispatch-report', (req, res) => {
  const { dispatchReport } = req.body;
  console.log('[Socket] Dispatch report received for Responder:', dispatchReport.responder_id);
  io.emit('dispatchReportUpdate', dispatchReport);
  res.json({ success: true });
});

const activeResponders = {};
const socketToResponder = {};
const responderToSocket = {};

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send cached responders to the newly connected client
  Object.values(activeResponders).forEach(data => {
    socket.emit('responderLocationUpdate', data);
  });

  // Listen for incident updates from mobile devices or staff dashboards
  socket.on('incidentUpdate', (incident) => {
    console.log('[Socket] Incident update received:', incident);
    // Broadcast the update to all other connected clients
    socket.broadcast.emit('incidentUpdate', incident);
  });

  // Listen for emergency SOS alerts from Resident App
  socket.on('emergency_alert', (payload) => {
    console.log('[Socket] Emergency SOS Alert received:', payload);
    // Broadcast the SOS alert to all active Responder Apps
    socket.broadcast.emit('emergency_alert', payload);
  });

  // Listen for responder location updates
  socket.on('responderLocationUpdate', (data) => {
    const responderId = data.responderId;
    
    // Prevent duplicate device fighting: If a new socket tries to update this responder, disconnect the old socket
    if (responderToSocket[responderId] && responderToSocket[responderId] !== socket.id) {
      console.log(`[Socket] Disconnecting old socket for Responder ${responderId} to prevent conflicts.`);
      const oldSocket = io.sockets.sockets.get(responderToSocket[responderId]);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }
    
    responderToSocket[responderId] = socket.id;
    socketToResponder[socket.id] = responderId;
    activeResponders[responderId] = data;
    console.log(`[Socket] Responder ${responderId} update received | Status: ${data.status} | destLat: ${data.destLatitude}`);
    socket.broadcast.emit('responderLocationUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const responderId = socketToResponder[socket.id];
    // Only mark offline if the disconnecting socket was the active owner of this responder
    if (responderId && responderToSocket[responderId] === socket.id) {
      activeResponders[responderId].status = 'offline';
      socket.broadcast.emit('responderLocationUpdate', activeResponders[responderId]);
      delete socketToResponder[socket.id];
      delete responderToSocket[responderId];
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO telemetry server running on http://0.0.0.0:${PORT}`);
});
