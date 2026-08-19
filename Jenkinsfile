pipeline {
    agent any

    environment {
        ECR_REPO_NAME  = "gym-catalog-service"
        KUBERNETES_DIR = "${WORKSPACE}/k8s"
        NAMESPACE      = "gym-dev"
        AWS_REGION     = "us-east-1"
        CLUSTER_NAME   = "gym-cluster"
        SECRET_NAME    = "gym/dev/catalog-postgres-credentials"

        IMAGE_TAG      = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"

        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        AWS_ACCOUNT_ID        = credentials('aws-account-id')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('ECR Authentication') {
            steps {
                sh "aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
            }
        }

        stage('Build Container Image') {
            steps {
                sh "docker build -t ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:${env.IMAGE_TAG} ."
                sh "docker tag ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:${env.IMAGE_TAG} ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:latest"
            }
        }

        stage('Push Image to AWS ECR') {
            steps {
                sh "docker push ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:${env.IMAGE_TAG}"
                sh "docker push ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_REPO_NAME}:latest"
            }
        }

        stage('Authenticate to EKS') {
            steps { sh "aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.CLUSTER_NAME}" }
        }

        stage('Deploy Postgres') {
            steps {
                sh '''
                    set -e
                    SECRET_JSON=$(aws secretsmanager get-secret-value \
                        --region "${AWS_REGION}" \
                        --secret-id "${POSTGRES_SECRET_NAME}" \
                        --query SecretString \
                        --output text)

                    POSTGRES_USER=$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("POSTGRES_USER") or d.get("username") or d.get("user") or "postgres")' <<< "$SECRET_JSON")
                    POSTGRES_PASSWORD=$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("POSTGRES_PASSWORD") or d.get("password") or "postgres")' <<< "$SECRET_JSON")
                    POSTGRES_DB=$(python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("POSTGRES_DB") or d.get("database") or d.get("dbname") or "gym_catalog")' <<< "$SECRET_JSON")

                    kubectl create secret generic postgres-secret \
                        -n "${NAMESPACE}" \
                        --from-literal=POSTGRES_USER="$POSTGRES_USER" \
                        --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
                        --from-literal=POSTGRES_DB="$POSTGRES_DB" \
                        --from-literal=DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@catalog-postgres:5432/${POSTGRES_DB}" \
                        --dry-run=client -o yaml | kubectl apply -f -
                '''
                sh "kubectl apply -f ${env.KUBERNETES_DIR}/postgres-statefulset.yaml"
                sh "kubectl apply -f ${env.KUBERNETES_DIR}/postgres-service.yaml"
                sh "kubectl rollout status statefulset/postgres -n ${env.NAMESPACE} --timeout=180s"
            }
        }

        stage('Deploy Catalog Service') {
            steps {
                script {
                    temp_deployment = sh(script: "mktemp", returnStdout: true).trim()
                    sh "sed -e \"s|<account-id>|${env.AWS_ACCOUNT_ID}|g\" -e \"s|<region>|${env.AWS_REGION}|g\" -e \"s|:latest|:${env.IMAGE_TAG}|g\" ${env.KUBERNETES_DIR}/app-deployment.yaml > ${temp_deployment}"
                    sh "kubectl apply -f ${temp_deployment}"
                    sh "rm -f ${temp_deployment}"
                }
                sh "kubectl apply -f ${env.KUBERNETES_DIR}/app-service.yaml"
                sh "kubectl rollout restart deployment/gym-catalog-service -n ${env.NAMESPACE}"
                sh "kubectl rollout status deployment/gym-catalog-service -n ${env.NAMESPACE} --timeout=120s"
            }
        }

        stage('Smoke Test') {
            steps { sh "kubectl run smoke-catalog --rm -i -n ${env.NAMESPACE} --image=curlimages/curl -- curl -sf http://gym-catalog-service:3000/health" }
        }
    }

    post {
        success { echo "✅ gym-catalog-service:${env.IMAGE_TAG} successfully deployed and healthy!" }
        failure { echo "❌ Deployment failed! Check logs." }
    }
}
