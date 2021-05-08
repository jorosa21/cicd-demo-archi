import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { InfraPipelineStack } from '../lib/infra-pipeline-stack';

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new InfraPipelineStack(app, 'CiCdDemoPipeline');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
