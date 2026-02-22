import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Handle URL cleanup more robustly
        let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const backendUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl.replace(/\/$/, '');
        
        console.log('--- Attempting Socket Connection to:', backendUrl);

        const newSocket = io(backendUrl, {
            withCredentials: true,
            transports: ['polling', 'websocket'], // Polling first is safer for handshakes (Socket.io default)
            reconnectionAttempts: 5,
            timeout: 20000
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('--- Socket Connected (Client) ---');
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
