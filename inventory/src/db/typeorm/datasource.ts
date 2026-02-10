import { DataSource } from "typeorm";
// import { Signer } from "@aws-sdk/rds-signer";
import { DataSourceOptions } from "typeorm";
import { getEnv } from "utils/getEnvOrThrow";

import fs from 'fs'
import path from 'path'

import 'pg'

import { ProductVariation } from "../entities/ProductVariation.entity";

const certPath = path.resolve(process.cwd(), 'src/assets/global-bundle.pem');
const migPath = path.resolve(process.cwd(), 'src/db/migrations');

export function getTypeORMConf(): DataSourceOptions {
    return {
        type: 'postgres',
        host: getEnv('DB_HOST'),
        port: parseInt(getEnv('DB_PORT', { mode: 'optional', fallback: '5432' })),
        username: getEnv('DB_LAMBDA_USER'),
        password: getEnv('DB_LAMBDA_PASSWORD'),
        database: getEnv('DB_NAME'),
        ssl: { 
            rejectUnauthorized: true,
            ca: fs.readFileSync(certPath).toString()
        },
        entities: [
            ProductVariation
        ],
        migrations: [
            `${migPath}/*.js`
        ],
        synchronize: true,
        logging: true,
        logger: 'simple-console',
        extra: {
            max: 1,
            idleTimeoutMillis: 1000,
            connectionTimeoutMillis: 2000,
        }
    }
}

// export const initDataSource  = async () => {
//     console.log(dbOpts)

//     const signer = new Signer({
//         hostname: getEnv('DB_HOST'),
//         port: parseInt(getEnv('DB_PORT', { mode: 'optional', fallback: '5432' })),
//         username: getEnv('DB_USER'),
//         region: getEnv('AWS_REGION', { mode: 'optional', fallback: 'sa-east-1' })
//     })

//     const tempToken = await signer.getAuthToken()

//     return new DataSource({
//         ...dbOpts,
//     })
// }

export const InventoryDataSource = new DataSource(getTypeORMConf());