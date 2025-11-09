pipeline {
    agent any

    environment {
        // 🌍 Environment Variables
        DOCKERHUB_USER = 'balaakashreddyy'
        DOCKERHUB_PASS = credentials('dockerhub-login')  // Jenkins Credentials ID (DockerHub)
        EC2_IP = '18.212.119.91'
        PPK_PATH = 'C:\\Users\\Y BALA AKASH REDDY\\Downloads\\latest-key-2.ppk'
        GIT_URL = 'https://github.com/AkashReddy123/job-portal-canary.git'
        GIT_BRANCH = 'main'
    }

    stages {

        // 🧾 Stage 1: Checkout Code
        stage('Checkout Code') {
            steps {
                echo '📥 Checking out latest project code...'
                git branch: "${GIT_BRANCH}", url: "${GIT_URL}"
            }
        }

        // 🧱 Stage 2: Build Frontends
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

        // ⚙️ Stage 3: Build Backend
        stage('Build & Test Backend') {
            steps {
                echo '⚙️ Installing backend dependencies...'
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        // 🐳 Stage 4: Build Docker Images
        stage('Build Docker Images') {
            steps {
                echo '🐳 Building Docker images via Compose...'
                bat 'docker compose build'
            }
        }

        // 📦 Stage 5: Push to DockerHub
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

        // ⚙️ Stage 6: Prepare EC2 Environment
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

                    bat "plink -batch -i \"${PPK_PATH}\" ubuntu@${EC2_IP} \"${remoteCmd}\""
                }
            }
        }

        // 🚀 Stage 7: Deploy Application
        stage('Deploy on EC2') {
            steps {
                echo '🚀 Deploying latest images via Docker Compose...'
                script {
                    def remoteCmd = '''
                        docker pull balaakashreddyy/job-portal-canary-web_v1:latest &&
                        docker pull balaakashreddyy/job-portal-canary-web_v2:latest &&
                        docker pull balaakashreddyy/job-portal-canary-backend:latest &&
                        cd /home/ubuntu && docker compose up -d --build
                    '''.replaceAll("\\r?\\n", " ").trim()

                    bat "plink -batch -i \"${PPK_PATH}\" ubuntu@${EC2_IP} \"${remoteCmd}\""
                }
            }
        }

        // 🔀 Stage 8: 90/10 Canary Split
        stage('Traffic Split 90/10 Canary') {
            steps {
                echo '🔀 Applying 90/10 traffic split (V1→V2)...'
                script {
                    def remoteCmd = "sudo cp /home/ubuntu/nginx_90_10.conf /home/ubuntu/nginx_active.conf && docker restart nginx_lb"
                    bat "plink -batch -i \"${PPK_PATH}\" ubuntu@${EC2_IP} \"${remoteCmd}\""
                }
            }
        }

        // 🔥 Stage 9: Promote to 100%
        stage('Promote Canary to 100%') {
            steps {
                echo '🔥 Promoting Canary (V2 → 100%)...'
                script {
                    def remoteCmd = "sudo cp /home/ubuntu/nginx_100.conf /home/ubuntu/nginx_active.conf && docker restart nginx_lb"
                    bat "plink -batch -i \"${PPK_PATH}\" ubuntu@${EC2_IP} \"${remoteCmd}\""
                }
            }
        }

        // 🧹 Stage 10: Cleanup
        stage('Cleanup Old Containers') {
            steps {
                echo '🧹 Cleaning up old containers and images...'
                script {
                    def remoteCmd = "docker stop web_v1 || true && docker rm web_v1 || true && docker image prune -af"
                    bat "plink -batch -i \"${PPK_PATH}\" ubuntu@${EC2_IP} \"${remoteCmd}\""
                }
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
