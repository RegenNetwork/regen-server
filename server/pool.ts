import { Pool, Client, PoolConfig } from 'pg';
import * as fs from 'fs';
import { main as workerMain } from './worker/worker';

const pgPoolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/xrn',
};

if (process.env.NODE_ENV === 'production') {
  pgPoolConfig.ssl = {
    ca: fs.readFileSync(`${__dirname}/../config/rds-combined-ca-bundle.pem`),
  };
}

const pgPool = new Pool(pgPoolConfig);

const runnerPromise = new Promise((resolve, reject) => {
  workerMain(pgPool)
    .then((res) => {
      resolve(res);
    })
    .catch((err) => {
      console.error(err);
      reject(err);
      process.exit(1);
    });
});

exports.pgPool = pgPool;
exports.runnerPromise = runnerPromise;
