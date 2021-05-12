import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
import { GitServerlessPipelineStack } from './git-serverless-pipeline-stack';
import { GitLinuxCdnPipelineStack } from './git-linux-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';
import { Context, buildRepoProps } from './pipeline-helper';


interface ServicePipelineContext {
  app: Context,
  infra: Context,
}

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
    const siteRepoProps = buildRepoProps(sitePipelineContext);
    new GitLinuxCdnPipelineStack(this, 'SitePipeline', {
      repoProps: siteRepoProps,
      distributionSource: site.sourceBucket,
      distributionId: site.distributionId,
      pipelineCache: sitePipelineCache.bucket,
      enableTestStage: sitePipelineContext.enableTestStage,
      env: siteEnv,
    });
    const servicePipelineCache = new PipelineCacheStack(this, 'ServicePipelineCache');
    const servicePipelinesContext = this.node.tryGetContext('ServicePipelines');
    Object.entries(servicePipelinesContext).forEach(servicePipelineEntry => {
      const [serviceId, servicePipelineContext] = servicePipelineEntry as [string, ServicePipelineContext];
      const appRepoProps = buildRepoProps(servicePipelineContext.app);
      const infraRepoProps = buildRepoProps(servicePipelineContext.infra);
      new GitServerlessPipelineStack(this, serviceId + 'Pipeline', {
        serviceId,
        appRepoProps,
        infraRepoProps,
        pipelineCache: servicePipelineCache.bucket,
      });
    });
  }

}

