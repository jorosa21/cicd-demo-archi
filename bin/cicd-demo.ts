#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { InfraPipelineStack } from '../lib/infra-pipeline-stack';
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
const infraPipelineId = app.node.tryGetContext('infraPipelineId');  
const infraPipelineContext = app.node.tryGetContext('InfraPipeline');  
new InfraPipelineStack(app, infraPipelineId, {
  githubTokenName: infraPipelineContext.githubTokenName,
  githubOwner: infraPipelineContext.githubOwner,
  githubRepo: infraPipelineContext.githubRepo,
  env: appEnv,
});
// ToDo: loop and add suffix when already deploying multiple services
const serviceName = serviceBaseName;
new ServerlessStack(app, serviceName);
app.synth();
