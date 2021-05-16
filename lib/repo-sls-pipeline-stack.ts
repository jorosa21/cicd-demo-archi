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
    const containerRepository = new Repository(this, 'ContainerRepository');
    const containerSpec = BuildSpec.fromObject({
      version: '0.2',
      env: {
        variables: {
          REPOSITORY_URI: containerRepository.repositoryUri,
        },
      },
      phases: {
        pre_build: {
          commands: [
            '$(aws ecr get-login --no-include-email)',
            'docker pull ${REPOSITORY_URI}:latest || true',
          ],
        },
        build: {
          commands: 'DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 \
            --cache-from ${REPOSITORY_URI}:latest -t ${REPOSITORY_URI}:latest .',
        },
        post_build: {
          commands: 'docker push ${REPOSITORY_URI}',
        },
      },
    });
    const linuxPrivilegedEnv = {
      buildImage: LinuxBuildImage.STANDARD_5_0,
      privileged: true,
    };
    const containerProject = new PipelineProject(this, 'ContainerProject', {
      environment: linuxPrivilegedEnv,
      buildSpec: containerSpec,
    });
    AuthorizationToken.grantRead(containerProject);
    containerRepository.grantPullPush(containerProject);
    const containerBuild = new CodeBuildAction({
      actionName: 'ContainerBuild',
      project: containerProject,
      input: appOutput,
    });
    const slsId = 'Sls';
    const cdkSynthCmd = 'npx cdk synth -c imageRepoName=' + containerRepository.repositoryName
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
        containerBuild,
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
