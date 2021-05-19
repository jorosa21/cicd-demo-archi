import { Artifact } from '@aws-cdk/aws-codepipeline';
import { LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { ArchiDeployStage } from './archi-deploy-stage';
import { buildRepoSourceAction } from './pipeline-helper';
import { RepoProps, StageProps } from './context-helper';

export interface RepoCloudPipelineProps extends StackProps {
  repoProps: RepoProps,
  stageProps: StageProps,
}

export class RepoCloudPipelineStack extends Stack {

  constructor(scope: Construct, id: string, repoCloudPipelineProps: RepoCloudPipelineProps) {
    super(scope, id, repoCloudPipelineProps);
    const repoOutput = new Artifact('RepoOutput');
    const repoSource = buildRepoSourceAction(this, {
      repoProps: repoCloudPipelineProps.repoProps,
      repoOutput: repoOutput,
    });
    const cdkOutput = new Artifact('CdkOutput');
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const cdkSynth = SimpleSynthAction.standardYarnSynth({
      sourceArtifact: repoOutput,
      cloudAssemblyArtifact: cdkOutput,
      environment: linuxEnvironment,
    });
    const repoCloudPipeline = new CdkPipeline(this, 'RepoCloudPipeline', {
      cloudAssemblyArtifact: cdkOutput,
      sourceAction: repoSource,
      synthAction: cdkSynth,
    });
    // This is where we add the application stages
    // ...
    if (repoCloudPipelineProps.stageProps.enableApproval) {
      const approval = repoCloudPipeline.addStage('Approval');
      approval.addManualApprovalAction();  
    }
    const archiDeploy = new ArchiDeployStage(this, 'ArchiDeploy');
    repoCloudPipeline.addApplicationStage(archiDeploy);
  }

}