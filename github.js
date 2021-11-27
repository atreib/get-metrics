const { exec: callbackExec } = require("child_process");
const { promisify } = require('util');
const exec = promisify(callbackExec);

const createDir = async (projectId) => {
    const command = `mkdir -p projects/${projectId}`;
    const response = await exec(command);
    //console.log(response);
};

const cloneProject = async (projectId, githubRepoUrl) => {
    let tryagain = true;
    while (tryagain) {
        try {
            const command = `
                rm -rf projects/${projectId}/{*,.*};
                cd projects/${projectId};
                git clone https://github.com/${githubRepoUrl}.git .;
            `;
            const response = await exec(command);
            //console.log(response);
            tryagain = false;
        } catch (_err) { tryagain = true; console.log(_err); }
    }
};

const goToCommit = async (projectId, commitId) => {
    let tryagain = true;
    while (tryagain) {
        try {
            const command = `
                cd projects/${projectId};
                git checkout ${commitId};
                git reset --hard;
            `;
            const response = await exec(command);
            //console.log(response);
            tryagain = false;
        } catch (_err) { tryagain = true; }
    }
};

const goToBeforeCommit = async (projectId, commitId) => {
    let tryagain = true;
    while (tryagain) {
        try {
            const command = `
                cd projects/${projectId};
                git checkout ${commitId};
                git reset --hard;
                git checkout "$(git log --skip 1 -n 1 --format=%H)";
                git reset --hard;
            `;
            const response = await exec(command);
            //console.log(response);
            tryagain = false;
        } catch (_err) { tryagain = true; }
    }
};

/**
 * Checks if this refactor should be analyzed
 * @param {string} type refactoring type from csv file with commits
 */
const checkIfRefactoringTypeIsEnabled = (type) => {
    const enabledTypes = ['MOVE', 'MOVE_RENAME', 'RENAME', 'EXTRACT', 'EXTRACT_MOVE', 'INLINE'];
    return enabledTypes.includes(type);
}

module.exports = {
    createDir,
    cloneProject,
    goToCommit,
    goToBeforeCommit,
    checkIfRefactoringTypeIsEnabled
}