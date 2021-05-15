import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';

interface GitHubProps {
  tokenName: string,
  owner: string,
  repoName: string,
}

interface CodeCommitProps {
  repoName: string,
  create: boolean,
}

export type RepoProps = GitHubProps | CodeCommitProps;

export interface RepoSourceActionProps {
  repoProps: RepoProps,
  namePrefix?: string,
  repoOutput: Artifact,
}

export interface StageProps {
  enableStaging: boolean,
  enableTest: boolean,
  enableDeploy: boolean,
  enableApproval: boolean,
  stagingSpecFilename?: string,
  testSpecFilename?: string,
  deploySpecFilename?: string,
}

export interface Context {
  [key: string]: any,
}

export function buildRepoProps (context: Context) {
  if (context.codeCommitRepoName !== undefined) {
    return {
      repoName: context.codeCommitRepoName,
      create: context.codeCommitCreate,
    };
  } else {
    return {
      tokenName: context.gitHubTokenName,
      owner: context.gitHubOwner,
      repoName: context.gitHubRepoName,
    };
  };  
}

export function buildRepoSourceAction (scope: Construct, repoSourceActionProps: RepoSourceActionProps) {
  const actionName = (repoSourceActionProps.namePrefix ?? '') + 'RepoSource';
  if ((<CodeCommitProps>repoSourceActionProps.repoProps).repoName !== undefined) {
    const repoId = scope.node.id + (repoSourceActionProps.namePrefix ?? '') + 'Repo';
    const codeCommitProps = repoSourceActionProps.repoProps as CodeCommitProps;
    let repository: IRepository;
    if (codeCommitProps.create) {
      repository = new Repository(scope, repoId, {
        repositoryName: codeCommitProps.repoName,
      });  
    } else {
      repository = Repository.fromRepositoryName(scope, repoId, codeCommitProps.repoName);
    }
    return new CodeCommitSourceAction({
      actionName,
      output: repoSourceActionProps.repoOutput,
      repository,
    });
  } else {
    const gitHubProps = repoSourceActionProps.repoProps as GitHubProps;
    const gitHubToken = SecretValue.secretsManager(gitHubProps.tokenName);
    return new GitHubSourceAction({
      actionName,
      output: repoSourceActionProps.repoOutput,
      oauthToken: gitHubToken,
      owner: gitHubProps.owner,
      repo: gitHubProps.repoName,
    });
  };
}