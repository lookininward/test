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
exports.setupDB = void 0;
const dotenv = __importStar(require("dotenv"));
const mysql2_1 = __importDefault(require("mysql2"));
dotenv.config();
const USERS = [
    {
        id: "1",
        name: "Rob Hope",
        avatar: "rob",
    },
];
const deleteDB = (connection) => new Promise((resolve) => connection.query(`DROP DATABASE ${process.env.DB_NAME}`, (_, result) => resolve(result)));
const createNewDB = (connection) => new Promise((resolve) => connection.query(`CREATE DATABASE ${process.env.DB_NAME}`, (_, result) => resolve(result)));
const createDBUsersTable = (connection) => new Promise((resolve) => connection.query(`
      CREATE TABLE users(
          id int NOT NULL auto_increment PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          avatar VARCHAR(500) NOT NULL
      )
    `, (_, result) => resolve(result)));
const createDBUsers = (connection) => new Promise((resolve) => connection.query(`
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
    `, (_, result) => resolve(result)));
const createDBThreadsTable = (connection) => new Promise((resolve) => connection.query(`
      CREATE TABLE threads(
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL,
        user_id int NOT NULL,
        constraint user_id FOREIGN KEY (id) REFERENCES users(id)
      )
    `, (_, result) => resolve(result)));
const createDBThreads = (connection) => new Promise((resolve) => connection.query(`
      INSERT INTO threads (
        title,
        created_at,
        user_id
    ) VALUES (
        'A New Way of Communicating',
        NOW(),
        1  
      )
    `, (_, result) => resolve(result)));
const createDBCommentsTable = (connection) => new Promise((resolve) => connection.query(`
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
    `, (_, result) => resolve(result)));
const createDBComments = (connection) => new Promise((resolve) => connection.query(`
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
    `, (_, result) => resolve(result)));
const createDBReplies = (connection) => new Promise((resolve) => connection.query(`
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
    `, (_, result) => resolve(result)));
const setupDB = (connection, { createDB, createUsersTable, createUsers, createThreadsTable, createThreads, createCommentsTable, createComments, createReplies, }) => __awaiter(void 0, void 0, void 0, function* () {
    if (createDB) {
        yield deleteDB(connection);
        yield createNewDB(connection);
    }
    const dbConnect = mysql2_1.default.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
    });
    if (createUsersTable) {
        yield createDBUsersTable(dbConnect);
    }
    if (createUsers) {
        yield createDBUsers(dbConnect);
    }
    if (createThreadsTable) {
        yield createDBThreadsTable(dbConnect);
    }
    if (createThreads) {
        yield createDBThreads(dbConnect);
    }
    if (createCommentsTable) {
        yield createDBCommentsTable(dbConnect);
    }
    if (createComments) {
        yield createDBComments(dbConnect);
    }
    if (createReplies) {
        yield createDBReplies(dbConnect);
    }
});
exports.setupDB = setupDB;
exports.default = {
    USERS,
    setupDB: exports.setupDB,
};
