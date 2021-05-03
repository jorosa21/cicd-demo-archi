import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { GithubLinuxCdnPipelineStack } from './github-linux-cdn-pipeline-stack';
import { CdnStack } from './cdn-stack';

/**
 * Deployable unit of Angular site
 */
export class AngularSiteStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    const website = new CdnStack(this, 'Website');
    new GithubLinuxCdnPipelineStack(this, 'AngularPipeline', {
      githubTokenName: 'github-token',
      githubOwner: 'engr-lynx',
      githubRepo: 'angular-sample',
      s3Bucket: website.sourceBucket,
      distributionId: website.distributionId,
    });
  }

}