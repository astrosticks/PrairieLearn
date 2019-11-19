const ERR = require('async-stacktrace');
const _ = require('lodash');
const assert = require('chai').assert;
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const async = require('async');
const ncp = require('ncp');
const config = require('../lib/config');
const cheerio = require('cheerio');
const sqldb = require('@prairielearn/prairielib/sql-db');
const sqlLoader = require('@prairielearn/prairielib/sql-loader');
const sql = sqlLoader.loadSqlEquiv(__filename);
const helperServer = require('./helperServer');
const {
    exec,
} = require('child_process');
const requestp = require('request-promise-native');
const klaw = require('klaw');

const locals = {};
let page, elemList;

const baseDir = path.join(__dirname, 'testFileEditor');
const courseTemplateDir = path.join(baseDir, 'courseTemplate');
const courseOriginDir = path.join(baseDir, 'courseOrigin');
const courseLiveDir = path.join(baseDir, 'courseLive');
const courseDevDir = path.join(baseDir, 'courseDev');
const courseDir = courseLiveDir;

const siteUrl = 'http://localhost:' + config.serverPort;
const baseUrl = siteUrl + '/pl';
const courseInstanceUrl = baseUrl + '/course_instance/1/instructor';

const questionsUrl = `${courseInstanceUrl}/course_admin/questions`;
const assessmentsUrl = `${courseInstanceUrl}/instance_admin/assessments`;
const courseInstancesUrl = `${courseInstanceUrl}/course_admin/instances`;
const newCourseInstanceName = getNextNameShort();

const testEditData = [
    {
        url: questionsUrl,
        form: 'add-question-form',
        action: 'add_question',
        info: 'questions/question-1/info.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'questions/question-1/info.json',
            'questions/question-1/question.html',
            'questions/question-1/server.py',
        ]),
    },
    {
        button: 'changeQidButton',
        form: 'change-id-form',
        data: {
            id: 'newQuestion',
        },
        action: 'change_id',
        info: 'questions/newQuestion/info.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'questions/newQuestion/info.json',
            'questions/newQuestion/question.html',
            'questions/newQuestion/server.py',
        ]),
    },
    {
        form: 'delete-question-form',
        action: 'delete_question',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
    {
        url: `${courseInstanceUrl}/question/1`,
        form: 'copy-question-form',
        action: 'copy_question',
        info: 'questions/question-1/info.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'questions/question-1/info.json',
            'questions/question-1/question.html',
            'questions/question-1/server.py',
        ]),
    },
    {
        form: 'delete-question-form',
        action: 'delete_question',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
    {
        url: assessmentsUrl,
        form: 'add-assessment-form',
        action: 'add_assessment',
        info: 'courseInstances/Fa18/assessments/HW2/infoAssessment.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'courseInstances/Fa18/assessments/HW2/infoAssessment.json',
        ]),
    },
    {
        button: 'changeAidButton',
        form: 'change-id-form',
        data: {
            id: 'newAssessment',
        },
        action: 'change_id',
        info: 'courseInstances/Fa18/assessments/newAssessment/infoAssessment.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'courseInstances/Fa18/assessments/newAssessment/infoAssessment.json',
        ]),
    },
    {
        form: 'delete-assessment-form',
        action: 'delete_assessment',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
    {
        url: `${courseInstanceUrl}/assessment/1/overview`,
        form: 'copy-assessment-form',
        action: 'copy_assessment',
        info: 'courseInstances/Fa18/assessments/HW2/infoAssessment.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'courseInstances/Fa18/assessments/HW2/infoAssessment.json',
        ]),
    },
    {
        form: 'delete-assessment-form',
        action: 'delete_assessment',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
    {
        url: courseInstancesUrl,
        form: 'add-course-instance-form',
        action: 'add_course_instance',
        info: `courseInstances/${newCourseInstanceName}/infoCourseInstance.json`,
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            `courseInstances/${newCourseInstanceName}/infoCourseInstance.json`,
        ]),
    },
    {
        button: 'changeCiidButton',
        form: 'change-id-form',
        data: {
            id: 'newCourseInstance',
        },
        action: 'change_id',
        info: 'courseInstances/newCourseInstance/infoCourseInstance.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'courseInstances/newCourseInstance/infoCourseInstance.json',
        ]),
    },
    {
        form: 'delete-course-instance-form',
        action: 'delete_course_instance',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
    {
        url: `${courseInstanceUrl}/instance_admin/overview`,
        form: 'copy-course-instance-form',
        action: 'copy_course_instance',
        info: 'courseInstances/Sp19/infoCourseInstance.json',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
            'courseInstances/Sp19/infoCourseInstance.json',
            'courseInstances/Sp19/assessments/HW1/infoAssessment.json',
        ]),
    },
    {
        form: 'delete-course-instance-form',
        action: 'delete_course_instance',
        files: new Set([
            'README.md',
            'infoCourse.json',
            'courseInstances/Fa18/infoCourseInstance.json',
            'courseInstances/Fa18/assessments/HW1/infoAssessment.json',
            'questions/testQuestion/info.json',
            'questions/testQuestion/question.html',
            'questions/testQuestion/server.py',
        ]),
    },
];

describe('test course editor', function() {
    this.timeout(20000);

    describe('not the example course', function() {
        before('create test course files', function(callback) {
            createCourseFiles((err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        });

        before('set up testing server', helperServer.before(courseDir));

        after('shut down testing server', helperServer.after);

        after('delete test course files', function(callback) {
            deleteCourseFiles((err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        });

        describe('the locals object', function() {
            it('should be cleared', function() {
                for (var prop in locals) {
                    delete locals[prop];
                }
            });
        });

        describe('verify edits', function() {
            testEditData.forEach((element) => {
                testEdit(element);
            });
        });
    });

});

function getNextNameShort() {
    const today = new Date();
    const month = today.getMonth();
    let nextSeason;
    let nextYear = today.getFullYear() - 2000;
    if (month <= 4) {
        nextSeason = 'Su';
    } else if (month <= 7) {
        nextSeason = 'Fa';
    } else {
        nextSeason = 'Sp';
        nextYear += 1;
    }
    return `${nextSeason}${nextYear.toString().padStart(2, '0')}`;
}

function getFiles(options, callback) {
    let files = new Set([]);

    const ignoreHidden = item => {
        const basename = path.basename(item);
        return basename === '.' || basename[0] !== '.';
    };

    const walker = klaw(options.baseDir, {filter: ignoreHidden});

    options.ignoreDirs = options.ignoreDirs || [];

    walker.on('readable', () => {
        for (;;) {
            const item = walker.read();
            if (!item) {
                break;
            }
            if (!item.stats.isDirectory()) {
                const relPath = path.relative(options.baseDir, item.path);
                const prefix = relPath.split(path.sep)[0];
                if (! options.ignoreDirs.includes(prefix)) {
                    files.add(relPath);
                }
            }
        }
    });

    walker.on('error', (err) => {
        if (ERR(err, callback)) return;
    });

    walker.on('end', () => {
        callback(null, files);
    });
}

function testEdit(params) {
    describe(`GET to ${params.url}`, () => {
        if (params.url) {
            it('should load successfully', async () => {
                page = await requestp(params.url);
                locals.$ = cheerio.load(page); // eslint-disable-line require-atomic-updates
            });
        }
        it('should have a CSRF token', () => {
            if (params.button) {
                elemList = locals.$(`button[id="${params.button}"]`);
                assert.lengthOf(elemList, 1);
                const $ = cheerio.load(elemList[0].attribs['data-content']);
                elemList = $(`form[name="${params.form}"] input[name="__csrf_token"]`);
                assert.lengthOf(elemList, 1);
                assert.nestedProperty(elemList[0], 'attribs.value');
                locals.__csrf_token = elemList[0].attribs.value;
                assert.isString(locals.__csrf_token);
            } else {
                elemList = locals.$(`form[name="${params.form}"] input[name="__csrf_token"]`);
                assert.lengthOf(elemList, 1);
                assert.nestedProperty(elemList[0], 'attribs.value');
                locals.__csrf_token = elemList[0].attribs.value;
                assert.isString(locals.__csrf_token);
            }
        });
    });

    describe(`POST to ${params.url} with action ${params.action}`, function() {
        it('should load successfully', async () => {
            const options = {
                url: params.url || locals.url,
                followAllRedirects: true,
                resolveWithFullResponse: true,
            };
            options.form = {
                __action: params.action,
                __csrf_token: locals.__csrf_token,
            };
            if (params.data) {
                options.form = {...options.form, ...params.data};
            }
            page = await requestp.post(options);
            locals.url = page.request.href;     // eslint-disable-line require-atomic-updates
            locals.$ = cheerio.load(page.body); // eslint-disable-line require-atomic-updates
        });
    });

    waitForJobSequence(locals, 'Success');

    describe(`pull in dev and verify contents`, function() {
        it('should pull', function(callback) {
            const execOptions = {
                cwd: courseDevDir,
                env: process.env,
            };
            exec(`git pull`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        });
        it('should match contents', function(callback) {
            getFiles({baseDir: courseDevDir}, (err, files) => {
                if (ERR(err, callback)) return;
                if (_.isEqual(files, params.files)) callback(null);
                else callback(new Error(`files do not match`));
            });
        });
        if (params.info) {
            it('should have a uuid', function() {
                const infoJson = JSON.parse(fs.readFileSync(path.join(courseDevDir, params.info), 'utf-8'));
                assert.isString(infoJson.uuid);
            });
        }
    });
}

function createCourseFiles(callback) {
    async.series([
        (callback) => {
            const execOptions = {
                cwd: '.',
                env: process.env,
            };
            exec(`git init --bare ${courseOriginDir}`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            const execOptions = {
                cwd: '.',
                env: process.env,
            };
            exec(`git clone ${courseOriginDir} ${courseLiveDir}`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            ncp(courseTemplateDir, courseLiveDir, {clobber: false}, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            const execOptions = {
                cwd: courseLiveDir,
                env: process.env,
            };
            exec(`git add -A`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            const execOptions = {
                cwd: courseLiveDir,
                env: process.env,
            };
            exec(`git commit -m "initial commit"`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            const execOptions = {
                cwd: courseLiveDir,
                env: process.env,
            };
            exec(`git push`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            const execOptions = {
                cwd: '.',
                env: process.env,
            };
            exec(`git clone ${courseOriginDir} ${courseDevDir}`, execOptions, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
    ], (err) => {
        if (ERR(err, callback)) return;
        callback(null);
    });
}

function deleteCourseFiles(callback) {
    async.series([
        (callback) => {
            rimraf(courseOriginDir, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            rimraf(courseLiveDir, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
        (callback) => {
            rimraf(courseDevDir, (err) => {
                if (ERR(err, callback)) return;
                callback(null);
            });
        },
    ], (err) => {
        if (ERR(err, callback)) return;
        callback(null);
    });
}

function waitForJobSequence(locals, expectedResult) {
    describe('The job sequence', function() {
        it('should have an id', function(callback) {
            sqldb.queryOneRow(sql.select_last_job_sequence, [], (err, result) => {
                if (ERR(err, callback)) return;
                locals.job_sequence_id = result.rows[0].id;
                callback(null);
            });
        });
        it('should complete', function(callback) {
            var checkComplete = function() {
                var params = {job_sequence_id: locals.job_sequence_id};
                sqldb.queryOneRow(sql.select_job_sequence, params, (err, result) => {
                    if (ERR(err, callback)) return;
                    locals.job_sequence_status = result.rows[0].status;
                    if (locals.job_sequence_status == 'Running') {
                        setTimeout(checkComplete, 10);
                    } else {
                        callback(null);
                    }
                });
            };
            setTimeout(checkComplete, 10);
        });
        it(`should have result "${expectedResult}"`, function() {
            assert.equal(locals.job_sequence_status, expectedResult);
        });
    });
}
