from json import dumps
from logging import getLogger, INFO
from boto3 import client
from botocore.exceptions import ClientError

logger = getLogger()
logger.setLevel(INFO)

cf = client('cloudfront')

def on_event(event, context):
  logger.info('Received event: %s' % dumps(event))
  request_type = event['RequestType']
  if request_type == 'Create': return on_create(event)
  if request_type == 'Update': return on_create(event)
  if request_type == 'Delete': return on_delete(event)
  raise Exception('Invalid request type: %s' % request_type)

def on_create(event):
  distribution_id = event['ResourceProperties']['distributionId']
  try:
    subscribe(distribution_id)
  except ClientError as e:
    logger.error('Error: %s', e)
    raise e
  return

def on_delete(event):
  distribution_id = event['ResourceProperties']['distributionId']
  try:
    unsubscribe(distribution_id)
  except ClientError as e:
    logger.error('Error: %s', e)
    raise e
  return

def subscribe(distribution_id):
  cf.create_monitoring_subscription(
    DistributionId=distribution_id,
    MonitoringSubscription={
      'RealtimeMetricsSubscriptionConfig': {
        'RealtimeMetricsSubscriptionStatus': 'Enabled'
      }
    }
  )
  return

def unsubscribe(distribution_id):
  cf.delete_monitoring_subscription(
    DistributionId=distribution_id
  )
  return
