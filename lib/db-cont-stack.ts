import { join } from 'path';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Cluster, FargateService, FargateTaskDefinition } from '@aws-cdk/aws-ecs';

export interface DbContProps extends StackProps {
  cluster: Cluster,
}

export class DbContStack extends Stack {

  constructor(scope: Construct, id: string, dbContProps: DbContProps) {
    super(scope, id, dbContProps);

  }

}
