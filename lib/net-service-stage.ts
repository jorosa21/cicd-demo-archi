import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { ApiStack } from './api-stack';

/**
 * Deployable unit of .Net Service
 */
export class NetServiceStage extends Stage {

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    const website = new ApiStack(this, 'Api');
  }

}