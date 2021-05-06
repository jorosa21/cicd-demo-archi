import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { AppDeployStage } from './app-deploy-stage';

export interface InfraProps extends StackProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepo: string,
}

/**
 * The stack that defines the infrastructure pipeline
 */
export class InfraStack extends Stack {

  constructor(scope: Construct, id: string, infraProps?: InfraProps) {
    if (infraProps == null) {
      return
    }
    super(scope, id, infraProps);
    const githubOutput = new Artifact('GithubOutput');
    const githubToken = SecretValue.secretsManager(infraProps.githubTokenName);
    const githubSource = new GitHubSourceAction({
      actionName: 'GithubSource',
      output: githubOutput,
      oauthToken: githubToken,
      owner: infraProps.githubOwner,
      repo: infraProps.githubRepo,
    });
    const cdkOutput = new Artifact('CdkOutput');
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    const cdkSynth = SimpleSynthAction.standardNpmSynth({
      sourceArtifact: githubOutput,
      cloudAssemblyArtifact: cdkOutput,
      environment: linuxEnvironment,
      buildCommand: 'npm run build', // to compile TypeScript
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