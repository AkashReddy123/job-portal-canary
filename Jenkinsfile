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
                echo '📥 Checking out latest project code...'
                git branch: 'main', url: "${GIT_URL}"
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

        stage('Prepare EC2 Environment') {
            steps {
                echo '🔧 Preparing EC2 environment (folders, configs, env file)...'
                script {
                    def remoteCmd = '''
                        sudo apt remove -y docker docker-engine docker.io containerd runc || true &&
                        sudo apt update -y &&
                        sudo apt install -y ca-certificates curl gnupg lsb-release git &&
                        sudo mkdir -p /etc/apt/keyrings &&
                        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg &&
                        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
                        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
                        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null &&
                        sudo apt update -y &&
                        sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git &&
                        sudo systemctl enable docker &&
                        sudo systemctl start docker &&
                        if [ ! -d /home/ubuntu/job-portal-canary ]; then
                            git clone https://github.com/AkashReddy123/job-portal-canary.git /home/ubuntu/job-portal-canary;
                        else
                            cd /home/ubuntu/job-portal-canary && git pull;
                        fi &&
                        sudo cp -r /home/ubuntu/job-portal-canary/{frontend-v1,frontend-v2,backend,nginx} /home/ubuntu/ &&
                        sudo cp /home/ubuntu/job-portal-canary/docker-compose.yml /home/ubuntu/ &&
                        sudo cp /home/ubuntu/job-portal-canary/nginx_90_10.conf /home/ubuntu/ &&
                        sudo cp /home/ubuntu/job-portal-canary/nginx_100.conf /home/ubuntu/ &&
                        if [ ! -f /home/ubuntu/backend/.env ]; then
                            echo "PORT=5000" > /home/ubuntu/backend/.env &&
                            echo "MONGO_URI=mongodb://mongo:27017/jobportal" >> /home/ubuntu/backend/.env &&
                            echo "JWT_SECRET=supersecretkey" >> /home/ubuntu/backend/.env &&
                            echo "NODE_ENV=production" >> /home/ubuntu/backend/.env;
                        fi
                    '''.replaceAll("\\r?\\n", " ").trim()

                    bat """
                        echo off
                        REM 🧠 Pre-cache EC2 host key to avoid batch prompt
                        echo y | plink -ssh -i "${PPK_PATH}" ubuntu@${EC2_IP} exit >NUL 2>&1
                        plink -ssh -batch -no-antispoof -i "${PPK_PATH}" ubuntu@${EC2_IP} "${remoteCmd}"
                    """
                }
            }
        }

        stage('Deploy on EC2') {
            steps {
                echo '🚀 Deploying latest Docker images to EC2...'
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

        stage('Traffic Split 90/10 Canary') {
            steps {
                echo '🌈 Switching traffic to 90/10 split for canary testing...'
                script {
                    bat """
                        echo off
                        echo y | plink -ssh -i "${PPK_PATH}" ubuntu@${EC2_IP} exit >NUL 2>&1
                        plink -ssh -batch -no-antispoof -i "${PPK_PATH}" ubuntu@${EC2_IP} "sudo cp /home/ubuntu/nginx_90_10.conf /etc/nginx/nginx.conf && sudo systemctl reload nginx"
                    """
                }
            }
        }

        stage('Promote Canary to 100%') {
            steps {
                echo '🎯 Promoting Canary version to 100% traffic...'
                script {
                    bat """
                        echo off
                        echo y | plink -ssh -i "${PPK_PATH}" ubuntu@${EC2_IP} exit >NUL 2>&1
                        plink -ssh -batch -no-antispoof -i "${PPK_PATH}" ubuntu@${EC2_IP} "sudo cp /home/ubuntu/nginx_100.conf /etc/nginx/nginx.conf && sudo systemctl reload nginx"
                    """
                }
            }
        }

        stage('Cleanup Old Containers') {
            steps {
                echo '🧹 Cleaning up old containers and images...'
                script {
                    bat """
                        echo off
                        echo y | plink -ssh -i "${PPK_PATH}" ubuntu@${EC2_IP} exit >NUL 2>&1
                        plink -ssh -batch -no-antispoof -i "${PPK_PATH}" ubuntu@${EC2_IP} "docker system prune -af"
                    """
                }
            }
        }
    }

    post {
        success {
            echo '✅ Canary Deployment Completed Successfully!'
        }
        failure {
            echo '❌ Deployment failed — Check Jenkins logs for details.'
        }
    }
}
