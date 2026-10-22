pipeline {
  agent any
  tools { nodejs 'node20' }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install') { steps { sh 'npm ci || npm install' } }
    stage('Build React frontend') { steps { sh 'npm run build' } }
    stage('API syntax check') { steps { sh 'node --check server/index.js && node --check server/routes/api.js' } }
  }
}
