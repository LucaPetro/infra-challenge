import { Client } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export const handler = async (event: any) => {
    console.log(`Inventory DB Initialization ${JSON.stringify(event)}`)

    // const secretsManager = new SecretsManagerClient({})
    // const secretResponse = await secretsManager.send(
    //     new GetSecretValueCommand({
    //         SecretId: process.env.DB_ARN
    //     })
    // )

    // const { username, password, host } = JSON.parse(secretResponse.SecretString!);

    // The above code is ideal, but requires an Interface Endpoint from within a private subnet.
    const { 
        DB_LAMBDA_USER, 
        DB_LAMBDA_PASSWORD,
        DB_HOST,
        DB_USERNAME,
        DB_PASSWORD,
        DB_PORT,
        DB_NAME,
    } = process.env;

    const client = new Client({
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        port: Number(DB_PORT),
        database: DB_NAME,
        ssl: { rejectUnauthorized: false }
    })


    try {
        await client.connect()

        const initQuery = `
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dbadmin') THEN
                CREATE USER dbadmin;
            END IF;
        END
        $$;
        GRANT rds_iam TO dbadmin;
        GRANT ALL PRIVILEGES ON DATABASE inventorydb TO dbadmin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dbadmin;
        `

        await client.query(initQuery)

        const lambdaUserQuery = `
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lambda') THEN
                CREATE USER ${DB_LAMBDA_USER} WITH ENCRYPTED PASSWORD '${DB_LAMBDA_PASSWORD}';
            END IF;
        END
        $$;
        GRANT rds_iam TO lambda;
        GRANT ALL PRIVILEGES ON DATABASE inventorydb TO ${DB_LAMBDA_USER};
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_LAMBDA_USER};
        GRANT USAGE ON SCHEMA public TO lambda;
        GRANT CREATE ON SCHEMA public TO lambda;
        `

        await client.query(lambdaUserQuery)

        return { status: 'Successfully ran DB init' }
    } catch (err) {
        console.error(`DB Init Error: ${err}`)
        throw err;
    } finally {
        await client.end()
    }
}