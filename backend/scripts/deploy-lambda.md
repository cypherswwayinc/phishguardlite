# Deploying to AWS Lambda (High Level)

1. Package FastAPI with `mangum` adapter:
   ```bash
   pip install mangum
   ```

2. Modify `app.py`:
   ```python
   from mangum import Mangum
   handler = Mangum(app)
   ```

3. Create a Lambda function (Python 3.11 runtime). Zip your dependencies + code.
4. Create an API Gateway (HTTP API) and integrate with the Lambda.
5. (Optional) Give Lambda IAM permissions to write to S3 for `/report` storage.
6. Point the extension to your API base URL if you add cloud features.