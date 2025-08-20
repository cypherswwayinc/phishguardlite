# Deploy to AWS (SAM)
- Build admin (served from /admin):
  ```bash
  cd backend/admin && npm install && npm run build
  ```
- Build & deploy:
  ```bash
  cd backend/aws-sam
  sam build
  sam deploy --guided
  ```
- Use this API in the extension Options:
  `https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod`
