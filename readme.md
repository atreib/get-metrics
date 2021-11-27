# steps:

- install docker
- assign more memory to docker (https://stackoverflow.com/questions/44533319/how-to-assign-more-memory-to-docker-container)
- install sonarqube via docker
  - execute: `docker run -d --name sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:latest`
  - `http://localhost:9000/`
  - u: `admin`
  - p: `admin` (changed to `123456`)
- go to `index.js` and change the input vars
  - `SONARQUBE_SERVER_IP`: the IP from Docker bridge network
    - To find out the server ip, run: `docker inspect sonarqube | grep IPAddress`
- go to `sonarqube.js` and change the input vars
  - `SONARQUBE_USERNAME`: the sonarqube username
  - `SONARQUBE_PASS`: the sonarqube password
- add the CSV with the refactoring commits to the `source` directory
- execute the script, by running `yarn start {github url} {filename of the commits' csv}` to:
  - (1) clone the requested project
  - (2) create it on sonarqube
  - (3) create properties file on project's root for sonarqube
  - (3) generate an auth token to the project on sonarqube
  - (4) analyze the code and send the results to sonarqube
  - (5) retrieve the metrics and export to a CSV file
  - ex: `yarn start axios/axios axios.csv`
  
# references:

- https://docs.sonarqube.org/latest/extend/web-api/
- http://localhost:9000/web_api/