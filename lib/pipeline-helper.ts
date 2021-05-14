import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';

interface GithubProps {
  tokenName: string,
  owner: string,
  repoName: string,
}

interface CodeCommitProps {
  repoName: string,
  create: boolean,
}

export type RepoProps = GithubProps | CodeCommitProps;

export interface GitSourceActionProps {
  repoProps: RepoProps,
  namePrefix?: string,
  repoOutput: Artifact,
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
      tokenName: context.githubTokenName,
      owner: context.githubOwner,
      repoName: context.githubRepoName,
    };
  };  
}

export function buildGitSourceAction (scope: Construct, gitSourceActionProps: GitSourceActionProps) {
  const actionName = (gitSourceActionProps.namePrefix ?? '') + 'GitSource';
  if ((<CodeCommitProps>gitSourceActionProps.repoProps).repoName !== undefined) {
    const repoId = scope.node.id + (gitSourceActionProps.namePrefix ?? '') + 'Repo';
    const codeCommitProps = gitSourceActionProps.repoProps as CodeCommitProps;
    let infraRepo: IRepository;
    if (codeCommitProps.create) {
      infraRepo = new Repository(scope, repoId, {
        repositoryName: codeCommitProps.repoName,
      });  
    } else {
      infraRepo = Repository.fromRepositoryName(scope, repoId, codeCommitProps.repoName);
    }
    return new CodeCommitSourceAction({
      actionName,
      output: gitSourceActionProps.repoOutput,
      repository: infraRepo,
    });
  } else {
    const githubProps = gitSourceActionProps.repoProps as GithubProps;
    const githubToken = SecretValue.secretsManager(githubProps.tokenName);
    return new GitHubSourceAction({
      actionName,
      output: gitSourceActionProps.repoOutput,
      oauthToken: githubToken,
      owner: githubProps.owner,
      repo: githubProps.repoName,
    });
  };
}