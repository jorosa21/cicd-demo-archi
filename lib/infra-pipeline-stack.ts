import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { AppDeployStage } from './app-deploy-stage';

export interface InfraPipelineProps extends StackProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepo: string,
}

/**
 * The stack that defines the infrastructure pipeline
 */
export class InfraPipelineStack extends Stack {

  constructor(scope: Construct, id: string, infraPipelineProps?: InfraPipelineProps) {
    if (infraPipelineProps == null) {
      return
    }
    super(scope, id, infraPipelineProps);
    const githubOutput = new Artifact('GithubOutput');
    const githubToken = SecretValue.secretsManager(infraPipelineProps.githubTokenName);
    const githubSource = new GitHubSourceAction({
      actionName: 'GithubSource',
      output: githubOutput,
      oauthToken: githubToken,
      owner: infraPipelineProps.githubOwner,
      repo: infraPipelineProps.githubRepo,
    });
    const cdkOutput = new Artifact('CdkOutput');
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const cdkSynth = SimpleSynthAction.standardNpmSynth({
      sourceArtifact: githubOutput,
      cloudAssemblyArtifact: cdkOutput,
      environment: linuxEnvironment,
    });
    const infraPipeline = new CdkPipeline(this, 'InfraPipeline', {
      cloudAssemblyArtifact: cdkOutput,
      sourceAction: githubSource,
      synthAction: cdkSynth,
    });
    // This is where we add the application stages
    // ...
    const appDeploy = new AppDeployStage(this, 'AppDeploy');
    infraPipeline.addApplicationStage(appDeploy);
  }

}