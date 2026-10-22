#!/bin/sh
set -eu
npm run build
mkdir -p target/tomcat-war
cp -R client/dist/. target/tomcat-war/
(cd target/tomcat-war && zip -qr ../ecofleet-frontend.war .)
echo 'Created target/ecofleet-frontend.war. Deploy it to Tomcat; set VITE_API_BASE at build time to the Express API origin.'
