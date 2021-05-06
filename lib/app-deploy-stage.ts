import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { GithubServerlessPipelineStack } from './github-serverless-pipeline-stack';
import { SiteStack } from './site-stack';

/**
 * Deployable unit of Angular site
 */
export class AppDeployStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    const websiteEnv = {
      region: 'us-east-1', // use us-east-1 to allow simple CloudFront integration
    };
    new SiteStack(this, 'Website', {
      env: websiteEnv,
    });
    new GithubServerlessPipelineStack(this, 'ServicePipeline', {
      // ToDo: use context for these instead of hardcoded.
      serviceGithubTokenName: 'github-token',
      serviceGithubOwner: 'engr-lynx',
      serviceGithubRepo: 'net-sample',
      infraGithubTokenName: 'github-token',
      infraGithubOwner: 'engr-lynx',
      infraGithubRepo: 'cicd-demo',
    });
  }

}