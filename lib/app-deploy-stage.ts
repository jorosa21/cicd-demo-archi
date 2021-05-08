import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
import { GithubServerlessPipelineStack, GithubServerlessPipelineProps } from './github-serverless-pipeline-stack';
import { GithubLinuxCdnPipelineStack } from './github-linux-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';

type ServicePipelineContext = Pick<GithubServerlessPipelineProps,
  'appGithubTokenName' |
  'appGithubOwner' |
  'appGithubRepo' |
  'infraGithubTokenName' |
  'infraGithubOwner' |
  'infraGithubRepo'
>;

/**
 * Deployable unit of entire app
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
    const servicePipelinesContext = this.node.tryGetContext('ServicePipelines');
    Object.entries(servicePipelinesContext).forEach(servicePipelineEntry => {
      const [serviceId, servicePipelineContext] = servicePipelineEntry as [string, ServicePipelineContext]
      new GithubServerlessPipelineStack(this, serviceId + 'Pipeline', {
        serviceId,
        appGithubTokenName: servicePipelineContext.appGithubTokenName,
        appGithubOwner: servicePipelineContext.appGithubOwner,
        appGithubRepo: servicePipelineContext.appGithubRepo,
        infraGithubTokenName: servicePipelineContext.infraGithubTokenName,
        infraGithubOwner: servicePipelineContext.infraGithubOwner,
        infraGithubRepo: servicePipelineContext.infraGithubRepo,
        pipelineCache: servicePipelineCache.bucket,
      });
    });
  }

}