import http from "http"; //npm run dev
import SocketIO from "socket.io";
import express from "express";
import { doesNotMatch } from "assert";

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => res.render('home'));
app.get('/*', (req, res) => res.redirect('/'));


const httpServer = http.createServer(app); //Http Server
const wsServer = SocketIO(httpServer);

wsServer.on('connection', socket => {
    socket.onAny((event) => {
        console.log(`Socket Event:${event}`);
    });
    socket.on('enter_room', (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit('welcome');
    });
});

/*const sockets = []; //Fake DB

const wss = new WebSocket.Server({ server }); // + Web Socket Server, ws://localhost:3000
wss.on('connection', (socket) => { //[This Socket Mean] Connected Browser
    sockets.push(socket);
    socket['nickname'] = 'Anonymous'; //If not enter nickname
    console.log('Connected to Browser! 😊');
    socket.on('close', () => console.log('Disconnected from Browser ❌'));
    socket.on('message', msg => {
        const message = JSON.parse(msg);
        switch(message.type) {
            case 'new_message':
                sockets.forEach((aSocket) =>
                    aSocket.send(`${socket.nickname}: ${message.payload}`)
                );
                break;
            case 'nickname':
                socket['nickname'] = message.payload;
                break;
        }
    });
});*/

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);