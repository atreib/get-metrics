const csv = require('csv-parser')
const { writeFileSync, appendFileSync, createReadStream } = require('fs');
const { exec: callbackExec } = require("child_process");
const { promisify } = require('util');
const exec = promisify(callbackExec);

// in-memory csv content
const csvLines = [];

// global
const relativePath = `measures`;

/**
 * Apend a new line to csv (in-memory)
 * @param {Array<string>} line array with the line's columns 
 */
const appendLine = async (line) => {
    csvLines.push(line.join(`;`));
}

/**
 * Apend a new line to a csv file with the measures
 * @param {Array<string>} line array with the line's columns 
 * @param {string} fileName string with the output file name
 */
 const appendLineToFile = async (line, fileName) => {
    appendFileSync(`${relativePath}/${fileName}.csv`, line.join(`;`) + `\n`);
}

/**
 * Export in-memory CSV to CSV file
 * @param {string} fileName a name for the csv file 
 */
const exportCsv = async (fileName) => {
    const relativePath = `measures`;
    const commmand = `mkdir -p ${relativePath}`
    await exec(commmand);
    const filePath = `${relativePath}/${fileName}.csv`;
    writeFileSync(filePath, csvLines.join(`\n`), 'utf8');
    console.log(`Created csv file <${filePath}>`);
}

/**
 * Create CSV file
 * @param {string} fileName a name for the csv file 
 */
const createMetricsFile = async (fileName) => {
    const commmand = `mkdir -p ${relativePath}`
    await exec(commmand);
    const filePath = `${relativePath}/${fileName}.csv`;
    writeFileSync(filePath, '', 'utf8');
    console.log(`Created empty csv file <${filePath}>`);
};

/**
 * Empties in-memory CSV file
 */
const clear = async () => {
    csvLines = [];
}

/**
 * Read a CSV file with all refactoring commits and returns its content in a JS Object
 * @param {string} fileName the name of the csv with the refactoring commits
 * @returns array with all refactoring commits' id, refactor, source and destiny from the provided source file
 */
const readCsvFromSource = async (fileName) => {
    return new Promise((resolve, reject) => {
        try {
            const results = [];
            const filePath = `source/${fileName}`;
            createReadStream(filePath)
                .pipe(csv(['ID', 'TYPE', 'SOURCE', 'DESTINY']))
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results));
        } catch (err) { reject(err); }
    });
};

module.exports = {
    appendLine,
    exportCsv,
    clear,
    readCsvFromSource,
    createMetricsFile,
    appendLineToFile
}