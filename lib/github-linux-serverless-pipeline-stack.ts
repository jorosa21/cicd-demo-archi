import { Construct, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';

export interface GithubLinuxServerlessPipelineProps extends StackProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepo: string,
  ecrRepository: Repository,
}

export class GithubLinuxServerlessPipelineStack extends Stack {

  constructor(scope: Construct, id: string, githubLinuxServerlessPipelineProps: GithubLinuxServerlessPipelineProps) {
    super(scope, id, githubLinuxServerlessPipelineProps);
    const githubOutput = new Artifact('GithubOutput');
    const githubToken = SecretValue.secretsManager(githubLinuxServerlessPipelineProps.githubTokenName);
    const githubSource = new GitHubSourceAction({
      actionName: 'GithubSource',
      output: githubOutput,
      oauthToken: githubToken,
      owner: githubLinuxServerlessPipelineProps.githubOwner,
      repo: githubLinuxServerlessPipelineProps.githubRepo,
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

    // const lambdaApp = LambdaApplication.fromLambdaApplicationName(this, 'LambdaApp', '');
    // const s3Deploy = new S3DeployAction({
    //   actionName: 'S3Deploy',
    //   input: buildOutput,
    //   bucket: githubLinuxServerlessPipelineProps.ecrRepository,
    // });
    // const deployStage = {
    //   stageName: 'Deploy',
    //   actions: [
    //     s3Deploy,
    //   ],
    // };
    new Pipeline(this, 'GithubLinuxServerlessPipeline', {
      stages: [
        sourceStage,
        buildStage,
        // deployStage,
      ],
    });
  }

}
