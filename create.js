const { createDir, cloneProject, goToBeforeCommit, goToCommit, checkIfRefactoringTypeIsEnabled } = require('./github');
const { createProject, createPropertiesFile, executeScanner, generateNewAuthToken, getMetrics } = require('./sonarqube');
const { appendLineToFile, readCsvFromSource, createMetricsFile } = require('./csv');
const { appendToLog, createLogDir } = require('./log');
const { v4: uuidv4 } = require('uuid');

// script input
const SONARQUBE_SERVER_IP = `172.17.0.2`;
const GITHUB_REPO_URL = `axios/axios`;
const SOURCE_FILE_NAME = `axios.test.csv`;

// dynamic global val
let LOG_PATH = undefined;

// overriding console.log to maintain analysis log
const originalConsoleLog = console.log;
console.log = (...params) => {
    if (LOG_PATH) {
        const logFile = `${LOG_PATH}/${new Date().getUTCDate()}.log`;
        appendToLog(logFile, ...params);
    }
    originalConsoleLog(...params);
}

/**
 * Appends a new line to the CSV with a commit retrieved metrics
 * @param {boolean} shouldAppendHeader if should append a line with the metrics header
 * @param {string} commitId the commit ID
 * @param {object} metrics the analyzed metrics from the getMetrics() method
 * @param {boolean} isAfterCommit if it's before or after the provided commit
 * @param {string} projectId the project's ID
 */
const appendMetrics = async (shouldAppendHeader, commitId, metrics, isAfterCommit, projectId) => {
    if (shouldAppendHeader) {
        const csvHeader = [`isAfterCommit`, `commitId`];
        metrics.map(x => csvHeader.push(x.metric));
        await appendLineToFile(csvHeader, projectId);
    }

    const csvLine = [isAfterCommit, commitId];
    metrics.map(x => csvLine.push(x.value));
    await appendLineToFile(csvLine, projectId);
}

/**
 * Console.log a summary of the commits about to be analyzed
 * @param {number} totalRefactorsFound total number of refactor operations extracted from this project
 * @param {number} totalValidRefactorsFound total number of valid refactor operations extracted from this project
 * @param {number} totalCommitsToBeAnalyzed total number of commits that are going to be analyzed
 */
const consoleCommitsSummary = (totalRefactorsFound, totalValidRefactorsFound, totalCommitsToBeAnalyzed) => {
    console.log(` `);
    console.log(`***`);
    console.log(`  COMMITS SUMMARY `);
    console.log(`  -- `)
    console.log(`  Total extracted refactoring operations: ${totalRefactorsFound}`);
    console.log(`  Total extracted valid refactoring operations: ${totalValidRefactorsFound}`);
    console.log(`  Total commits with operations: ${totalCommitsToBeAnalyzed}`);
    console.log(`***`);
    console.log(` `);
};

/**
 * Console.log a summary of the project about to be analyzed
 * @param {string} githubUrl relative url path to the project repository on github
 * @param {string} sourceFilename sourcefile csv with refatoring commits (with extension)
 */
 const consoleProjectSummary = (githubUrl, sourceFilename) => {
    console.log(` `);
    console.log(`***`);
    console.log(`  PROJECT SUMMARY `);
    console.log(`  -- `)
    console.log(`  Github URL: http://github.com/${githubUrl}.git`);
    console.log(`  Source file with commits: source/${sourceFilename}`);
    console.log(`***`);
    console.log(` `);
};

/**
 * Main pipeline
 * @param {string | undefined} providedGithubRepoUrl github relative url path of the analyzed project
 * @param {string | undefined} providedSourceFileName filename of the csv source file with the refactoring commits (with extension)
 */
const main = async (providedGithubRepoUrl, providedSourceFileName) => {
    const githubRepoUrl = providedGithubRepoUrl || GITHUB_REPO_URL;
    const commitsCsvSourceFileName = providedSourceFileName || SOURCE_FILE_NAME;
    const sonarqubeServerIp = SONARQUBE_SERVER_IP;
    const projectId = githubRepoUrl.toLowerCase().replace(/[^a-z]/g, ``);

    // creating logs directory
    LOG_PATH = await createLogDir(projectId);
    console.log(`Logs directory <${LOG_PATH}> created successfully!`, new Date());

    // starting system
    console.log('GET METRICS 2.0 STARTED', new Date());
    consoleProjectSummary(githubRepoUrl, commitsCsvSourceFileName);

    // creating the project directory
    console.log(`Creating <${projectId}> directory...`, new Date());
    await createDir(projectId);
    console.log(`  - Directory <${projectId}> created successfully!`, new Date());

    // cloning the project repository
    console.log(`Cloning project <${githubRepoUrl}> into <${projectId}>...`, new Date());
    await cloneProject(projectId, githubRepoUrl);
    console.log(`  - Project <${githubRepoUrl}> cloned succesfully!`, new Date());

    // create a new project on sonarqube
    const sonarqubeProjectId = projectId;
    console.log(`Creating project <${sonarqubeProjectId}> on SonarQube...`, new Date());
    await createProject(projectId, sonarqubeProjectId);
    console.log(`  - Project <${sonarqubeProjectId}> created succesfully!`, new Date());

    // generates a auth token from sonarqube to use on the sonarscanner
    const tokenName = uuidv4();
    console.log(`Creating new auth token named <${tokenName}> on SonarQube...`, new Date());
    const token = await generateNewAuthToken(tokenName);
    console.log(`  - Token <${tokenName}> created succesfully!`, new Date());

    // just add the header 1 time
    let shoudAddHeader = true;
    let withHeadersDesc = '';

    // counting the commits (index)
    let commitsIndex = 1;

    // create metrics CSV file
    console.log(`Creating empty metrics csv file named <${projectId}>...`, new Date());
    await createMetricsFile(projectId);
    console.log(`  - CSV metrics file <${projectId}> created successfully!`, new Date());

    // iterating commits with refactoring operations
    const commits = await readCsvFromSource(commitsCsvSourceFileName);
    const totalRefactorsFound = commits.length;
    const commitsWithValidRefactoringTypes = commits.filter(x => checkIfRefactoringTypeIsEnabled(x.TYPE));
    const totalValidRefactorsFound = commitsWithValidRefactoringTypes.length;
    const uniqueCommits = [...new Set(commitsWithValidRefactoringTypes.map(commit => commit.ID))];
    const totalCommitsToBeAnalyzed = uniqueCommits.length;
    consoleCommitsSummary(totalRefactorsFound, totalValidRefactorsFound, totalCommitsToBeAnalyzed);
    for (const commitId of uniqueCommits) {
        const progress = `${commitsIndex}/${totalCommitsToBeAnalyzed}`;
        console.log(`(${progress}) STEP: Analyzing before the commit...`, new Date());

        // forced reset the repository into a specific commit
        console.log(`  Going to the commit ${commitId}...`, new Date());
        await goToCommit(projectId, commitId);
        console.log(`    Success!`, new Date());
        
        // forced reset the repository into before a specific commit
        console.log(`  Going to before the commit ${commitId}...`, new Date());
        await goToBeforeCommit(projectId, commitId);
        console.log(`    Success!`, new Date());

        // create the sonarqube properties file inside the project directory
        console.log(`  Creating properties file for <${projectId}> with sonarqubeId <${sonarqubeProjectId}>...`, new Date());
        await createPropertiesFile(projectId, sonarqubeProjectId);
        console.log(`    Success!`, new Date());

        // execute the sonarscanner (analyze the project)
        try {
            console.log(`  Starting the scanner and sending to ${sonarqubeServerIp}...`, new Date());
            await executeScanner(projectId, token, sonarqubeServerIp);
            console.log(`    Success!`, new Date());
        } catch (err) { }

        // get the projects metrics from the last analysis
        console.log(`  Getting metrics from before the commit ${commitId}...`, new Date());
        const metricsBefore = await getMetrics(sonarqubeProjectId);
        if (!metricsBefore) break;
        console.log(`    Success!`, new Date());

        // forced reset the repository into a specific commit
        console.log(`  Going to the commit ${commitId}...`, new Date());
        await goToCommit(projectId, commitId);
        console.log(`    Success!`, new Date());

        // create the sonarqube properties file inside the project directory
        console.log(`  Creating properties file for <${projectId}> with sonarqubeId <${sonarqubeProjectId}>...`, new Date());
        await createPropertiesFile(projectId, sonarqubeProjectId);
        console.log(`    Success!`, new Date());

        // execute the sonarscanner (analyze the project)
        try {
            console.log(`  Starting the scanner and sending to ${sonarqubeServerIp}...`, new Date());
            await executeScanner(projectId, token, sonarqubeServerIp);
            console.log(`    Success!`, new Date());
        } catch (err) {}

        // get the projects metrics from the last analysis
        console.log(`  Getting metrics from after the commit ${commitId}...`, new Date());
        const metricsAfter = await getMetrics(sonarqubeProjectId);
        if (!metricsAfter) break;
        console.log(`    Success!`, new Date());
        
        // append line to CSV with the analylzed metrics from before the commit
        withHeadersDesc = shoudAddHeader ? `with headers ` : ``;
        console.log(`  Writing the metrics ${withHeadersDesc}from before the commit <${commitId}> on <${projectId}>...`, new Date());
        await appendMetrics(shoudAddHeader, commitId, metricsBefore, false, projectId);
        console.log(`    Success!`, new Date());

        // after the first append, cancel header inclusion
        shoudAddHeader = false;

        // append line to CSV with the analylzed metrics from after the commit
        withHeadersDesc = shoudAddHeader ? `with headers ` : ``;
        console.log(`  Writing the metrics ${withHeadersDesc}from after the commit <${commitId}> on <${projectId}>...`, new Date());
        await appendMetrics(shoudAddHeader, commitId, metricsAfter, true, projectId);
        console.log(`    Success!`, new Date());

        // increasing the index
        console.log(`(${progress}) STEP FINISHED SUCCESSFULLY! Going to next commit...`, new Date());
        commitsIndex++;
    }
}

// getting users args <`yarn start [githubUrl] [sourceFileName]`>
var args = process.argv.slice(2);
const providedGithubRepoUrl = args && args.length >= 2 ? args[0] : undefined;
const providedSourceFileName = args && args.length >= 2 ? args[1] : undefined;

main(providedGithubRepoUrl, providedSourceFileName).then(() => {
    console.log(`GET METRICS 2.0 EXECUTED SUCCESSFULLY!`, new Date());
}).catch((err) => {
    console.error(err);
});
