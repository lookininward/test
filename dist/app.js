"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const mysql2_1 = __importDefault(require("mysql2"));
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const express_1 = __importDefault(require("express"));
const demo_1 = __importDefault(require("./demo"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
dotenv.config({ path: "../.env" });
dayjs_1.default.extend(relativeTime_1.default);
const cors = require("cors");
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // demo
    },
});
io.on("connection", (socket) => {
    socket.on("disconnect", () => {
        console.log("disconnected");
    });
});
const db_config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};
let connection = mysql2_1.default.createConnection(db_config);
const handleDisconnect = () => {
    connection = mysql2_1.default.createConnection(db_config);
    connection.connect(function (err) {
        // The server is either down
        if (err) {
            // or restarting (takes a while sometimes).
            console.log("error when connecting to db:", err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        } // to avoid a hot loop, and to allow our node script to
    }); // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on("error", function (err) {
        console.log("db error", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
            // Connection to the MySQL server is usually
            handleDisconnect(); // lost due to either server restart, or a
        }
        else {
            // connnection idle timeout (the wait_timeout
            throw err; // server variable configures this)
        }
    });
};
handleDisconnect();
const sessionUser = demo_1.default.USERS[0];
const clearComments = () => new Promise((resolve) => connection.query(`DELETE FROM comments`, (_, result) => resolve(result)));
const getSessionUser = () => new Promise((resolve) => connection.query(`SELECT * FROM users WHERE id = ${sessionUser.id}`, (_, result) => resolve(result[0])));
const getUser = (userId) => new Promise((resolve) => connection.query(`SELECT * FROM users WHERE id = ${userId}`, (_, result) => resolve(result[0])));
const getUserThreads = (userId) => new Promise((resolve) => connection.query(`SELECT * FROM threads WHERE user_id = ${userId}`, (_, result) => resolve(result)));
const getThreadComments = (threadId) => new Promise((resolve) => connection.query(`SELECT * FROM comments WHERE thread_id = ${threadId} AND parent_id IS NULL`, (_, result) => resolve(result)));
const getReplies = (commentId) => new Promise((resolve) => connection.query(`SELECT * FROM comments WHERE parent_id = ${commentId}`, (_, result) => resolve(result)));
const getComment = (commentId) => new Promise((resolve) => connection.query(`SELECT * FROM comments WHERE id = ${commentId}`, (_, result) => resolve(result[0])));
const addComment = ({ threadId, parentId, text, }) => new Promise((resolve) => {
    connection.query(`
        INSERT INTO
            comments (
                text,
                created_at,
                user_id,
                thread_id,
                parent_id,
                upvotes
            ) VALUES (
                "${text}",
                NOW(),
                ${sessionUser.id},
                ${threadId},
                ${parentId || null},
                '[]'
            )
        `, (_, result) => resolve(result));
});
const upvoteComment = (commentId) => new Promise((resolve) => {
    connection.query(`
        UPDATE comments
        SET upvotes = JSON_ARRAY_APPEND(
            upvotes,
            '$',
            "${sessionUser.id}"
        )
        WHERE id = ${commentId}
        AND NOT JSON_CONTAINS(upvotes, "${sessionUser.id}")
      `, (err, result) => {
        if (err) {
            console.log(err);
        }
        resolve(result);
    });
});
const removeCommentUpvote = (commentId) => new Promise((resolve) => {
    connection.query(`
        UPDATE comments
        SET upvotes = JSON_REMOVE(
            upvotes,
            replace(JSON_SEARCH(upvotes, 'one', "${sessionUser.id}"),'"', '')
        )
        WHERE id = ${commentId}
      `, (err, result) => {
        if (err) {
            console.log(err);
        }
        resolve(result);
    });
});
const mapComments = (comments) => __awaiter(void 0, void 0, void 0, function* () {
    return yield Promise.all(comments.map((comment) => __awaiter(void 0, void 0, void 0, function* () {
        const commentUser = yield getUser(comment.user_id);
        const replies = (yield getReplies(comment.id));
        const mappedReplies = yield mapComments(replies);
        return {
            id: comment.id,
            user: commentUser,
            text: comment.text,
            time: (0, dayjs_1.default)(comment.created_at).fromNow(),
            replies: [...mappedReplies],
            upvotes: [...comment.upvotes],
        };
    })));
});
app.get("/", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessionUser = (yield getSessionUser());
        const userThreads = (yield getUserThreads(sessionUser.id));
        const thread = userThreads[0]; // return first thread for demo
        const threadComments = (yield getThreadComments(thread.id));
        const comments = yield mapComments(threadComments);
        res.send(comments);
    }
    catch (e) {
        console.log("Failed to connect", e);
        res.send("Failed to connect");
    }
}));
app.get("/user", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getSessionUser();
        res.send(user);
    }
    catch (e) {
        console.log("Failed to retrieve session user", e);
        res.send("Failed to retrieve session user");
    }
}));
app.post("/add-comment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { threadId, parentId, text } = req.body;
    try {
        yield addComment({ threadId, parentId, text });
        io.sockets.emit("comment:add");
        res.send("Added comment");
    }
    catch (e) {
        console.log("Failed to add comment", e);
        res.send("Failed to add comment");
    }
}));
app.post("/upvote-comment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commentId } = req.body;
        const { upvotes } = (yield getComment(commentId));
        const hasUpvote = upvotes.some((id) => id === sessionUser.id.toString());
        if (!hasUpvote) {
            yield upvoteComment(commentId);
        }
        else {
            yield removeCommentUpvote(commentId);
        }
        io.sockets.emit("comment:upvote");
        res.send("success");
    }
    catch (e) {
        console.log("Failed to upvote comment", e);
        res.send("Failed to upvote comment");
    }
}));
app.post("/reset", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield clearComments();
        yield demo_1.default.setupDB(connection, {
            createComments: true,
            createReplies: true,
        });
        io.sockets.emit("reset");
        res.send("Reset DB");
    }
    catch (e) {
        console.log("Failed to reset db", e);
        res.send("Failed to reset db");
    }
}));
httpServer.listen(port);
