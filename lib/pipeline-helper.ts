import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';

export interface GithubProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepoName: string,
}

export interface CodeCommitProps {
  codeCommitRepoName: string,
}

export function buildRepoSourceAction (scope: Construct, repoProps: GithubProps | CodeCommitProps,
    repoOutput: Artifact, createRepo: boolean) {
  if ((<CodeCommitProps>repoProps).codeCommitRepoName !== undefined) {
    const codeCommitProps = repoProps as CodeCommitProps;
    let infraRepo: IRepository;
    if (createRepo) {
      infraRepo = Repository.fromRepositoryName(scope, 'InfraRepo', codeCommitProps.codeCommitRepoName);
    } else {
      infraRepo = new Repository(scope, 'InfraRepo', {
        repositoryName: codeCommitProps.codeCommitRepoName,
      });  
    }
    return new CodeCommitSourceAction({
      actionName: 'GitSource',
      output: repoOutput,
      repository: infraRepo,
    });
  } else {
    const githubProps = repoProps as GithubProps;
    const githubToken = SecretValue.secretsManager(githubProps.githubTokenName);
    return new GitHubSourceAction({
      actionName: 'GitSource',
      output: repoOutput,
      oauthToken: githubToken,
      owner: githubProps.githubOwner,
      repo: githubProps.githubRepoName,
    });
  };
}