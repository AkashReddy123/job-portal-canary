pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'balaakashreddyy'
        DOCKERHUB_PASS = credentials('dockerhub-login')  // Jenkins credential ID
        EC2_IP = '18.212.119.91'
        PPK_PATH = 'C:\\Users\\Y BALA AKASH REDDY\\Downloads\\latest-key-2.ppk'
        GIT_URL = 'https://github.com/AkashReddy123/job-portal-canary.git'
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo '📥 Checking out latest code...'
                git branch: 'main', url: "${GIT_URL}"
            }
        }

        stage('Build Frontend (V1 & V2)') {
            steps {
                echo '🏗️ Building frontend versions...'
                dir('frontend-v1') {
                    bat 'npm install'
                    bat 'npm run build'
                }
                dir('frontend-v2') {
                    bat 'npm install'
                    bat 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            steps {
                echo '⚙️ Installing backend dependencies...'
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images...'
                bat 'docker compose build'
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo '📦 Pushing Docker images to Docker Hub...'
                bat '''
                    echo Logging into DockerHub...
                    echo %DOCKERHUB_PASS% | docker login -u %DOCKERHUB_USER% --password-stdin
                    docker tag job-portal-canary-pipeline-web_v1:latest %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                    docker tag job-portal-canary-pipeline-web_v2:latest %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                    docker tag job-portal-canary-pipeline-backend:latest %DOCKERHUB_USER%/job-portal-canary-backend:latest
                    docker push %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                    docker push %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                    docker push %DOCKERHUB_USER%/job-portal-canary-backend:latest
                '''
            }
        }

        stage('Deploy on EC2') {
            steps {
                echo '🚀 Deploying latest images on EC2...'
                script {
                    def deployCmd = '''
                        cd /home/ubuntu &&
                        docker compose down &&
                        docker compose pull &&
                        docker compose up -d --build
                    '''.replaceAll("\\r?\\n", " ").trim()

                    bat """
                        echo off
                        echo y | plink -ssh -i "${PPK_PATH}" ubuntu@${EC2_IP} exit >NUL 2>&1
                        plink -ssh -batch -no-antispoof -i "${PPK_PATH}" ubuntu@${EC2_IP} "${deployCmd}"
                    """
                }
            }
        }
    }

    post {
        success {
            echo '✅ Deployment completed successfully!'
        }
        failure {
            echo '❌ Deployment failed — check Jenkins logs.'
        }
    }
}
