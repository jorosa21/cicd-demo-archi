import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { InfraStack } from '../lib/infra-stack';

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new InfraStack(app, 'CiCdDemo');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
