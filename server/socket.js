const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('--- Socket Connected:', socket.id);

        socket.on('join-document', (docId) => {
            socket.join(docId);
            console.log(`--- Socket ${socket.id} joined document room: ${docId}`);
        });

        socket.on('leave-document', (docId) => {
            socket.leave(docId);
            console.log(`--- Socket ${socket.id} left document room: ${docId}`);
        });

        socket.on('disconnect', () => {
            console.log('--- Socket Disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const emitDocumentUpdate = (docId, data) => {
    if (io) {
        io.to(docId.toString()).emit('document-updated', data);
        console.log(`--- Emitted document-updated for ${docId}`);
    }
};

module.exports = { initSocket, getIO, emitDocumentUpdate };
