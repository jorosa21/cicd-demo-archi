#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { InfraPipelineStack } from '../lib/infra-pipeline-stack';

const app = new App();
new InfraPipelineStack(app, 'InfraPipelineStack', {
  githubTokenName: 'github-token',
  githubOwner: 'engr-lynx',
  githubRepo: 'cicd-demo',
});
app.synth();
