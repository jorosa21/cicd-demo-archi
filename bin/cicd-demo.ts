#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { InfraPipelineStack } from '../lib/infra-pipeline-stack';
import { buildRepoProps } from '../lib/pipeline-helper';

const app = new App();
// cross-region deployment so the environment need to be explicit
const appEnv = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};
const infraPipelineId = app.node.tryGetContext('infraPipelineId');
const infraPipelineContext = app.node.tryGetContext('InfraPipeline');
const repoProps = buildRepoProps(infraPipelineContext);
new InfraPipelineStack(app, infraPipelineId, {
  repoProps,
  env: appEnv,
});
app.synth();
