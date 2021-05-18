from json import dumps
from logging import getLogger, INFO
from boto3 import client
from botocore.exceptions import ClientError

logger = getLogger()
logger.setLevel(INFO)

func = client('lambda')

def on_event(event, context):
  logger.info('Received event: %s' % dumps(event))
  request_type = event['RequestType']
  if request_type == 'Create': return on_create(event)
  if request_type == 'Update': return on_create(event)
  if request_type == 'Delete': return on_delete(event)
  raise Exception('Invalid request type: %s' % request_type)

def on_create(event):
  func_name = event['ResourceProperties']['funcName']
  repo_uri = event['ResourceProperties']['repoUri']
  try:
    update_code(func_name, repo_uri)
  except ClientError as e:
    logger.error('Error: %s', e)
    raise e
  return

def on_delete(event):
  # Todo: what should be done here?
  return

def update_code(func_name, repo_uri):
  func.update_function_code(
    FunctionName=func_name,
    ImageUri=repo_uri,
    Publish=True
  )
  return
