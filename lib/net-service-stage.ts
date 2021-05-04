import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { GithubLinuxServerlessPipelineStack } from './github-linux-serverless-pipeline-stack';
import { ServerlessStack } from './serverless-stack';

/**
 * Deployable unit of .Net Service
 */
export class NetServiceStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    // const api = new ServerlessStack(this, 'Api');
    // new GithubLinuxServerlessPipelineStack(this, 'NetPipeline', {
    //   githubTokenName: 'github-token',
    //   githubOwner: 'engr-lynx',
    //   githubRepo: 'angular-sample',
    //   ecrRepository: api.imageRepository,
    // });
  }

}