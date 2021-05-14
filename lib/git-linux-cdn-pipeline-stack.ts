import { join } from 'path';
import { Construct, Stack, StackProps, Arn, Duration } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { PipelineProject, LinuxBuildImage, BuildSpec, Cache } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CodeBuildActionType, S3DeployAction, LambdaInvokeAction } from '@aws-cdk/aws-codepipeline-actions';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { RepoProps, buildGitSourceAction } from './pipeline-helper';

export interface GitLinuxCdnPipelineProps extends StackProps {
  repoProps: RepoProps,
  distributionSource: Bucket,
  distributionId: string,
  pipelineCache: Bucket,
  enableTestStage: boolean,
}

export class GitLinuxCdnPipelineStack extends Stack {

  constructor(scope: Construct, id: string, gitLinuxCdnPipelineProps: GitLinuxCdnPipelineProps) {
    super(scope, id, gitLinuxCdnPipelineProps);
    const pipelineStages = [];
    const gitOutput = new Artifact('GitOutput');
    const gitSource = buildGitSourceAction(this, {
      repoProps: gitLinuxCdnPipelineProps.repoProps,
      repoOutput: gitOutput,
    });
    const sourceStage = {
      stageName: 'Source',
      actions: [
        gitSource,
      ],
    };
    pipelineStages.push(sourceStage);
    const cdnPipelineCache = new Bucket(this, 'CdnPipelineCache');
    const buildCache = Cache.bucket(cdnPipelineCache, {
      prefix: 'build'
    });
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const buildProject = new PipelineProject(this, 'BuildProject', {
      environment: linuxEnvironment,
      cache: buildCache,
    });
    const buildOutput = new Artifact('BuildOutput');
    const linuxBuild = new CodeBuildAction({
      actionName: 'LinuxBuild',
      project: buildProject,
      input: gitOutput,
      outputs: [
        buildOutput,
      ],
    });
    const buildStage = {
      stageName: 'Build',
      actions: [
        linuxBuild,
      ],
    };
    pipelineStages.push(buildStage);
    /* Todo:
     * optional stages (in order from build) - staging (2 buckets & existingBucketObj), test, approval
     * config - filenames of spec files (enabled if specified); priveleged (+build)
     */
    if (gitLinuxCdnPipelineProps.enableTestStage) {
      const testSpec = BuildSpec.fromSourceFilename('testspec.yml');
      const testCache = Cache.bucket(cdnPipelineCache, {
        prefix: 'test'
      });
      const testProject = new PipelineProject(this, 'TestProject', {
        buildSpec: testSpec,
        environment: linuxEnvironment,
        cache: testCache,
      });
      const linuxTest = new CodeBuildAction({
        actionName: 'LinuxTest',
        project: testProject,
        input: gitOutput,
        type: CodeBuildActionType.TEST,
      });
      const testStage = {
        stageName: 'Test',
        actions: [
          linuxTest,
        ],
      };
      pipelineStages.push(testStage);
    };
    const s3Deploy = new S3DeployAction({
      actionName: 'S3Deploy',
      input: buildOutput,
      bucket: gitLinuxCdnPipelineProps.distributionSource,
    });
    const deployStage = {
      stageName: 'Deploy',
      actions: [
        s3Deploy,
      ],
    };
    pipelineStages.push(deployStage);
    const distributionArn = Arn.format({
      service: 'cloudfront',
      resource: 'distribution',
      region: '',
      resourceName: gitLinuxCdnPipelineProps.distributionId,
    }, this);
    const distributionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudfront:CreateInvalidation',
      ],
      resources: [
        distributionArn,
      ],
    });
    const distributionCode = Code.fromAsset(join(__dirname, 'distribution-handler'));
    const distributionHandler = new Function(this, 'DistributionHandler', {
      runtime: Runtime.PYTHON_3_8,
      handler: 'distribution.on_event',
      code: distributionCode,
      timeout: Duration.minutes(1),
      logRetention: RetentionDays.ONE_DAY,
      initialPolicy: [
        distributionPolicy,
      ],
    });
    const distributionProps = {
      distributionId: gitLinuxCdnPipelineProps.distributionId,
    };
    const cacheInvalidate = new LambdaInvokeAction({
      actionName: 'CacheInvalidate',
      lambda: distributionHandler,
      userParameters: distributionProps,
    });
    const invalidateStage = {
      stageName: 'Invalidate',
      actions: [
        cacheInvalidate,
      ],
    };
    pipelineStages.push(invalidateStage);
    new Pipeline(this, 'GitLinuxCdnPipeline', {
      stages: pipelineStages,
      restartExecutionOnUpdate: false,
    });
  }

}
