

// importing modules
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const Room = require('./models/room');


const app = express();
const port = process.env.PORT || 3000; // if port is not set, use 3000
var server = http.createServer(app);

var io = require('socket.io')(server);


// middleware
app.use(express.json());

const DB = "mongodb+srv://barisozcelikay:1IOnkIsgtLetR63J@cluster0.ggb6toq.mongodb.net/?retryWrites=true&w=majority"

io.on("connection", (socket) => {
    console.log("connected!");
    socket.on("createRoom", async ({ nickname }) => {
        try {
            console.log(nickname);
            // room is created
            let room = new Room();
            let player = {
                socketID: socket.id,
                nickname: nickname,
                playerType: "X"
            };
            room.players.push(player);
            room.turn = player; //  whoever creates the room starts the game
            room = await room.save();
            console.log(room);
            // _id
            const roomId = room._id.toString();
            socket.join(roomId); // roomId is helps us to join specific room

            // tell our client that room has been created
            // go to next page

            // io -> all sockets
            // socket -> current socket
            io.to(roomId).emit("createRoomSuccess", room);
        }
        catch (err) {
            console.log(err);
        }

    });

    socket.on("joinRoom", async ({ nickname, roomId }) => {
        try {
            if (!roomId.match(/^[0-9a-fA-F]{24}$/)) {
                socket.emit("errorOccurred", "Please enter a valid room ID.");
                return;
            }
            let room = await Room.findById(roomId);

            if (room.isJoin) {
                let player = {
                    nickname,
                    socketID: socket.id,
                    playerType: "O",
                };
                socket.join(roomId);
                room.players.push(player);
                room.isJoin = false;
                room = await room.save();
                io.to(roomId).emit("joinRoomSuccess", room);
                io.to(roomId).emit("updatePlayers", room.players);
                io.to(roomId).emit("updateRoom", room);



            } else {
                socket.emit(
                    "errorOccurred",
                    "The game is in progress, try again later."
                );
            }
        } catch (e) {
            console.log(e);
        }
    });


    socket.on('tap', async ({ index, roomId }) => {
        try {
            let room = await Room.findById(roomId);

            let choice = room.turn.playerType; // x or o

            if (room.turnIndex == 0) {
                room.turn = room.players[1];
                room.turnIndex = 1;
            }
            else {
                room.turn = room.players[0];
                room.turnIndex = 0;
            }
            room = await room.save();
            io.to(roomId).emit('tapped', { index, choice, room });

        } catch (e) {
            console.log(e);
        }
    });

    socket.on('winner', async ({ winnerSocketId, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            console.log("dikkat");
            console.log(room.players);
            console.log(winnerSocketId);
            let player = room.players.find((playerr) => playerr.socketID == winnerSocketId);
            console.log(player);
            player.points += 1;
            room = await room.save();

            if (player.points >= room.maxRounds) {
                io.to(roomId).emit('endGame', player);
            }
            else {
                io.to(roomId).emit("pointIncrease", player);
            }
        }
        catch (e) {
            console.log(e);
        }
    });

});


mongoose.connect(DB).then(() => {
    console.log("Connection successful !")
}).catch((e) => {
    console.log(e)
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is up on port ${port}`);
}); // It can be access from anywhere



