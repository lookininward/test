import * as dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();

const USERS = [
  {
    id: "1",
    name: "Rob Hope",
    avatar: "rob",
  },
];

const deleteDB = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `DROP DATABASE ${process.env.DB_NAME}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createNewDB = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `CREATE DATABASE ${process.env.DB_NAME}`,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBUsersTable = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      CREATE TABLE users(
          id int NOT NULL auto_increment PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          avatar VARCHAR(500) NOT NULL
      )
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBUsers = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      INSERT INTO users (
          id,
          name,
          avatar
      ) VALUES (
          1, 'Rob Hope', 'https://i.imgur.com/S05jusL.png'
      ),
      (
          2, 'Sophie Brecht', 'https://i.imgur.com/NQoLBaz.png'
      ),
      (
          3, 'James', 'https://i.imgur.com/Q5gVeyx.png'
      ),
      (
          4, 'Cameron Lawrence', 'https://i.imgur.com/fAcyg0e.png'
      )
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBThreadsTable = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      CREATE TABLE threads(
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL,
        user_id int NOT NULL,
        constraint user_id FOREIGN KEY (id) REFERENCES users(id)
      )
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBThreads = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      INSERT INTO threads (
        title,
        created_at,
        user_id
    ) VALUES (
        'A New Way of Communicating',
        NOW(),
        1  
      )
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBCommentsTable = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      CREATE TABLE comments(
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        text VARCHAR(1000) NOT NULL,
        created_at DATETIME NOT NULL,
  
        user_id int NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
  
        thread_id int NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(id),
  
        parent_id int,
  
        upvotes JSON NOT NULL
      )
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBComments = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      INSERT INTO
      comments (
          id,
          text,
          created_at,
          user_id,
          thread_id,
          upvotes
      ) VALUES (
          1,
          "Jeepers now that's a huge release with some big community earnings to back it - it must be so rewarding seeing creators quit their day jobs after monetizing (with real MRR) on the new platform.",
          NOW(),
          1,
          1,
          '[]'
      ),
      (
          2,
          "Switched our blog from Hubspot to Ghost a year ago -- turned out to be a great decision. Looking forward to this update....the in-platform analytics look especially delicious. :)",
          NOW(),
          2,
          1,
          '[]'
      ),
      (
          3,
          "Love the native memberships and the zipless themes, I was just asked by a friend about options for a new site, and I think I know what I'll be recommending then...",
          NOW(),
          4,
          1,
          '[]'
      );
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

const createDBReplies = (connection: mysql.Connection) =>
  new Promise((resolve) =>
    connection.query(
      `
      INSERT INTO comments (
        id,
        text,
        created_at,
        user_id,
        thread_id,
        parent_id,
        upvotes
    ) VALUES (
        4,
        "Thanks Sophie! Last year has been an absolute goldrush for the creator economy. Slowly at first, then all at once. Will be interesting to see how this ecosystem evolves over the next few years",
        NOW(),
        3,
        1,
        2,
        '[]'
    );
    `,
      (_: mysql.QueryError, result: mysql.RowDataPacket) => resolve(result)
    )
  );

export const setupDB = async (
  connection: mysql.Connection,
  {
    createDB,
    createUsersTable,
    createUsers,
    createThreadsTable,
    createThreads,
    createCommentsTable,
    createComments,
    createReplies,
  }: {
    createDB?: boolean;
    createUsersTable?: boolean;
    createUsers?: boolean;
    createThreadsTable?: boolean;
    createThreads?: boolean;
    createCommentsTable?: boolean;
    createComments?: boolean;
    createReplies?: boolean;
  }
) => {
  if (createDB) {
    await deleteDB(connection);
    await createNewDB(connection);
  }

  const dbConnect = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  if (createUsersTable) {
    await createDBUsersTable(dbConnect);
  }

  if (createUsers) {
    await createDBUsers(dbConnect);
  }

  if (createThreadsTable) {
    await createDBThreadsTable(dbConnect);
  }

  if (createThreads) {
    await createDBThreads(dbConnect);
  }

  if (createCommentsTable) {
    await createDBCommentsTable(dbConnect);
  }

  if (createComments) {
    await createDBComments(dbConnect);
  }

  if (createReplies) {
    await createDBReplies(dbConnect);
  }
};

export default {
  USERS,
  setupDB,
};
