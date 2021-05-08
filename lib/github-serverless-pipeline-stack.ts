import { Construct, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Repository, AuthorizationToken } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage, BuildSpec, Cache } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction, CloudFormationCreateUpdateStackAction } from '@aws-cdk/aws-codepipeline-actions';

export interface GithubServerlessPipelineProps extends StackProps {
  appGithubTokenName: string,
  appGithubOwner: string,
  appGithubRepo: string,
  infraGithubTokenName: string,
  infraGithubOwner: string,
  infraGithubRepo: string,
  pipelineCache: Bucket,
}

export class GithubServerlessPipelineStack extends Stack {

  constructor(scope: Construct, id: string, githubServerlessPipelineProps: GithubServerlessPipelineProps) {
    super(scope, id, githubServerlessPipelineProps);
    const serviceOutput = new Artifact('ServiceOutput');
    const serviceToken = SecretValue.secretsManager(githubServerlessPipelineProps.appGithubTokenName);
    const serviceSource = new GitHubSourceAction({
      actionName: 'ServiceSource',
      output: serviceOutput,
      oauthToken: serviceToken,
      owner: githubServerlessPipelineProps.appGithubOwner,
      repo: githubServerlessPipelineProps.appGithubRepo,
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
    const dockerRepository = new Repository(this, 'DockerRepository');
    const registry = dockerRepository.repositoryUri.split('/', 1)[0];
    const dockerLoginCmd = 'aws ecr get-login-password | docker login --username AWS --password-stdin ' + registry;
    const dockerTag = dockerRepository.repositoryUri;
    const dockerBuildCmd = 'docker build -t ' + dockerTag + ' .';
    const dockerPushCmd = 'docker push ' + dockerTag;
    const dockerSpec = BuildSpec.fromObject({
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
        },
      },
    });
    const linuxPrivilegedEnv = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
      privileged: true,
    };
    const dockerProject = new PipelineProject(this, 'DockerProject', {
      environment: linuxPrivilegedEnv,
      buildSpec: dockerSpec,
    });
    AuthorizationToken.grantRead(dockerProject);
    dockerRepository.grantPullPush(dockerProject);
    const dockerBuild = new CodeBuildAction({
      actionName: 'DockerBuild',
      project: dockerProject,
      input: serviceOutput,
    });
    const serviceBaseName = this.node.tryGetContext('serviceBaseName');
    // ToDo: template name can be common
    const serviceName = serviceBaseName;
    const cdkSynthCmd = 'npm run cdk synth -- -c imageRepoName=' + dockerRepository.repositoryName
      + ' ' + serviceName;
    const serviceTemplateFilename = serviceName + '.template.json';
    const cdkSpec = BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: 'npm i --prefer-offline --no-audit',
        },
        build: {
          commands: cdkSynthCmd,
        },
      },
      artifacts: {
        'base-directory': 'cdk.out',
        files: [
          serviceTemplateFilename,
        ],
      },
      cache: {
        paths: [
          'node_modules/**/*',
        ],
      },  
    });
    const linuxEnv = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
    };
    // ToDo: use variable prefix when already deploying multiple services
    const cdkCache = Cache.bucket(githubServerlessPipelineProps.pipelineCache, {
      prefix: 'cdk'
    });
    const cdkProject = new PipelineProject(this, 'CdkProject', {
      environment: linuxEnv,
      buildSpec: cdkSpec,
      cache: cdkCache,
    });
    const cdkOutput = new Artifact('CdkOutput');
    const cdkBuild = new CodeBuildAction({
      actionName: 'CdkBuild',
      project: cdkProject,
      input: infraOutput,
      outputs: [
        cdkOutput,
      ],
    });
    const buildStage = {
      stageName: 'Build',
      actions: [
        dockerBuild,
        cdkBuild,
      ],
    };
    const lambdaTemplate = cdkOutput.atPath(serviceTemplateFilename);
    const lambdaDeploy = new CloudFormationCreateUpdateStackAction({
      actionName: 'LambdaDeploy',
      // ToDo: use variable serviceName when already deploying multiple services
      stackName: serviceName,
      templatePath: lambdaTemplate,
      adminPermissions: true,
    });
    const deployStage = {
      stageName: 'Deploy',
      actions: [
        lambdaDeploy,
      ],
    };
    new Pipeline(this, 'GithubServerlessPipeline', {
      stages: [
        sourceStage,
        buildStage,
        deployStage,
      ],
    });
  }

}
