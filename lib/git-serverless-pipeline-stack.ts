import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Repository, AuthorizationToken } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage, BuildSpec, Cache } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CloudFormationCreateUpdateStackAction } from '@aws-cdk/aws-codepipeline-actions';
import { RepoProps, buildGitSourceAction } from './pipeline-helper';

export interface GitServerlessPipelineProps extends StackProps {
  serviceId: string,
  appRepoProps: RepoProps,
  infraRepoProps: RepoProps,
  pipelineCache: Bucket,
}

export class GitServerlessPipelineStack extends Stack {

  constructor(scope: Construct, id: string, gitServerlessPipelineProps: GitServerlessPipelineProps) {
    super(scope, id, gitServerlessPipelineProps);
    const pipelineStages = [];
    const appOutput = new Artifact('AppOutput');
    const appSource = buildGitSourceAction(this, {
      repoProps: gitServerlessPipelineProps.appRepoProps,
      namePrefix: 'App',
      repoOutput: appOutput,
    });
    const infraOutput = new Artifact('InfraOutput');
    const infraSource = buildGitSourceAction(this, {
      repoProps: gitServerlessPipelineProps.infraRepoProps,
      namePrefix: 'Infra',
      repoOutput: infraOutput,
    });
    const sourceStage = {
      stageName: 'Source',
      actions: [
        appSource,
        infraSource,
      ],
    };
    pipelineStages.push(sourceStage);
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
      input: appOutput,
    });
    const serverlessId = 'Serverless';
    const cdkSynthCmd = 'npx cdk synth -c imageRepoName=' + dockerRepository.repositoryName
      + ' -c serverlessId=' + serverlessId;
    const serviceTemplateFilename = serverlessId + '.template.json';
    const cdkSpec = BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: 'yarn install',
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
    const cdkCache = Cache.bucket(gitServerlessPipelineProps.pipelineCache, {
      prefix: gitServerlessPipelineProps.serviceId,
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
    /* Todo:
     * optional stages (in order from build) - staging (Lambda alias / API Gateway stage), test, approval
     * config - filenames of spec files (enabled if specified); priveleged (+build)
     */
    pipelineStages.push(buildStage);
    const lambdaTemplate = cdkOutput.atPath(serviceTemplateFilename);
    const lambdaDeploy = new CloudFormationCreateUpdateStackAction({
      actionName: 'LambdaDeploy',
      stackName: gitServerlessPipelineProps.serviceId,
      templatePath: lambdaTemplate,
      adminPermissions: true,
    });
    const deployStage = {
      stageName: 'Deploy',
      actions: [
        lambdaDeploy,
      ],
    };
    pipelineStages.push(deployStage);
    new Pipeline(this, 'GitServerlessPipeline', {
      stages: pipelineStages,
      restartExecutionOnUpdate: false,
    });
  }

}
