import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Repository, AuthorizationToken } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage, BuildSpec, Cache } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CloudFormationCreateUpdateStackAction } from '@aws-cdk/aws-codepipeline-actions';
import { RepoProps, buildRepoSourceAction } from './pipeline-helper';

export interface RepoSlsPipelineProps extends StackProps {
  serviceId: string,
  appRepoProps: RepoProps,
  archiRepoProps: RepoProps,
  pipelineCache: Bucket,
}

export class RepoSlsPipelineStack extends Stack {

  constructor(scope: Construct, id: string, repoSlsPipelineProps: RepoSlsPipelineProps) {
    super(scope, id, repoSlsPipelineProps);
    const pipelineStages = [];
    const appOutput = new Artifact('AppOutput');
    const appSource = buildRepoSourceAction(this, {
      repoProps: repoSlsPipelineProps.appRepoProps,
      namePrefix: 'App',
      repoOutput: appOutput,
    });
    const archiOutput = new Artifact('ArchiOutput');
    const archiSource = buildRepoSourceAction(this, {
      repoProps: repoSlsPipelineProps.archiRepoProps,
      namePrefix: 'Archi',
      repoOutput: archiOutput,
    });
    const sourceStage = {
      stageName: 'Source',
      actions: [
        appSource,
        archiSource,
      ],
    };
    pipelineStages.push(sourceStage);
    const dockerRepository = new Repository(this, 'DockerRepository');
    const registry = dockerRepository.repositoryUri.split('/', 1)[0];
    const dockerLoginCmd = 'aws ecr get-login-password | docker login --username AWS --password-stdin ' + registry;
    const dockerTag = dockerRepository.repositoryUri;
    const dockerPullCmd = 'docker pull ' + dockerTag;
    const dockerBuildCmd = 'docker build -t ' + dockerTag + ' .';
    const dockerPushCmd = 'docker push ' + dockerTag;
    const dockerSpec = BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: [
            dockerLoginCmd,
            dockerPullCmd,
          ],
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
    const slsId = 'Sls';
    const cdkSynthCmd = 'npx cdk synth -c imageRepoName=' + dockerRepository.repositoryName
      + ' -c slsId=' + slsId;
    const serviceTemplateFilename = slsId + '.template.json';
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
    const cdkCache = Cache.bucket(repoSlsPipelineProps.pipelineCache, {
      prefix: repoSlsPipelineProps.serviceId,
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
      input: archiOutput,
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
     * config - filenames of spec files; priveleged (+build)
     */
    pipelineStages.push(buildStage);
    const lambdaTemplate = cdkOutput.atPath(serviceTemplateFilename);
    const lambdaDeploy = new CloudFormationCreateUpdateStackAction({
      actionName: 'LambdaDeploy',
      stackName: repoSlsPipelineProps.serviceId,
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
    new Pipeline(this, 'RepoSlsPipeline', {
      stages: pipelineStages,
      restartExecutionOnUpdate: false,
    });
  }

}
