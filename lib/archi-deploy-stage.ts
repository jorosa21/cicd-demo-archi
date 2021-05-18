import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
import { RepoSlsContPipelineStack } from './repo-sls-cont-pipeline-stack';
import { RepoCdnPipelineStack } from './repo-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';
import { NetworkStack } from './network-stack';
import { SlsContStack } from './sls-cont-stack';
import { Context, buildRepoProps, buildStageProps } from './pipeline-helper';

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
    const siteStageProps = buildStageProps(sitePipelineContext);
    new RepoCdnPipelineStack(this, 'SitePipeline', {
      repoProps: siteRepoProps,
      stageProps: siteStageProps,
      distributionSource: site.sourceBucket,
      distribution: site.distribution,
      pipelineCache: sitePipelineCache.bucket,
      env: siteEnv,
    });
    const serviceNetwork = new NetworkStack(this, 'ServiceNetwork');
    const servicePipelinesContext = this.node.tryGetContext('ServicePipelines');
    Object.entries(servicePipelinesContext).forEach(servicePipelineEntry => {
      const [serviceId, servicePipelineContext] = servicePipelineEntry as [string, Context];
      const service = new SlsContStack(this, serviceId, {
        vpc: serviceNetwork.vpc,
      });
      const serviceRepoProps = buildRepoProps(servicePipelineContext);
      const serviceStageProps = buildStageProps(servicePipelineContext);
      new RepoSlsContPipelineStack(this, serviceId + 'Pipeline', {
        repoProps: serviceRepoProps,
        stageProps: serviceStageProps,
        func: service.func,
      });
    });
  }

}

