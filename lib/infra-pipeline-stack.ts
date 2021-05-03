import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { AngularSiteStage } from './angular-site-stage';

export interface WebsiteInfraPipelineProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepo: string,
}

/**
 * The stack that defines the infrastructure pipeline
 */
export class InfraPipelineStack extends Stack {

  constructor(scope: Construct, id: string, websiteInfraPipelineProps?: WebsiteInfraPipelineProps, props?: StackProps) {
    if (websiteInfraPipelineProps == null) {
      return
    }
    super(scope, id, props);
    const githubOutput = new Artifact('GithubOutput');
    const githubToken = SecretValue.secretsManager(websiteInfraPipelineProps.githubTokenName);
    const githubSource = new GitHubSourceAction({
      actionName: 'GithubSource',
      output: githubOutput,
      oauthToken: githubToken,
      owner: websiteInfraPipelineProps.githubOwner,
      repo: websiteInfraPipelineProps.githubRepo,
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
    const pipelineName = 'WebsiteInfraPipeline';
    const pipeline = new CdkPipeline(this, pipelineName, {
      pipelineName,
      cloudAssemblyArtifact: cdkOutput,
      sourceAction: githubSource,
      synthAction: cdkSynth,
    });
    // This is where we add the application stages
    // ...
    pipeline.addApplicationStage(new AngularSiteStage(this, 'AngularSite'));
  }

}