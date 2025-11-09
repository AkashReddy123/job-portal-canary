pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'balaakashreddyy'
        DOCKERHUB_PASS = credentials('dockerhub-login')  // Jenkins credentials ID
        EC2_IP = '54.164.196.3'
        PPK_PATH = 'C:\\Users\\Y BALA AKASH REDDY\\Downloads\\latest-key.ppk'
        GIT_URL = 'https://github.com/AkashReddy123/job-portal-canary.git'
        GIT_BRANCH = 'main'
        HOST_KEY = 'ssh-ed25519 255 SHA256:KHfANlDuaxmI4YaMKAV8GiqUu3aMemtu0xSArO/mnKs'
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo '📥 Checking out latest project code...'
                git branch: "${GIT_BRANCH}", url: "${GIT_URL}"
            }
        }

        stage('Build & Test Frontend (V1 & V2)') {
            steps {
                echo '🏗️ Building frontend-v1 and frontend-v2...'
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

        stage('Build & Test Backend') {
            steps {
                echo '⚙️ Installing backend dependencies...'
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images via Compose...'
                bat 'docker compose build'
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo '📦 Pushing Docker images to Docker Hub...'
                bat """
                echo Logging into DockerHub...
                echo %DOCKERHUB_PASS% | docker login -u %DOCKERHUB_USER% --password-stdin

                docker tag job-portal-canary-pipeline-web_v1:latest %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                docker tag job-portal-canary-pipeline-web_v2:latest %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                docker tag job-portal-canary-pipeline-backend:latest %DOCKERHUB_USER%/job-portal-canary-backend:latest

                docker push %DOCKERHUB_USER%/job-portal-canary-web_v1:latest
                docker push %DOCKERHUB_USER%/job-portal-canary-web_v2:latest
                docker push %DOCKERHUB_USER%/job-portal-canary-backend:latest
                """
            }
        }

        stage('Prepare EC2 Environment') {
            steps {
                echo '🔧 Preparing EC2 environment (folders, configs, env file)...'
                bat """
                plink -batch -i "${PPK_PATH}" -hostkey "${HOST_KEY}" ubuntu@${EC2_IP} "
                    sudo apt update -y &&
                    sudo apt install -y docker.io git &&
                    sudo systemctl enable docker &&
                    sudo systemctl start docker &&
                    if [ ! -d /home/ubuntu/job-portal-canary ]; then
                        git clone ${GIT_URL} /home/ubuntu/job-portal-canary;
                    fi &&
                    cp -r /home/ubuntu/job-portal-canary/frontend-v1 /home/ubuntu/ &&
                    cp -r /home/ubuntu/job-portal-canary/frontend-v2 /home/ubuntu/ &&
                    cp -r /home/ubuntu/job-portal-canary/backend /home/ubuntu/ &&
                    cp -r /home/ubuntu/job-portal-canary/nginx /home/ubuntu/ &&
                    cp /home/ubuntu/job-portal-canary/docker-compose.yml /home/ubuntu/ &&
                    cp /home/ubuntu/job-portal-canary/nginx_90_10.conf /home/ubuntu/ &&
                    cp /home/ubuntu/job-portal-canary/nginx_100.conf /home/ubuntu/ &&
                    if [ ! -f /home/ubuntu/backend/.env ]; then
                        echo 'PORT=5000' > /home/ubuntu/backend/.env &&
                        echo 'MONGO_URI=mongodb://mongo:27017/jobportal' >> /home/ubuntu/backend/.env &&
                        echo 'JWT_SECRET=supersecretkey' >> /home/ubuntu/backend/.env &&
                        echo 'NODE_ENV=production' >> /home/ubuntu/backend/.env;
                    fi
                "
                """
            }
        }

        stage('Deploy on EC2') {
            steps {
                echo '🚀 Deploying latest images via Docker Compose...'
                bat """
                plink -batch -i "${PPK_PATH}" -hostkey "${HOST_KEY}" ubuntu@${EC2_IP} "
                    docker pull ${DOCKERHUB_USER}/job-portal-canary-web_v1:latest &&
                    docker pull ${DOCKERHUB_USER}/job-portal-canary-web_v2:latest &&
                    docker pull ${DOCKERHUB_USER}/job-portal-canary-backend:latest &&
                    docker compose -f /home/ubuntu/docker-compose.yml up -d
                "
                """
            }
        }

        stage('Traffic Split 90/10 Canary') {
            steps {
                echo '🔀 Applying 90/10 traffic split (V1→V2)...'
                bat """
                plink -batch -i "${PPK_PATH}" -hostkey "${HOST_KEY}" ubuntu@${EC2_IP} "
                    sudo cp /home/ubuntu/nginx_90_10.conf /home/ubuntu/nginx_active.conf &&
                    docker restart nginx_lb
                "
                """
            }
        }

        stage('Promote Canary to 100%') {
            steps {
                echo '🔥 Promoting Canary (V2 → 100%)...'
                bat """
                plink -batch -i "${PPK_PATH}" -hostkey "${HOST_KEY}" ubuntu@${EC2_IP} "
                    sudo cp /home/ubuntu/nginx_100.conf /home/ubuntu/nginx_active.conf &&
                    docker restart nginx_lb
                "
                """
            }
        }

        stage('Cleanup Old Containers') {
            steps {
                echo '🧹 Removing old containers...'
                bat """
                plink -batch -i "${PPK_PATH}" -hostkey "${HOST_KEY}" ubuntu@${EC2_IP} "
                    docker stop web_v1 || true &&
                    docker rm web_v1 || true &&
                    docker image prune -af
                "
                """
            }
        }
    }

    post {
        success {
            echo '✅ Canary deployment successful! 🎉'
        }
        failure {
            echo '❌ Deployment failed — Check Jenkins logs for details.'
        }
    }
}
