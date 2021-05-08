import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
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
    const sitePipelineCache = new PipelineCacheStack(this, 'SitePipelineCache', {
      env: siteEnv,
    });
    const sitePipelineContext = this.node.tryGetContext('SitePipeline');  
    new GithubLinuxCdnPipelineStack(this, 'SitePipeline', {
      githubTokenName: sitePipelineContext.githubTokenName,
      githubOwner: sitePipelineContext.githubOwner,
      githubRepo: sitePipelineContext.githubRepo,
      distributionSource: site.sourceBucket,
      distributionId: site.distributionId,
      pipelineCache: sitePipelineCache.bucket,
      enableTestStage: sitePipelineContext.enableTestStage,
      env: siteEnv,
    });
    const servicePipelineCache = new PipelineCacheStack(this, 'ServicePipelineCache');
    const servicePipelineContext = this.node.tryGetContext('ServicePipeline');  
    // ToDo: loop and add suffix when already deploying multiple services
    new GithubServerlessPipelineStack(this, 'ServicePipeline', {
      appGithubTokenName: servicePipelineContext.appGithubTokenName,
      appGithubOwner: servicePipelineContext.appGithubOwner,
      appGithubRepo: servicePipelineContext.appGithubRepo,
      infraGithubTokenName: servicePipelineContext.infraGithubTokenName,
      infraGithubOwner: servicePipelineContext.infraGithubOwner,
      infraGithubRepo: servicePipelineContext.infraGithubRepo,
      pipelineCache: servicePipelineCache.bucket,
    });
  }

}