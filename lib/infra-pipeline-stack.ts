import { Artifact } from '@aws-cdk/aws-codepipeline';
import { LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { AppDeployStage } from './app-deploy-stage';
import { RepoProps, buildGitSourceAction } from './pipeline-helper';

export interface InfraPipelineProps extends StackProps {
  repoProps: RepoProps,
}

/**
 * The stack that defines the infrastructure pipeline
 */
export class InfraPipelineStack extends Stack {

  constructor(scope: Construct, id: string, infraPipelineProps: InfraPipelineProps) {
    super(scope, id, infraPipelineProps);
    const gitOutput = new Artifact('GitOutput');
    const gitSource = buildGitSourceAction(this, {
      repoProps: infraPipelineProps.repoProps,
      repoOutput: gitOutput,
    });
    const cdkOutput = new Artifact('CdkOutput');
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const cdkSynth = SimpleSynthAction.standardYarnSynth({
      sourceArtifact: gitOutput,
      cloudAssemblyArtifact: cdkOutput,
      environment: linuxEnvironment,
    });
    const infraPipeline = new CdkPipeline(this, 'InfraPipeline', {
      cloudAssemblyArtifact: cdkOutput,
      sourceAction: gitSource,
      synthAction: cdkSynth,
    });
    // This is where we add the application stages
    // ...
    /* Todo:
     * optional approval (addManualApprovalAction)
     */
    // ToDo: Remove other cache buckets and use this.
    const cacheBucket = new Bucket(this, 'CacheBucket');
    const appDeploy = new AppDeployStage(this, 'AppDeploy');
    infraPipeline.addApplicationStage(appDeploy);
  }

}