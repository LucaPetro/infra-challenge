#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { DatabaseStack } from '../lib/db-stack'
import { withStage } from '../withStage';

// import * as dotenv from 'dotenv';

// dotenv.config({ path: '../../' })

const app = new cdk.App();

new DatabaseStack(app, 'InventoryStack', {
    stackName: withStage('InventoryStack'),
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'sa-east-1',
    }
})