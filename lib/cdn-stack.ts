import { Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

export class CdnStack extends Stack {

  public readonly sourceBucket: Bucket;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const cdn = new CloudFrontToS3(this, 'Cdn', {});
    this.sourceBucket = cdn.s3Bucket as Bucket;
    this.distributionId = cdn.cloudFrontWebDistribution.distributionId;
    new CfnOutput(this, 'URL', {
      value: 'https://' + cdn.cloudFrontWebDistribution.domainName + '/',
    });
  }

}
