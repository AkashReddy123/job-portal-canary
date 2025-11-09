pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'balaakashreddyy'
        DOCKERHUB_PASS = credentials('dockerhub-login') // Jenkins credential ID
        EC2_IP = '52.54.181.179'
        PPK_PATH = 'C:\\Users\\Y BALA AKASH REDDY\\Downloads\\key-job-portal.ppk'
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo '📥 Checking out project source from GitHub...'
                git branch: 'main', url: 'https://github.com/AkashReddy123/job-portal-canary.git'
            }
        }

        stage('Build Frontend V1 & V2') {
            steps {
                echo '🏗️ Building Frontend V1...'
                dir('frontend-v1') {
                    bat 'npm install'
                    bat 'npm run build'
                }

                echo '🏗️ Building Frontend V2...'
                dir('frontend-v2') {
                    bat 'npm install'
                    bat 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            steps {
                echo '⚙️ Building Backend...'
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker Images...'
                bat 'docker-compose build'
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo '📦 Pushing Docker Images to DockerHub...'
                bat """
                echo Logging in to DockerHub...
                echo %DOCKERHUB_PASS% | docker login -u %DOCKERHUB_USER% --password-stdin || exit /b 1

                echo Tagging images...
                docker tag job-portal-canary-pipeline-web_v1:latest %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                docker tag job-portal-canary-pipeline-web_v2:latest %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                docker tag job-portal-canary-pipeline-backend:latest %DOCKERHUB_USER%/job-portal-canary-backend:latest

                echo Pushing images...
                docker push %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                docker push %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                docker push %DOCKERHUB_USER%/job-portal-canary-backend:latest
                """
            }
        }

        stage('Test EC2 Connection') {
            steps {
                echo '🔌 Testing EC2 SSH connectivity...'
                bat """
                echo y | plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "echo ✅ SSH connection successful!"
                """
            }
        }

        stage('Sync Nginx Configs to EC2') {
            steps {
                echo '🗂️ Syncing nginx canary configs to EC2...'
                bat """
                pscp -batch -i "${PPK_PATH}" nginx_90_10.conf ubuntu@${EC2_IP}:/home/ubuntu/nginx_90_10.conf
                pscp -batch -i "${PPK_PATH}" nginx_100.conf ubuntu@${EC2_IP}:/home/ubuntu/nginx_100.conf

                echo --- Setting default active config to 100% (stable) ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "sudo cp /home/ubuntu/nginx_100.conf /home/ubuntu/nginx_active.conf"
                """
            }
        }

        stage('Deploy to EC2') {
            steps {
                echo '🚀 Pulling latest images and deploying on EC2...'
                bat """
                echo --- Pulling Web V1 ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker pull ${DOCKERHUB_USER}/job-portal-canary-web_v1:latest"

                echo --- Pulling Web V2 ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker pull ${DOCKERHUB_USER}/job-portal-canary-web_v2:latest"

                echo --- Pulling Backend ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker pull ${DOCKERHUB_USER}/job-portal-canary-backend:latest"

                echo --- Starting services ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker-compose -f /home/ubuntu/docker-compose.yml up -d"

                echo --- Restarting nginx_lb ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker rm -f nginx_lb || true"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker run -d --name nginx_lb --network ubuntu_jobportal-net -p 80:80 -v /home/ubuntu/nginx_active.conf:/etc/nginx/nginx.conf:ro nginx:alpine"
                """
            }
        }

        stage('Traffic Split 90/10') {
            steps {
                echo '🔀 Shifting traffic 90/10 (V1→V2)...'
                bat """
                echo --- Applying 90/10 traffic split config ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "sudo cp /home/ubuntu/nginx_90_10.conf /home/ubuntu/nginx_active.conf"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker restart nginx_lb"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker ps"
                """
            }
        }

        stage('Promote Canary to 100%') {
            steps {
                echo '🚀 Promoting Canary (V2 → 100%)...'
                bat """
                echo --- Switching to 100% traffic for V2 ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "sudo cp /home/ubuntu/nginx_100.conf /home/ubuntu/nginx_active.conf"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker restart nginx_lb"
                """
            }
        }

        stage('Validate Deployment') {
            steps {
                echo '🔍 Validating EC2 deployment health...'
                bat """
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker ps"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "curl -I localhost"
                """
            }
        }

        stage('Clean Up Old V1') {
            steps {
                echo '🧹 Cleaning up old version (V1)...'
                bat """
                echo --- Stopping and removing old container ---
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker stop web_v1 || true"
                plink -batch -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker rm web_v1 || true"
                """
            }
        }
    }

    post {
        success {
            echo '✅ Deployment Successful! Canary fully promoted to production.'
        }
        failure {
            echo '❌ Deployment Failed — Check Jenkins Logs!'
        }
    }
}
