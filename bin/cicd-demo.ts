#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { InfraStack } from '../lib/infra-stack';

const app = new App();
// cross-region deployment so the environment need to be explicit
const pipelineEnv = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};
new InfraStack(app, 'Infra', {
  githubTokenName: 'github-token',
  githubOwner: 'engr-lynx',
  githubRepo: 'cicd-demo',
}, {
  env: pipelineEnv,
});
app.synth();
