import { Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';
import { DockerImageFunction, DockerImageCode } from '@aws-cdk/aws-lambda';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';

export class ServerlessStack extends Stack {

  public readonly imageRepository: Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.imageRepository = new Repository(this, 'ImageRepository');
    const lambdaImage = DockerImageCode.fromEcr(this.imageRepository);
    const lambdaObj = new DockerImageFunction(this, 'LambdaObj', {
      code: lambdaImage,
    })
    const serverless = new ApiGatewayToLambda(this, 'Serverless', {
      existingLambdaObj: lambdaObj,
    });
    new CfnOutput(this, 'URL', {
      value: 'https://' + serverless.apiGateway.deploymentStage.urlForPath,
    });
  }

}
