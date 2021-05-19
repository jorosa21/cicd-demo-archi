import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';
import { RepoKind, CodeCommitProps, GitHubProps, RepoProps } from './context-helper'

export interface RepoSourceActionProps {
  repoProps: RepoProps,
  namePrefix?: string,
  repoOutput: Artifact,
}

export function buildRepoSourceAction (scope: Construct, repoSourceActionProps: RepoSourceActionProps) {
  const actionName = (repoSourceActionProps.namePrefix ?? '') + 'RepoSource';
  switch(repoSourceActionProps.repoProps.repoKind) {
    case RepoKind.CodeCommit:
      const codeCommitProps = repoSourceActionProps.repoProps as CodeCommitProps;
      const repoId = scope.node.id + (repoSourceActionProps.namePrefix ?? '') + 'Repo';
      let repo: IRepository;
      if (codeCommitProps.createRepo) {
        repo = new Repository(scope, repoId, {
          repositoryName: codeCommitProps.repoName,
        });  
      } else {
        repo = Repository.fromRepositoryName(scope, repoId, codeCommitProps.repoName);
      }
      return new CodeCommitSourceAction({
        actionName,
        output: repoSourceActionProps.repoOutput,
        repository: repo,
      });
    case RepoKind.GitHub:
      const gitHubProps = repoSourceActionProps.repoProps as GitHubProps;
      const gitHubToken = SecretValue.secretsManager(gitHubProps.tokenName);
      return new GitHubSourceAction({
        actionName,
        output: repoSourceActionProps.repoOutput,
        oauthToken: gitHubToken,
        owner: gitHubProps.owner,
        repo: gitHubProps.repoName,
      });
    default:
      throw new Error('Unsupported Type');
  };
}
