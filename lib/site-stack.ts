import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { GithubLinuxCdnPipelineStack } from './github-linux-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';

export class SiteStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const site = new CdnStack(this, 'Site');
    new GithubLinuxCdnPipelineStack(this, 'SitePipeline', {
      // ToDo: use context for these instead of hardcoded.
      githubTokenName: 'github-token',
      githubOwner: 'engr-lynx',
      githubRepo: 'angular-sample',
      s3Bucket: site.sourceBucket,
      distributionId: site.distributionId,
    });
  }

}
