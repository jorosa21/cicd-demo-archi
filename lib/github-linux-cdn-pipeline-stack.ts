import { join } from 'path';
import { Construct, Stack, StackProps, SecretValue, Arn, Duration } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { PipelineProject, LinuxBuildImage, BuildSpec } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction, CodeBuildActionType, S3DeployAction, LambdaInvokeAction } from '@aws-cdk/aws-codepipeline-actions';
import { RetentionDays } from '@aws-cdk/aws-logs';

export interface GithubLinuxCdnPipelineProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepo: string,
  s3Bucket: Bucket,
  distributionId: string,
}

export class GithubLinuxCdnPipelineStack extends Stack {

  constructor(scope: Construct, id: string, githubLinuxCdnPipelineProps: GithubLinuxCdnPipelineProps, props?: StackProps) {
    super(scope, id, props);
    const githubOutput = new Artifact('GithubOutput');
    const githubToken = SecretValue.secretsManager(githubLinuxCdnPipelineProps.githubTokenName);
    const githubSource = new GitHubSourceAction({
      actionName: 'GithubSource',
      output: githubOutput,
      oauthToken: githubToken,
      owner: githubLinuxCdnPipelineProps.githubOwner,
      repo: githubLinuxCdnPipelineProps.githubRepo,
    });
    const sourceStage = {
      stageName: 'Source',
      actions: [
        githubSource,
      ],
    };
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const linuxBuildProject = new PipelineProject(this, 'LinuxBuildProject', {
      environment: linuxEnvironment,
    });
    const buildOutput = new Artifact('BuildOutput');
    const linuxBuild = new CodeBuildAction({
      actionName: 'LinuxBuild',
      project: linuxBuildProject,
      input: githubOutput,
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
    const testSpec = BuildSpec.fromSourceFilename('testspec.yml');
    const linuxTestProject = new PipelineProject(this, 'LinuxTestProject', {
      buildSpec: testSpec,
      environment: linuxEnvironment,
    });
    const linuxTest = new CodeBuildAction({
      actionName: 'LinuxTest',
      project: linuxTestProject,
      input: githubOutput,
      type: CodeBuildActionType.TEST,
    });
    const testStage = {
      stageName: 'Test',
      actions: [
        linuxTest,
      ],
    };
    const s3Deploy = new S3DeployAction({
      actionName: 'S3Deploy',
      input: buildOutput,
      bucket: githubLinuxCdnPipelineProps.s3Bucket,
    });
    const deployStage = {
      stageName: 'Deploy',
      actions: [
        s3Deploy,
      ],
    };
    const distributionArn = Arn.format({
      service: 'cloudfront',
      resource: 'distribution',
      region: '',
      resourceName: githubLinuxCdnPipelineProps.distributionId,
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
    const distributionHandler = new Function(this, 'DistributionHandler', {
      runtime: Runtime.PYTHON_3_8,
      handler: 'distribution.on_event',
      code: Code.fromAsset(join(__dirname, 'distribution-handler')),
      timeout: Duration.minutes(1),
      logRetention: RetentionDays.ONE_DAY,
      initialPolicy: [
        distributionPolicy,
      ],
    });
    const distributionProps = {
      distributionId: githubLinuxCdnPipelineProps.distributionId,
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
    new Pipeline(this, 'GithubLinuxCdnPipeline', {
      stages: [
        sourceStage,
        buildStage,
        testStage,
        deployStage,
        invalidateStage,
      ],
    });
  }

}
