import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { PipelineCacheStack } from './pipeline-cache-stack';
import { RepoDbContPipelineStack } from './repo-db-cont-pipeline-stack';
import { RepoSlsContPipelineStack } from './repo-sls-cont-pipeline-stack';
import { RepoCdnPipelineStack } from './repo-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';
import { NetworkClusterStack } from './network-cluster-stack';
import { SlsContStack } from './sls-cont-stack';
import { DbContStack } from './db-cont-stack';
import { Context, buildRepoProps, buildStageProps, buildDbProps } from './context-helper';

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
    const serviceNetwork = new NetworkClusterStack(this, 'ServiceNetwork');
    const servicePipelinesContext = this.node.tryGetContext('ServicePipelines');
    Object.entries(servicePipelinesContext).forEach(servicePipelineEntry => {
      const [serviceId, servicePipelineContext] = servicePipelineEntry as [string, Context];
      const serviceDbProps = buildDbProps(servicePipelineContext);  
      const serviceDb = new DbContStack(this, serviceId + 'Db', {
        dbProps: serviceDbProps,
        cluster: serviceNetwork.cluster,
      });
      const serviceApp = new SlsContStack(this, serviceId + 'App', {
        vpc: serviceNetwork.vpc,
      });      
      // const serviceDbRepoProps = buildRepoProps(servicePipelineContext);
      // const serviceDbStageProps = buildStageProps(servicePipelineContext);
      // new RepoDbContPipelineStack(this, serviceId + 'DbPipeline', {
      //   repoProps: serviceDbRepoProps,
      //   stageProps: serviceDbStageProps,
      //   task: serviceDb.dbTask,
      // });
      const serviceAppRepoProps = buildRepoProps(servicePipelineContext);
      const serviceAppStageProps = buildStageProps(servicePipelineContext);
      new RepoSlsContPipelineStack(this, serviceId + 'AppPipeline', {
        repoProps: serviceAppRepoProps,
        stageProps: serviceAppStageProps,
        func: serviceApp.func,
      });
    });
  }

}

