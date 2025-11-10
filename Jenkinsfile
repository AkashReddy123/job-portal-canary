pipeline {
    agent any

    environment {
        REGISTRY = "balaakashreddyy"
        APP_NAME = "job-portal-canary"
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo "📥 Checking out project source from GitHub..."
                withCredentials([usernamePassword(credentialsId: 'github-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    git branch: 'main', url: "https://${GIT_USER}:${GIT_PASS}@github.com/AkashReddy123/job-portal-canary.git"
                }
            }
        }

        stage('Build Frontend V1 & V2') {
            steps {
                echo "🏗️ Building Frontend V1..."
                dir('frontend-v1') {
                    bat 'npm install'
                    bat 'npm run build'
                }

                echo "🏗️ Building Frontend V2..."
                dir('frontend-v2') {
                    bat 'npm install'
                    bat 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            steps {
                echo "⚙️ Installing backend dependencies..."
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo "🐳 Building Docker images for all services..."
                bat 'docker-compose build'
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo "🔐 Logging in to DockerHub..."
                withCredentials([usernamePassword(credentialsId: 'dockerhub-login', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    bat '''
                        echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin

                        docker tag web_v1 %REGISTRY%/%APP_NAME%-web_v1:latest
                        docker tag web_v2 %REGISTRY%/%APP_NAME%-web_v2:latest
                        docker tag backend %REGISTRY%/%APP_NAME%-backend:latest

                        docker push %REGISTRY%/%APP_NAME%-web_v1:latest
                        docker push %REGISTRY%/%APP_NAME%-web_v2:latest
                        docker push %REGISTRY%/%APP_NAME%-backend:latest

                        docker logout
                    '''
                }
            }
        }

        // 🚫 Temporarily disabling EC2 deploy stage
        // stage('Deploy to EC2') {
        //     steps {
        //         echo 'Skipping EC2 deployment — not configured yet 🚫'
        //     }
        // }
    }

    post {
        success {
            echo "✅ Build and Push successful! Images pushed to DockerHub: ${REGISTRY}/${APP_NAME}"
        }
        failure {
            echo "❌ Build failed! Check Jenkins logs for details."
        }
    }
}
