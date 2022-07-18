import * as dotenv from "dotenv";
import mysql from "mysql2";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import express from "express";
import demo from "./demo";
import { Socket, Server } from "socket.io";
import { createServer } from "http";
import {
  SQLUserType,
  SQLCommentType,
  SQLUserThreadsType,
  CommentType,
} from "./types";

dotenv.config({ path: "../.env" });
dayjs.extend(relativeTime);

const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // demo
  },
});

io.on("connection", (socket: Socket) => {
  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const sessionUser = demo.USERS[0];

const clearComments = () =>
  new Promise((resolve) =>
    connection.query(
      `DELETE FROM comments`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const getSessionUser = () =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM users WHERE id = ${sessionUser.id}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) =>
        resolve(result[0] as SQLUserType)
    )
  );

const getUser = (userId: string) =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM users WHERE id = ${userId}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) =>
        resolve(result[0] as SQLUserType)
    )
  );

const getUserThreads = (userId: string) =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM threads WHERE user_id = ${userId}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const getThreadComments = (threadId: string) =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM comments WHERE thread_id = ${threadId} AND parent_id IS NULL`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const getReplies = (commentId: string) =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM comments WHERE parent_id = ${commentId}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const getComment = (commentId: string) =>
  new Promise((resolve) =>
    connection.query(
      `SELECT * FROM comments WHERE id = ${commentId}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) =>
        resolve(result[0] as SQLCommentType)
    )
  );

const addComment = ({
  threadId,
  parentId,
  text,
}: {
  threadId: string;
  parentId: string;
  text: string;
}) =>
  new Promise((resolve) => {
    connection.query(
      `
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
        `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    );
  });

const upvoteComment = (commentId: string) =>
  new Promise((resolve) => {
    connection.query(
      `
        UPDATE comments
        SET upvotes = JSON_ARRAY_APPEND(
            upvotes,
            '$',
            "${sessionUser.id}"
        )
        WHERE id = ${commentId}
        AND NOT JSON_CONTAINS(upvotes, "${sessionUser.id}")
      `,
      (err: mysql.QueryError, result: mysql.RowDataPacket) => {
        if (err) {
          console.log(err);
        }
        resolve(result);
      }
    );
  });

const removeCommentUpvote = (commentId: string) =>
  new Promise((resolve) => {
    connection.query(
      `
        UPDATE comments
        SET upvotes = JSON_REMOVE(
            upvotes,
            replace(JSON_SEARCH(upvotes, 'one', "${sessionUser.id}"),'"', '')
        )
        WHERE id = ${commentId}
      `,
      (err: mysql.QueryError, result: mysql.RowDataPacket) => {
        if (err) {
          console.log(err);
        }
        resolve(result);
      }
    );
  });

const mapComments = async (comments: SQLCommentType[]) =>
  await Promise.all(
    comments.map(async (comment: SQLCommentType) => {
      const commentUser = await getUser(comment.user_id);
      const replies = (await getReplies(comment.id)) as SQLCommentType[];
      const mappedReplies: CommentType[] = await mapComments(replies);
      return {
        id: comment.id,
        user: commentUser,
        text: comment.text,
        time: dayjs(comment.created_at).fromNow(),
        replies: [...mappedReplies],
        upvotes: [...comment.upvotes],
      } as CommentType;
    })
  );

app.get("/", async (_: express.Request, res: express.Response) => {
  try {
    const sessionUser = (await getSessionUser()) as SQLUserType;
    const userThreads = (await getUserThreads(
      sessionUser.id
    )) as SQLUserThreadsType[];
    const thread = userThreads[0]; // return first thread for demo
    const threadComments = (await getThreadComments(
      thread.id
    )) as SQLCommentType[];
    const comments = await mapComments(threadComments);
    res.send(comments);
  } catch (e) {
    console.log("Failed to connect", e);
    res.send("Failed to connect");
  }
});

app.get("/user", async (_: express.Request, res: express.Response) => {
  try {
    const user = await getSessionUser();
    res.send(user);
  } catch (e) {
    console.log("Failed to retrieve session user", e);
    res.send("Failed to retrieve session user");
  }
});

app.post(
  "/add-comment",
  async (req: express.Request, res: express.Response) => {
    const { threadId, parentId, text } = req.body;
    try {
      await addComment({ threadId, parentId, text });
      io.sockets.emit("comment:add");
      res.send("Added comment");
    } catch (e) {
      console.log("Failed to add comment", e);
      res.send("Failed to add comment");
    }
  }
);

app.post(
  "/upvote-comment",
  async (req: express.Request, res: express.Response) => {
    const { commentId } = req.body;
    const { upvotes } = (await getComment(commentId)) as SQLCommentType;
    const hasUpvote = upvotes.some(
      (id: string) => id === sessionUser.id.toString()
    );

    if (!hasUpvote) {
      await upvoteComment(commentId);
    } else {
      await removeCommentUpvote(commentId);
    }

    io.sockets.emit("comment:upvote");
    res.send("success");
  }
);

app.post("/reset", async (_: express.Request, res: express.Response) => {
  try {
    await clearComments();
    await demo.setupDB(connection, {
      createComments: true,
      createReplies: true,
    });
    io.sockets.emit("reset");
    res.send("Reset DB");
  } catch (e) {
    console.log("Failed to reset db", e);
    res.send("Failed to reset db");
  }
});

httpServer.listen(port);
