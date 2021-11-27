const { appendFileSync } = require('fs');
const { exec: callbackExec } = require("child_process");
const { promisify } = require('util');
const exec = promisify(callbackExec);

/**
 * Create a directory to store the project analysis logs
 * @param {string} projectAlias an alias for the project
 * @returns {string} the relative path where the logs are going to be stored
 */
 const createLogDir = async (projectAlias) => {
    const logPath = `logs/${projectAlias}`;
    const command = `mkdir -p ${logPath}`;
    await exec(command);
    return logPath;
}

/**
 * Append a new line to a log
 * @param {sintr} filePath the full path with the file name and extension
 * @param {...any} message all params of the message from console.log
 */
const appendToLog = (filePath, ...message) => {
    appendFileSync(`${filePath}`, `${message.map(x => x.toString()).join(' ')}\n`);
};

module.exports = { createLogDir, appendToLog };