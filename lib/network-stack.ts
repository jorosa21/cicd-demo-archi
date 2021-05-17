import { Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';

export class NetworkStack extends Stack {

  public readonly vpcId: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const vpc = new Vpc(this, 'ServiceNetwork');
    this.vpcId = vpc.vpcId;
  }

}
