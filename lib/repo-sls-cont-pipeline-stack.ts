import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Repository, AuthorizationToken } from '@aws-cdk/aws-ecr';
import { PipelineProject, LinuxBuildImage, BuildSpec, Cache } from '@aws-cdk/aws-codebuild';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CloudFormationCreateUpdateStackAction, ManualApprovalAction } from '@aws-cdk/aws-codepipeline-actions';
import { RepoProps, StageProps, buildRepoSourceAction } from './pipeline-helper';

export interface RepoSlsContPipelineProps extends StackProps {
  serviceId: string,
  appRepoProps: RepoProps,
  archiRepoProps: RepoProps,
  stageProps: StageProps,
  pipelineCache: Bucket,
}

export class RepoSlsContPipelineStack extends Stack {

  constructor(scope: Construct, id: string, repoSlsContPipelineProps: RepoSlsContPipelineProps) {
    super(scope, id, repoSlsContPipelineProps);
    const pipelineStages = [];
    const appOutput = new Artifact('AppOutput');
    const appSource = buildRepoSourceAction(this, {
      repoProps: repoSlsContPipelineProps.appRepoProps,
      namePrefix: 'App',
      repoOutput: appOutput,
    });
    const archiOutput = new Artifact('ArchiOutput');
    const archiSource = buildRepoSourceAction(this, {
      repoProps: repoSlsContPipelineProps.archiRepoProps,
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
    const contRepo = new Repository(this, 'ContRepo');
    const contSpec = BuildSpec.fromObject({
      version: '0.2',
      env: {
        variables: {
          REPO_URI: contRepo.repositoryUri,
        },
      },
      phases: {
        pre_build: {
          commands: [
            'aws ecr get-login-password | docker login --username AWS --password-stdin ${REPO_URI}',
            'docker pull ${REPO_URI}:latest || true',
          ],
        },
        build: {
          commands: 'DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 \
            --cache-from ${REPO_URI}:latest -t ${REPO_URI}:latest .',
        },
        post_build: {
          commands: 'docker push ${REPO_URI}',
        },
      },
    });
    const linuxPrivilegedEnv = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
      privileged: true,
    };
    const contProject = new PipelineProject(this, 'ContProject', {
      environment: linuxPrivilegedEnv,
      buildSpec: contSpec,
    });
    AuthorizationToken.grantRead(contProject);
    contRepo.grantPullPush(contProject);
    const contBuild = new CodeBuildAction({
      actionName: 'ContBuild',
      project: contProject,
      input: appOutput,
    });
    const stackId = 'Sls';
    const serviceTemplateFilename = stackId + '.template.json';
    const cdkSpec = BuildSpec.fromObject({
      version: '0.2',
      env: {
        variables: {
          VPC_ID: 'repoSlsContPipelineProps.vpcId',
          REPO_NAME: contRepo.repositoryName,
          STACK_ID: stackId,
        },
      },
      phases: {
        install: {
          commands: 'yarn install',
        },
        build: {
          commands: 'npx cdk synth -c vpcId=${VPC_ID} -c repoName=${REPO_NAME} -c stackId=${STACK_ID}',
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
    const cdkCache = Cache.bucket(repoSlsContPipelineProps.pipelineCache, {
      prefix: repoSlsContPipelineProps.serviceId,
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
        contBuild,
        cdkBuild,
      ],
    };
    /* Todo:
     * optional stages (in order from build) - staging (Lambda alias / API Gateway stage), test
     * config - filename of testspec file; additional commands for contSpec
     */
    pipelineStages.push(buildStage);
    if (repoSlsContPipelineProps.stageProps.enableApproval) {
      const approvalAction = new ManualApprovalAction({
        actionName: 'ManualApproval',
      });
      const approvalStage = {
        stageName: 'Approval',
        actions: [
          approvalAction,
        ],
      };
      pipelineStages.push(approvalStage);
    };
    const lambdaTemplate = cdkOutput.atPath(serviceTemplateFilename);
    const lambdaDeploy = new CloudFormationCreateUpdateStackAction({
      actionName: 'LambdaDeploy',
      stackName: repoSlsContPipelineProps.serviceId,
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
    new Pipeline(this, 'RepoSlsContPipeline', {
      stages: pipelineStages,
      restartExecutionOnUpdate: false,
    });
  }

}
