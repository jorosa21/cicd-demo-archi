import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { GithubServerlessPipelineStack } from './github-serverless-pipeline-stack';

/**
 * Deployable unit of .Net Service
 */
export class NetServiceStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    new GithubServerlessPipelineStack(this, 'NetPipeline', {
      serviceGithubTokenName: 'github-token',
      serviceGithubOwner: 'engr-lynx',
      serviceGithubRepo: 'net-sample',
      infraGithubTokenName: 'github-token',
      infraGithubOwner: 'engr-lynx',
      infraGithubRepo: 'cicd-demo',
      serviceName: 'account-management',
    });
  }

}