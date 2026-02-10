import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs'

const { 
    DB_LAMBDA_USER, 
    DB_LAMBDA_PASSWORD,
    DB_USERNAME,
    DB_PASSWORD,
    DB_PORT,
    DB_NAME,
} = process.env;

const dbOpts = {
    name: DB_NAME || 'inventory-db',
    user: DB_USERNAME || 'dbadmin',
    password: DB_PASSWORD || '',
    port: parseFloat(DB_PORT || '5432'),
}

export class DatabaseStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const vpc = new ec2.Vpc(this, 'InventoryVpc', {
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                { name: 'Isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 }
            ]
        })

        const dbSecurityGroup = new ec2.SecurityGroup(this, 'InventoryDBSecurityGroup', {
            vpc,
            description: 'Allows access to Inventory RDS from Lambda function',
            allowAllOutbound: true,
        })

        const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'InventoryLambdaSecurityGroup', {
            vpc,
            description: 'Inventory Lambda security group',
            allowAllOutbound: true,
        })
        
        dbSecurityGroup.addIngressRule(
            lambdaSecurityGroup,
            ec2.Port.tcp(dbOpts.port),
            'RDS ingress from Lambda'
        )

        lambdaSecurityGroup.addEgressRule(
            dbSecurityGroup,
            ec2.Port.tcp(dbOpts.port),
            'Lambda egress to RDS'
        )

        // const credentials = rds.Credentials.fromGeneratedSecret(
        //     dbOpts.user, 
        //     { 
        //         secretName: 'inventory-db-cred'
        //     }
        // )

        const credentials = rds.Credentials.fromPassword(
            dbOpts.user,
            cdk.SecretValue.unsafePlainText(dbOpts.password)
        )

        rds.Credentials.fromPassword(
            'lambda',
            cdk.SecretValue.unsafePlainText(dbOpts.password)
        )

        const db = new rds.DatabaseInstance(this, 'InventoryDB', {
            vpc,
            vpcSubnets: { 
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // change to PRIVATE_ISOLATED in production!
            },
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_18,
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO
            ),
            port: dbOpts.port,
            securityGroups: [dbSecurityGroup],
            databaseName: dbOpts.name,
            credentials: credentials,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        })

        const DBInitLambda = new NodejsFunction(this, 'InventoryDBInitFunction', {
            runtime: Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lib/rds-init.handler.ts'),
            handler: 'handler',
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            securityGroups: [lambdaSecurityGroup],
            environment: {
                DB_PORT: String(dbOpts.port),
                DB_NAME: dbOpts.name,
                DB_USERNAME: credentials.username,
                DB_HOST: db.dbInstanceEndpointAddress,
                DB_PASSWORD: dbOpts.password,
                DB_LAMBDA_USER: DB_LAMBDA_USER!,
                DB_LAMBDA_PASSWORD: DB_LAMBDA_PASSWORD!,
            },
            // This is NOT a safe way to do this.
            // Both the RDS and this Lambda being in a private VPC mitigates the risk,
            // but I'd prefer to just use SecretManager.
            // That requires an Interface Endpoint though, which costs money.
            bundling: {
                forceDockerBundling: false,
                minify: true,
                sourceMap: true,
                externalModules: ['aws-sdk']
            },
            logGroup: new logs.LogGroup(this, 'InventoryDBInitLogGroup', {
                retention: logs.RetentionDays.ONE_DAY,
                removalPolicy: cdk.RemovalPolicy.RETAIN
            })
        })

        DBInitLambda.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

        db.connections.allowDefaultPortFrom(DBInitLambda);

        new cr.AwsCustomResource(this, 'InventoryDBInitTrigger', {
            onCreate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: DBInitLambda.functionName,
                    Payload: JSON.stringify({ "ts": Date.now() })
                },
                physicalResourceId: cr.PhysicalResourceId.of('InventoryDBInit')
            },
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['lambda:InvokeFunction'],
                    resources: [DBInitLambda.functionArn]
                })
            ])
        })

        new cdk.CfnOutput(this, 'InventoryDBEndpointParam', { 
                value: db.dbInstanceEndpointAddress, 
                exportName: 'InventoryDBEndpointParam'
        })
        
        new cdk.CfnOutput(this, 'InventoryVpcIdParam', { 
                value: vpc.vpcId, 
                exportName: 'InventoryVpcIdParam'
        })

        new cdk.CfnOutput(this, 'InventoryDBSecurityGroupIdParam', { 
                value: dbSecurityGroup.securityGroupId, 
                exportName: 'InventoryDBSecurityGroupIdParam'
        })

        new cdk.CfnOutput(this, 'InventorySubnetIds', { 
                value: vpc.isolatedSubnets[0].subnetId, 
                exportName: 'InventorySubnetIds'
        }) 

        new cdk.CfnOutput(this, 'InventoryLambdaSecurityGroupIdParam', {
            value: lambdaSecurityGroup.securityGroupId, 
            exportName: 'InventoryLambdaSecurityGroupIdParam'
        })

        // In a production environment, use SSM parameters!!
        // This setup functions under the assumption that all these services will be deployed at the same time.
        // SSM values can also be encrypted and being behind a VPC they're inherently more secure.
        // However, for the purposes of this challenge, CFN outputs suffice.

        // const inventoryDBArn = `arn:aws:rds-db:${this.region}:dbuser:${db.instanceResourceId}/lambda`
        // new ssm.StringParameter(this, 'InventoryDBUserArnParam', {
        //     parameterName: `/inventory/inventory-db-user-arn`,
        //     stringValue: inventoryDBArn
        // })
        // new ssm.StringParameter(this, 'InventoryDBEndpointParam', {
        //     parameterName: `/inventory/${stage}/inventory-db-host`,
        //     stringValue: db.dbInstanceEndpointAddress
        // })
        // new ssm.StringParameter(this, 'InventoryVpcIdParam', {
        //     parameterName: `/inventory/${stage}/inventory-vpc-id`,
        //     stringValue: vpc.vpcId
        // })
        // new ssm.StringParameter(this, 'InventoryDBSecurityGroupIdParam', {
        //     parameterName: `/inventory/${stage}/inventory-db-sg-id`,
        //     stringValue: dbSecurityGroup.securityGroupId
        // })
        // new ssm.StringListParameter(this, 'InventorySubnetIds', {
        //     parameterName: `/inventory/${stage}/inventory-isolated-subnet-ids`,
        //     stringListValue: vpc.isolatedSubnets.map(subnet => subnet.subnetId)
        // })
        // new ssm.StringParameter(this, 'InventoryLambdaSecurityGroupIdParam', {
        //     parameterName: `/inventory/${stage}/inventory-lambda-sg-id`,
        //     stringValue: lambdaSecurityGroup.securityGroupId
        // })
        
    }
}