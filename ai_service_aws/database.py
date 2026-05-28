import os
import boto3
from dotenv import load_dotenv

load_dotenv()

class DatabaseHelper:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'ap-south-1'))
        self.table = self.dynamodb.Table('statements')
        
        # Ensure table exists (similar to Java auto-create)
        try:
            self.table.load()
        except Exception:
            try:
                self.table = self.dynamodb.create_table(
                    TableName='statements',
                    KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
                    AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
                    BillingMode='PAY_PER_REQUEST'
                )
                self.table.wait_until_exists()
            except Exception as e:
                print(f"Error creating DynamoDB table: {e}")

    def get_document(self, doc_id: str):
        try:
            response = self.table.get_item(Key={'id': doc_id})
            return response.get('Item')
        except Exception as e:
            print(f"Error getting document from DynamoDB: {e}")
            return None

    def update_document_results(self, doc_id: str, transactions: list, summary_metrics: dict, ai_summary: str = None, ad_payload: dict = None) -> bool:
        try:
            update_expr = "SET transactions = :t, summaryMetrics = :s, #st = :status"
            expr_attr_values = {
                ':t': transactions,
                ':s': summary_metrics,
                ':status': 'COMPLETED'
            }
            expr_attr_names = {
                '#st': 'status'
            }

            if ai_summary:
                update_expr += ", aiSummary = :ai"
                expr_attr_values[':ai'] = ai_summary
                
            if ad_payload:
                update_expr += ", adPayload = :ad"
                expr_attr_values[':ad'] = ad_payload

            self.table.update_item(
                Key={'id': doc_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_attr_values,
                ExpressionAttributeNames=expr_attr_names
            )
            return True
        except Exception as e:
            print(f"Error updating DynamoDB document: {e}")
            return False

db_helper = DatabaseHelper()
