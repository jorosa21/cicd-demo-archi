#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { InfraStack } from '../lib/infra-stack';
import { ServerlessStack } from '../lib/serverless-stack';

const serviceBaseName = 'Service';
const appContext = {
  serviceBaseName,
}
const app = new App({
  context: appContext,
});
// cross-region deployment so the environment need to be explicit
const appEnv = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};
// ToDo: use context for these instead of hardcoded.
new InfraStack(app, 'Infra', {
  githubTokenName: 'github-token',
  githubOwner: 'engr-lynx',
  githubRepo: 'cicd-demo',
  env: appEnv,
});
// ToDo: loop and add suffix when already deploying multiple services
const serviceName = serviceBaseName;
new ServerlessStack(app, serviceName);
app.synth();
