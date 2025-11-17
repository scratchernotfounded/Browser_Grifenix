const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Mapeamento de todos os clientes (ID -> WebSocket)
const clients = new Map(); 

// Mapeamento de Hospedeiros Disponíveis e sua carga (ID -> {ws: WebSocket, count: number})
const hosts = new Map(); 

const MAX_CLIENTS_PER_HOST = 10; 

// --- Configuração HTTP ---
// A rota principal deve servir seu index.html
app.get('/', (req, res) => {
    // Para simplificar, o servidor Node.js servirá seu arquivo principal.
    res.sendFile(__dirname + '/index.html');
});

// --- Lógica de WebSockets (IDs e Filas) ---
wss.on('connection', (ws) => {
    // Gera um ID inicial (embora o cliente use o ID do cookie, o servidor precisa de um backup)
    let clientID = generateUniqueId();
    ws.id = clientID;
    clients.set(clientID, ws);

    // Envia o ID único para o cliente (index.html)
    ws.send(JSON.stringify({ type: 'ID_ASSIGNMENT', id: clientID }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'REGISTER_HOST':
                // 1. O cliente decide virar Hospedeiro
                if (!hosts.has(clientID) && hosts.size < 50) { 
                    hosts.set(clientID, { ws: ws, count: 0 });
                    ws.send(JSON.stringify({ type: 'HOST_STATUS', status: 'AVAILABLE' }));
                    console.log(`Novo Hospedeiro registrado: ${clientID}`);
                }
                break;

            case 'REQUEST_HOST':
                // 2. Cliente busca um Hospedeiro disponível (Sonda Global)
                let bestHostID = null;

                // Implementação da FILA BALANCEADA (pega o primeiro disponível abaixo do limite)
                for (const [hostID, hostData] of hosts.entries()) {
                    if (hostData.count < MAX_CLIENTS_PER_HOST) {
                        bestHostID = hostID;
                        break; 
                    }
                }

                if (bestHostID) {
                    // 3. Conecta o Cliente ao melhor Hospedeiro
                    hosts.get(bestHostID).count++; // Aumenta a contagem de clientes
                    ws.send(JSON.stringify({ type: 'HOST_FOUND', hostID: bestHostID }));
                    console.log(`Cliente ${clientID} conectado ao Hospedeiro ${bestHostID}. Carga: ${hosts.get(bestHostID).count}`);
                } else {
                    ws.send(JSON.stringify({ type: 'HOST_STATUS', status: 'UNAVAILABLE' }));
                }
                break;

            case 'PROXY_REQUEST':
                // 4. Encaminha a requisição de Proxy (URL) para o Hospedeiro
                const targetHost = clients.get(data.targetHostID);
                if (targetHost && targetHost.readyState === WebSocket.OPEN) {
                    // Adiciona o ID do solicitante para o Hospedeiro saber para quem responder
                    data.requesterID = clientID; 
                    targetHost.send(JSON.stringify(data));
                }
                break;

            case 'PROXY_RESPONSE':
                // 5. Encaminha a resposta do Hospedeiro de volta para o Cliente Solicitante
                const requester = clients.get(data.requesterID);
                if (requester && requester.readyState === WebSocket.OPEN) {
                    requester.send(JSON.stringify(data));
                }
                break;
        }
    });

    ws.on('close', () => {
        clients.delete(clientID);
        if (hosts.has(clientID)) {
            hosts.delete(clientID);
            console.log(`Hospedeiro desconectado: ${clientID}`);
        }

        // Se era um cliente de um hospedeiro, diminui a contagem
        hosts.forEach((hostData, hostID) => {
            if (hostData.ws === ws) {
                hostData.count--;
                if (hostData.count < 0) hostData.count = 0;
            }
        });
    });
});

// --- Funções Auxiliares ---

function generateUniqueId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Relay rodando na porta ${PORT}`);
});
