import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { GithubServerlessPipelineStack } from './github-serverless-pipeline-stack';
import { GithubLinuxCdnPipelineStack } from './github-linux-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';

/**
 * Deployable unit of Angular site
 */
export class AppDeployStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    const siteEnv = {
      region: 'us-east-1', // use us-east-1 for distribution and supporting services
    };
    const site = new CdnStack(this, 'Site', {
      env: siteEnv,
    });
    new GithubLinuxCdnPipelineStack(this, 'SitePipeline', {
      // ToDo: use context for these instead of hardcoded.
      githubTokenName: 'github-token',
      githubOwner: 'engr-lynx',
      githubRepo: 'angular-sample',
      s3Bucket: site.sourceBucket,
      distributionId: site.distributionId,
      env: siteEnv,
    });
    const servicePipelineCache = new Bucket(this, 'ServicePipelineCache');
    // ToDo: loop and add suffix when already deploying multiple services
    new GithubServerlessPipelineStack(this, 'ServicePipeline', {
      // ToDo: use context for these instead of hardcoded.
      serviceGithubTokenName: 'github-token',
      serviceGithubOwner: 'engr-lynx',
      serviceGithubRepo: 'net-sample',
      infraGithubTokenName: 'github-token',
      infraGithubOwner: 'engr-lynx',
      infraGithubRepo: 'cicd-demo',
      pipelineCache: servicePipelineCache,
    });
  }

}