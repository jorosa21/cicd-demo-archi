import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';
import { DockerImageFunction, DockerImageCode } from '@aws-cdk/aws-lambda';
import { AuthorizationType } from '@aws-cdk/aws-apigateway';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';

export class ServerlessStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const imageRepoName = this.node.tryGetContext('imageRepoName');
    const imageRepo = Repository.fromRepositoryName(this, 'ImageRepo', imageRepoName);
    const lambdaImage = DockerImageCode.fromEcr(imageRepo);
    const lambdaObj = new DockerImageFunction(this, 'LambdaObj', {
      code: lambdaImage,
    });
    const methodOpts = {
      authorizationType: AuthorizationType.NONE,
    };
    const apiGatewayProps = {
      defaultMethodOptions: methodOpts,
    }
    new ApiGatewayToLambda(this, 'Serverless', {
      existingLambdaObj: lambdaObj,
      apiGatewayProps,
    });
  }

}
