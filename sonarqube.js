const axios = require('axios').default;
const { exec: callbackExec } = require("child_process");
const { promisify } = require('util');
const exec = promisify(callbackExec);

// script input
const SONARQUBE_USERNAME = 'admin';
const SONARQUBE_PASS = '123456';

// generated input
const TOKEN = Buffer.from(`${SONARQUBE_USERNAME}:${SONARQUBE_PASS}`, 'utf8').toString('base64');
const SONARQUBE = axios.create({
    baseURL: 'http://localhost:9000/',
    timeout: 5000,
    headers: { 'Authorization': `Basic ${TOKEN}` }
});

// helpers
const consoleAxiosRequestError = (error) => {
    const { response } = error;
    const { request, ...errorObject } = response; // take everything but 'request'
    const { data, status } = errorObject;
    console.error(status, data);
};

/**
 * Creates a new project on SonarQube
 * @param {string} name visible name to project on sonarqube
 * @param {string} id identifier to project on sonarqube
 * @returns {string} the project's key on sonarqube
 */
const createProject = async (name, id) => {
    try {
        const url = `api/projects/create?name=${name}&project=${id}`;
        const { data } = await SONARQUBE.post(url);
        const { key } = data.project;
        return key.toString();
    } catch (err) { consoleAxiosRequestError(err); }
}

/**
 * Creates the sonar-project.properties file in the root of the project directory
 * @param {string} projectDir the project directory
 * @param {string} sonarqubeProjectId the project id from sonarqube
 */
const createPropertiesFile = async (projectDir, sonarqubeProjectId) => {
    const fileContent = `sonar.projectKey=${sonarqubeProjectId}`;
    const fileName = `sonar-project.properties`;
    const command = `
        cd projects/${projectDir};
        echo "${fileContent}" > ${fileName}
    `;
    await exec(command);
}

/**
 * Generated a auth token for the SonarScanner
 * @param {string} tokenName a name to the token
 * @returns {string} the generated auth token for sonarqube
 */
const generateNewAuthToken = async (tokenName) => {
    try {
        const url = `/api/user_tokens/generate?name=${tokenName}`;
        const { data } = await SONARQUBE.post(url);
        const { token } = data;
        return token;
    } catch (err) { consoleAxiosRequestError(err); }
}

/**
 * Analyze a project on SonarQube using SonarScanner through Docker
 * @param {string} projectDirectory repository directory name
 * @param {string} sonarqubeAuthToken auth token for sonarqube (generated through generateNewAuthToken method)
 * @param {string} sonarqubeIp sonarqube IP in docker bridge network
 */
const executeScanner = async (projectDirectory, sonarqubeAuthToken, sonarqubeIp) => {
    const scriptAbsolutePath = `/Users/andre.treib/Documents/projects/unisinos/get-metrics-2`;
    const projectsRelativePath = `/projects`;
    const repoFullPath = `${scriptAbsolutePath}${projectsRelativePath}/${projectDirectory}`;

    const cacheFullPath = `${scriptAbsolutePath}/.sonar/cache`;
    const comm = `mkdir -p ${cacheFullPath}`
    await exec(comm);

    const command = `
        cd ${repoFullPath};
        sonar-scanner -Dsonar.login=${sonarqubeAuthToken}
    `;

    /* const command = `
        docker run --rm \
            -e SONAR_HOST_URL="http://${sonarqubeIp}:9000" \
            -e SONAR_LOGIN="${sonarqubeAuthToken}" \
            -v "${repoFullPath}:/usr/src" \
            sonarsource/sonar-scanner-cli
    `; */

    const _response = await exec(command);
    /* console.log('*******');
    console.log(JSON.stringify(response));
    console.log('*******'); */
}

/**
 * Console.log all available metrics on SonarQube
 */
const showAllAvailableMetrics = async () => {
    try {
        const { data } = await SONARQUBE.get('/api/metrics/search');
        console.log(`****** Available metrics: `);
        console.log(JSON.stringify(data));
        console.log(`******************************`);
    } catch (err) { consoleAxiosRequestError(err); }
};

/**
 * Get the last analyzed metrics of a specific project from sonarqube
 * @param {string} sonarqubeProjectId the project id from sonarqube
 * @returns undefined if there is no data
 * @returns Array of { metric: string, value: string } with the project size and complexity metrics from the last analysis (ordered by metric name)
 */
const getMetrics = async (sonarqubeProjectId) => {
    try {
        const component = sonarqubeProjectId;
        const metricKeys = [
            `complexity`, // cc
            `lines`, // loc
            `statements`, // stmtc
            `comment_lines`, // cloc
        ];
        const url = `/api/measures/component?component=${component}&metricKeys=${metricKeys.join(',')}`;
        const { data } = await SONARQUBE.post(url);
        if (!data) return undefined;
        const { component: _component } = data;
        if (!_component) return undefined;
        const { measures } = _component;
        if (!measures || measures.length === 0) return undefined;
        return measures.sort((a, b) => a.metric > b.metric && 1 || -1);
    } catch (err) { consoleAxiosRequestError(err); }
}

const getMetricsHistory = async (sonarqubeProjectId) => {
    const component = sonarqubeProjectId;
    const metrics = [
        `complexity`, // cc
        `lines`, // loc
        `statements`, // stmtc
        `comment_lines`, // cloc
    ];

    try {
        const url = `/api/measures/search_history?component=${component}&metrics=${metrics.join(',')}`;
        const { data } = await SONARQUBE.post(url);
        return data;
    } catch (err) { consoleAxiosRequestError(err); }
}

module.exports = {
    createProject,
    createPropertiesFile,
    executeScanner,
    generateNewAuthToken,
    getMetrics,
    showAllAvailableMetrics,
    getMetricsHistory
}