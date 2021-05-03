import { Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';

export class ApiStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const api = new ApiGatewayToLambda(this, 'Api', {});
    new CfnOutput(this, 'URL', {
      value: 'https://' + api.apiGateway.deploymentStage.urlForPath,
    });
  }

}
