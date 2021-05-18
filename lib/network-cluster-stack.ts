import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
import { Cluster } from '@aws-cdk/aws-ecs';

export class NetworkClusterStack extends Stack {

  public readonly vpc: Vpc;
  public readonly cluster: Cluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.vpc = new Vpc(this, 'Vpc');
    this.cluster = new Cluster(this, "Cluster", {
      vpc: this.vpc,
    });
  }

}
