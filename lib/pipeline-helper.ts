import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue } from '@aws-cdk/core';

enum RepoKind {
  CodeCommit = 'CODECOMMIT',
  GitHub = 'GITHUB',
} 

interface CodeCommitProps {
  repoKind: RepoKind.CodeCommit,
  repoName: string,
  createRepo: boolean,
}

interface GitHubProps {
  repoKind: RepoKind.GitHub,
  repoName: string,
  tokenName: string,
  owner: string,
}

export type RepoProps = CodeCommitProps | GitHubProps;

export interface RepoSourceActionProps {
  repoProps: RepoProps,
  namePrefix?: string,
  repoOutput: Artifact,
}

export interface StageProps {
  enableStaging?: boolean,
  enableTest?: boolean,
  enableApproval?: boolean,
  enableDeploy?: boolean,
  privilegedBuild?: boolean,
  stagingSpecFilename?: string,
  testSpecFilename?: string,
  deploySpecFilename?: string,
}

export interface Context {
  [key: string]: any,
}

export class ContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextError";
  }
}

export function buildRepoProps (context: Context) {
  let repoProps: RepoProps;
  const repoKind = context.repoKind.toUpperCase();
  switch(repoKind) {
    case RepoKind.CodeCommit:
      repoProps = {
        repoKind,
        repoName: context.repoName,
        createRepo: context.createRepo,
      };
      return repoProps;
    case RepoKind.GitHub:
      repoProps = {
        repoKind,
        repoName: context.repoName,
        tokenName: context.tokenName,
        owner: context.owner,
      };
      return repoProps;
    default:
      throw new ContextError('Unsupported Repository Type');
  };
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

export function buildStageProps (context: Context) {
  const stageProps: StageProps = {
    enableStaging: context.enableStaging,
    enableTest: context.enableTest,
    enableApproval: context.enableApproval,
    enableDeploy: context.enableDeploy,
    privilegedBuild: context.privilegedBuild,
    stagingSpecFilename: context.stagingSpecFilename,
    testSpecFilename: context.testSpecFilename,
    deploySpecFilename: context.deploySpecFilename,  
  };
  return stageProps;
}
