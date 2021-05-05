import { Construct, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import { Repository, AuthorizationToken } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage, BuildSpec } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';

export interface GithubServerlessPipelineProps extends StackProps {
  serviceGithubTokenName: string,
  serviceGithubOwner: string,
  serviceGithubRepo: string,
  infraGithubTokenName: string,
  infraGithubOwner: string,
  infraGithubRepo: string,
}

export class GithubServerlessPipelineStack extends Stack {

  constructor(scope: Construct, id: string, githubServerlessPipelineProps: GithubServerlessPipelineProps) {
    super(scope, id, githubServerlessPipelineProps);
    const serviceOutput = new Artifact('ServiceOutput');
    const serviceToken = SecretValue.secretsManager(githubServerlessPipelineProps.serviceGithubTokenName);
    const serviceSource = new GitHubSourceAction({
      actionName: 'ServiceSource',
      output: serviceOutput,
      oauthToken: serviceToken,
      owner: githubServerlessPipelineProps.serviceGithubOwner,
      repo: githubServerlessPipelineProps.serviceGithubRepo,
    });
    const infraOutput = new Artifact('InfraOutput');
    const infraToken = SecretValue.secretsManager(githubServerlessPipelineProps.infraGithubTokenName);
    const infraSource = new GitHubSourceAction({
      actionName: 'InfraSource',
      output: infraOutput,
      oauthToken: infraToken,
      owner: githubServerlessPipelineProps.infraGithubOwner,
      repo: githubServerlessPipelineProps.infraGithubRepo,
    });
    const sourceStage = {
      stageName: 'Source',
      actions: [
        serviceSource,
        infraSource,
      ],
    };
    const serviceRepository = new Repository(this, 'ServiceRepository');
    const registry = serviceRepository.repositoryUri.split('/', 1)[0];
    const dockerLoginCmd = 'aws ecr get-login-password | docker login --username AWS --password-stdin ' + registry;
    const serviceTag = serviceRepository.repositoryUri;
    const dockerBuildCmd = 'docker build -t ' + serviceTag + ' .';
    const dockerPushCmd = 'docker push ' + serviceTag;
    const serviceSpec = BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: dockerLoginCmd,
        },
        build: {
          commands: dockerBuildCmd,
        },
        post_build: {
          commands: dockerPushCmd,
        }
      },
    });
    const linuxEnvironment = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
      privileged: true,
    };
    const serviceProject = new PipelineProject(this, 'ServiceProject', {
      environment: linuxEnvironment,
      buildSpec: serviceSpec,
    });
    AuthorizationToken.grantRead(serviceProject);
    serviceRepository.grantPullPush(serviceProject);
    const serviceBuild = new CodeBuildAction({
      actionName: 'ServiceBuild',
      project: serviceProject,
      input: serviceOutput,
    });
    const buildStage = {
      stageName: 'Build',
      actions: [
        serviceBuild,
      ],
    };

    // const lambdaApp = LambdaApplication.fromLambdaApplicationName(this, 'LambdaApp', '');
    // const s3Deploy = new S3DeployAction({
    //   actionName: 'S3Deploy',
    //   input: buildOutput,
    //   bucket: githubServerlessPipelineProps.ecrRepository,
    // });
    // const deployStage = {
    //   stageName: 'Deploy',
    //   actions: [
    //     s3Deploy,
    //   ],
    // };
    new Pipeline(this, 'GithubServerlessPipeline', {
      stages: [
        sourceStage,
        buildStage,
        // deployStage,
      ],
    });
  }

}
