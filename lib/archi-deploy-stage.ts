import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
import { RepoSlsContPipelineStack } from './repo-sls-cont-pipeline-stack';
import { RepoCdnPipelineStack } from './repo-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';
import { Context, buildRepoProps } from './pipeline-helper';


interface ServicePipelineContext {
  app: Context,
  archi: Context,
}

/**
 * Deployable unit of entire architecture
 */
export class ArchiDeployStage extends Stage {

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
    new RepoCdnPipelineStack(this, 'SitePipeline', {
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
      const archiRepoProps = buildRepoProps(servicePipelineContext.archi);
      new RepoSlsContPipelineStack(this, serviceId + 'Pipeline', {
        serviceId,
        appRepoProps,
        archiRepoProps,
        pipelineCache: servicePipelineCache.bucket,
      });
    });
  }

}

