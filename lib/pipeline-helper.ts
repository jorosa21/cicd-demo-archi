import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';

interface GithubProps {
  githubTokenName: string,
  githubOwner: string,
  githubRepoName: string,
}

interface CodeCommitProps {
  codeCommitRepoName: string,
}

export type RepoProps = GithubProps | CodeCommitProps;

export interface GitSourceActionProps {
  repoProps: RepoProps,
  namePrefix?: string,
  repoOutput: Artifact,
  createRepo: boolean,
}

export interface Context {
  [key: string]: any,
}

export function buildRepoProps (context: Context) {
  if (context.codeCommitRepoName !== undefined) {
    return {
      codeCommitRepoName: context.codeCommitRepoName,
    };
  } else {
    return {
      githubTokenName: context.githubTokenName,
      githubOwner: context.githubOwner,
      githubRepoName: context.githubRepoName,
    };
  };  
}

export function buildGitSourceAction (scope: Construct, gitSourceActionProps: GitSourceActionProps) {
  const actionName = (gitSourceActionProps.namePrefix ?? '') + 'GitSource';
  if ((<CodeCommitProps>gitSourceActionProps.repoProps).codeCommitRepoName !== undefined) {
    const codeCommitProps = gitSourceActionProps.repoProps as CodeCommitProps;
    let infraRepo: IRepository;
    if (gitSourceActionProps.createRepo) {
      infraRepo = Repository.fromRepositoryName(scope, 'InfraRepo', codeCommitProps.codeCommitRepoName);
    } else {
      infraRepo = new Repository(scope, 'InfraRepo', {
        repositoryName: codeCommitProps.codeCommitRepoName,
      });  
    }
    return new CodeCommitSourceAction({
      actionName,
      output: gitSourceActionProps.repoOutput,
      repository: infraRepo,
    });
  } else {
    const githubProps = gitSourceActionProps.repoProps as GithubProps;
    const githubToken = SecretValue.secretsManager(githubProps.githubTokenName);
    return new GitHubSourceAction({
      actionName,
      output: gitSourceActionProps.repoOutput,
      oauthToken: githubToken,
      owner: githubProps.githubOwner,
      repo: githubProps.githubRepoName,
    });
  };
}