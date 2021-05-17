#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { RepoCloudPipelineStack } from '../lib/repo-cloud-pipeline-stack';
import { buildRepoProps, buildStageProps } from '../lib/pipeline-helper';

const app = new App();
// cross-region deployment so the environment need to be explicit
const appEnv = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};
const archiPipelineId = app.node.tryGetContext('archiPipelineId');
const archiPipelineContext = app.node.tryGetContext('ArchiPipeline');
const archiRepoProps = buildRepoProps(archiPipelineContext);
const archiStageProps = buildStageProps(archiPipelineContext);
new RepoCloudPipelineStack(app, archiPipelineId, {
  repoProps: archiRepoProps,
  stageProps: archiStageProps,
  env: appEnv,
});
app.synth();
