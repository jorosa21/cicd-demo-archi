import { join } from 'path';
import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
import { AuthorizationType } from '@aws-cdk/aws-apigateway';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { Runtime, Code } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';

export interface SlsContProps extends StackProps {
  vpc: Vpc,
}

export class SlsContStack extends Stack {

  constructor(scope: Construct, id: string, slsContProps: SlsContProps) {
    super(scope, id, slsContProps);
    const contCode = Code.fromDockerBuild(join(__dirname, 'sls-cont-dummy'));
    const lambdaProps = {
      runtime: Runtime.PYTHON_3_8,
      handler: 'app.handler',
      code: contCode,
      vpc: slsContProps.vpc,
      logRetention: RetentionDays.ONE_DAY,
    }
    const methodOpts = {
      // ToDo: change type to custom or Cognito once the auth mechanism is added
      authorizationType: AuthorizationType.NONE,
    };
    const apiGatewayProps = {
      defaultMethodOptions: methodOpts,
    }
    new ApiGatewayToLambda(this, 'Serverless', {
      lambdaFunctionProps: lambdaProps,
      apiGatewayProps,
    });
  }

}
