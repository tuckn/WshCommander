/* globals Wsh: false */
/* globals __filename: false */
/* globals process: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var util = Wsh.Util;
var os = Wsh.OS;
var child_process = Wsh.ChildProcess;
var cli = Wsh.Commander;

var includes = util.includes;
var srr = os.surroundPath;
var CSCRIPT = os.exefiles.cscript;
var execSync = child_process.execSync;

var testCmd = srr(CSCRIPT) + ' ' + srr(__filename) + ' //job:test:Commander';

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('Commander', function () {
  var testName;
  var headArgs = [process.argv0, process.argv[1]];
  var processArgv;

  // Command

  test('Command_Action', function () {
    var schemaDef = {
      command: '',
      action: function () { return 'Test Default'; }
    };
    var schema1 = {
      command: 'test1',
      action: function () { return 'Test 1'; }
    };
    var schema2 = {
      command: 'test2',
      action: function () { return 'Test 2'; }
    };
    var schema3 = {
      command: 'test3',
      action: function () { return 'Test 3'; }
    };

    // No set the default command schema and no arg
    cli.clearPrograms();
    cli.addPrograms([schema1, schema2, schema3]);
    processArgv = headArgs.concat([]);
    expect(_cb(cli.parse, processArgv)).toThrowError(); // No matched command

    cli.clearPrograms();
    cli.addPrograms([schema1, schema2, schema3]);
    processArgv = headArgs.concat(['unMatchedCommand']);
    expect(_cb(cli.parse, processArgv)).toThrowError(); // No matched command

    cli.clearPrograms();
    cli.addPrograms([schemaDef, schema1, schema2, schema3]);
    processArgv = headArgs.concat([]);
    expect(cli.parse(processArgv)).toBe('Test Default');

    cli.clearPrograms();
    cli.addPrograms([schemaDef, schema1, schema2, schema3]);
    processArgv = headArgs.concat(['unMatchedCommand']);
    expect(cli.parse(processArgv)).toBe('Test Default');

    cli.clearPrograms();
    cli.addPrograms([schema1, schema2, schema3]);
    processArgv = headArgs.concat(['test1']);
    expect(cli.parse(processArgv)).toBe('Test 1');

    cli.clearPrograms();
    cli.addPrograms([schema1, schema2, schema3]);
    processArgv = headArgs.concat(['test2']);
    expect(cli.parse(processArgv)).toBe('Test 2');

    cli.clearPrograms();
    cli.addPrograms([schema1, schema2, schema3]);
    processArgv = headArgs.concat(['test3']);
    expect(cli.parse(processArgv)).toBe('Test 3');
  });

  test('Command_Arguments', function () {
    var schema = {
      command: 'play <consoleName> [gameTitle]',
      action: function (consoleName, gameTitle) {
        if (gameTitle) {
          return 'I play "' + gameTitle + '" with ' + consoleName + '.';
        }
        return 'I play with ' + consoleName + '.';
      }
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['play']);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['play', 'PC-Engine']);
    expect(cli.parse(processArgv)).toBe('I play with PC-Engine.');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['play', 'PC-Engine', 'Fighting Street']);
    expect(cli.parse(processArgv)).toBe('I play "Fighting Street" with PC-Engine.');
  });

  test('Command_AnyArguments', function () {
    var schema = {
      command: 'createZip <srcDir> <destDir> [excludes...]',
      action: function (srcDir, destDir, excludes) {
        if (excludes) {
          return 'srcDir: "' + srcDir + '", destDir: "' + destDir + '", '
            + 'excludes: ' + excludes.join(', ');
        }
        return 'srcDir: "' + srcDir + '", destDir: "' + destDir + '"';
      }
    };

    var srcDir = 'C:\\Users';
    var destDir = 'D:\\BackUp';
    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['createZip', srcDir, destDir]);
    expect(cli.parse(processArgv)).toBe('srcDir: "' + srcDir + '", destDir: "' + destDir + '"');

    var exclude1 = '.tmp';
    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['createZip', srcDir, destDir, exclude1]);
    expect(cli.parse(processArgv)).toBe('srcDir: "' + srcDir + '", destDir: "' + destDir + '", excludes: ' + exclude1);

    var exclude2 = 'cache';
    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['createZip', srcDir, destDir, exclude1, exclude2]);
    expect(cli.parse(processArgv)).toBe('srcDir: "' + srcDir + '", destDir: "' + destDir + '", excludes: ' + exclude1 + ', ' + exclude2);

    var exclude3 = '~';
    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['createZip', srcDir, destDir, exclude1, exclude2, exclude3]);
    expect(cli.parse(processArgv)).toBe('srcDir: "' + srcDir + '", destDir: "' + destDir + '", excludes: ' + exclude1 + ', ' + exclude2 + ', ' + exclude3);

    var exclude4 = 'foo bar baz';
    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['createZip', srcDir, destDir, exclude1, exclude2, exclude3, exclude4]);
    expect(cli.parse(processArgv)).toBe('srcDir: "' + srcDir + '", destDir: "' + destDir + '", excludes: ' + exclude1 + ', ' + exclude2 + ', ' + exclude3 + ', ' + exclude4);
  });

  test('Command Arguments and Options', function () {
    var schema = {
      command: 'unZip <zipPath> [destDir]',
      options: [
        ['-N, --no-makes-dir', 'None create a new directory'],
        ['-P, --pwd <password>', 'unzip password']
      ],
      action: function (zipPath, destDir, options) {
        if (options.pwd) {
          return 'Unzip "' + zipPath + '". The encrypting password is "' + options.pwd + '"';
        }
        if (!options.makesDir) {
          return 'Unzip "' + zipPath + '" without making new directory.';
        }
        if (destDir) {
          return 'Unzip "' + zipPath + '" to "' + destDir + '".';
        }
        return 'Unzip "' + zipPath + '".';
      }
    };

    var zipPath = 'D:\\mydata.zip';
    var destDir = 'D:\\tmp';

    cli.clearPrograms();
    cli.addPrograms([schema]);
    processArgv = headArgs.concat([]);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['unZip', zipPath]);
    expect(cli.parse(processArgv)).toBe('Unzip "' + zipPath + '".');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['unZip', zipPath, destDir]);
    expect(cli.parse(processArgv)).toBe('Unzip "' + zipPath + '" to "' + destDir + '".');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['unZip', zipPath, '-N']);
    expect(cli.parse(processArgv)).toBe('Unzip "' + zipPath + '" without making new directory.');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['unZip', zipPath, '-P', 'p@ssWD']);
    expect(cli.parse(processArgv)).toBe('Unzip "' + zipPath + '". The encrypting password is "p@ssWD"');
  });

  // Option

  test('Option switch', function () {
    var schema = {
      options: [
        ['-O, --switch-no', 'Normaly opened switch'], // default: false
        ['-C, --no-switch-nc', 'Normaly closed switch'] // default: true
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    cli.parse(processArgv);
    expect(cli.opt.switchNo).toBe(false);
    expect(cli.opt.switchNc).toBe(true);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-O', '-C']);
    cli.parse(processArgv);
    expect(cli.opt.switchNo).toBe(true);
    expect(cli.opt.switchNc).toBe(false);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--switch-no', '--no-switch-nc']);
    cli.parse(processArgv);
    expect(cli.opt.switchNo).toBe(true);
    expect(cli.opt.switchNc).toBe(false);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--switch-no']);
    cli.parse(processArgv);
    expect(cli.opt.switchNo).toBe(true);
    expect(cli.opt.switchNc).toBe(true);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--no-switch-nc']);
    cli.parse(processArgv);
    expect(cli.opt.switchNo).toBe(false);
    expect(cli.opt.switchNc).toBe(false);

    var errVals = [true, false, undefined, null, 0, 1, NaN, Infinity, '', [], {}];
    errVals.forEach(function (val) {
      expect(_cb(cli.parse, val)).toThrowError();
      expect(_cb(cli.addProgram, val)).toThrowError();
    });
  });

  test('Option flagValue', function () {
    var schema = {
      options: [
        ['-f, --flag [name]', 'Flag name'] // default: undefined
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe(undefined);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f']);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe(true);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--flag']);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe(true);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--flag', 'Flag Name']);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe('Flag Name');
  });

  test('Option value', function () {
    var schema = {
      options: [
        ['-v, --value <val>', 'Specify your value'] // default: undefined
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]); // OK. No error
    cli.parse(processArgv);
    expect(cli.opt.value).toBe(undefined);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-v']); // Error. Need to specify <val>
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-v', 'My Val']);
    cli.parse(processArgv);
    expect(cli.opt.value).toBe('My Val');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--value', 'My 2nd Val']);
    cli.parse(processArgv);
    expect(cli.opt.value).toBe('My 2nd Val');
  });

  test('Option default', function () {
    var schema = {
      options: [
        ['-f, --flag [name]', 'Flag name', 'Def Name'],
        ['-v, --value <val>', 'Specify your value', 'Def Val']
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe('Def Name');
    expect(cli.opt.value).toBe('Def Val');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', '-v']); // No Error
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe('Def Name');
    expect(cli.opt.value).toBe('Def Val');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', 'My Flag', '-v', 'My Val']);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe('My Flag');
    expect(cli.opt.value).toBe('My Val');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['--flag', 'My Flag2', '--value', 'My Val2']);
    cli.parse(processArgv);
    expect(cli.opt.flag).toBe('My Flag2');
    expect(cli.opt.value).toBe('My Val2');
  });

  test('Option array value', function () {
    var schema = {
      options: [
        ['-f, --flags [name...]', 'Flag name'],
        ['-d, --flags-def [name...]', 'Flag name', 'Name 0'],
        ['-v, --values <val...>', 'Specify your value', 'Val 0']
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    cli.parse(processArgv);
    expect(cli.opt.flags).toEqual([]);
    expect(cli.opt.flagsDef).toEqual(['Name 0']);
    expect(cli.opt.values).toEqual(['Val 0']);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', '-d', '-v']);
    cli.parse(processArgv);
    expect(cli.opt.flags).toEqual([]);
    expect(cli.opt.flagsDef).toEqual(['Name 0']);
    expect(cli.opt.values).toEqual(['Val 0']);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', 'Flag 0', '-d', 'Name 1', '-v', 'Val 1']);
    cli.parse(processArgv);
    expect(cli.opt.flags).toEqual(['Flag 0']);
    expect(cli.opt.flagsDef).toEqual(['Name 0', 'Name 1']);
    expect(cli.opt.values).toEqual(['Val 0', 'Val 1']);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([
      '-f', 'Flag 0', 'Flag 1',
      '-d', 'Name 1', 'Name 2',
      '-v', 'Val 1', 'Val 2']);
    cli.parse(processArgv);
    expect(cli.opt.flags).toEqual(['Flag 0', 'Flag 1']);
    expect(cli.opt.flagsDef).toEqual(['Name 0', 'Name 1', 'Name 2']);
    expect(cli.opt.values).toEqual(['Val 0', 'Val 1', 'Val 2']);
  });

  test('Option requiring)', function () {
    var schema = {
      requiredOptions: [
        ['-f, --req-flag [name]', 'Flag name'],
        ['-r, --requiring <name>', 'Must specify'],
        ['-R, --required <val>', 'Unspecified is allow', 'Def Val']
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f']);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', '-r']);
    expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', '-r', 'Req Name']);
    cli.parse(processArgv);
    expect(cli.opt.reqFlag).toBe(true);
    expect(cli.opt.requiring).toBe('Req Name');
    expect(cli.opt.required).toBe('Def Val');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-f', 'Flag Name', '-r', 'Req Name', '-R', 'Req Val']);
    cli.parse(processArgv);
    expect(cli.opt.reqFlag).toBe('Flag Name');
    expect(cli.opt.requiring).toBe('Req Name');
    expect(cli.opt.required).toBe('Req Val');
  });

  test('Option with processing', function () {
    var schema = {
      options: [
        ['-p, --pre-func <Number>', 'Function processing 1', parseInt],
        ['-i, --increment <Number>', 'Function processing 2',
          function (num, pre) { return pre + num; }, 1]
      ]
    };

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat([]);
    cli.parse(processArgv);
    expect(cli.opt.preFunc).toEqual(undefined);
    expect(cli.opt.increment).toEqual(1);

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-p', '-i']); // -p get "-i" as own value
    cli.parse(processArgv);
    expect(cli.opt.preFunc).toBeNaN();
    expect(cli.opt.increment).toEqual(1);
    // console.log(cli._getCommandObjects());
    // expect(_cb(cli.parse, processArgv)).toThrowError();

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-p', '007', '-i', '2']);
    cli.parse(processArgv);
    expect(cli.opt.preFunc).toEqual(7);
    expect(cli.opt.increment).toEqual('12');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-p', '3.14', '-i', '2', '3']);
    cli.parse(processArgv);
    expect(cli.opt.preFunc).toEqual(3);
    expect(cli.opt.increment).toEqual('12');

    cli.clearPrograms();
    cli.addProgram(schema);
    processArgv = headArgs.concat(['-p', 'My Val', '-i', '2', '-i', '3']);
    cli.parse(processArgv);
    expect(cli.opt.preFunc).toBeNaN();
    expect(cli.opt.increment).toEqual('123');
  });

  // Version

  test('Version', function () {
    var TASKNAME = 'Version';
    var GET_VER_MSG = '/GET_VER_MSG';
    var unRar = function () {};

    var schema = {
      command: 'unRar <filepath> [destDir]',
      version: '0.5.1',
      action: function (filepath, destDir) {
        return unRar(filepath, destDir);
      }
    };

    if (includes(process.argv, GET_VER_MSG)) {
      cli.addProgram(schema);
      processArgv = headArgs.concat(['unRar', '--version']);
      cli.parse(processArgv); // Show the version
      process.exit();
    }

    var mainCmd = os.exefiles.cscript;
    var args = ['//nologo', __filename, '-t', TASKNAME, GET_VER_MSG];
    var oExec = os.execSync(mainCmd, args);
    var stdOut = oExec.stdout;

    expect(stdOut.indexOf('0.5.1')).not.toBe(-1);
  });

  // Help

  testName = 'Help1 with Version';
  test(testName, function () {
    var ARG_HELP1_PROCESS = '/ARG_HELP1_PROCESS';

    var schema = {
      version: '1.0.1',
      options: [
        ['-O, --switch-no', 'Normaly opened switch'],
        ['-C, --no-switch-nc', 'Normaly closed switch']
      ]
    };

    if (includes(process.argv, ARG_HELP1_PROCESS)) {
      cli.addProgram(schema);
      processArgv = headArgs.concat(['--help']);
      cli.parse(processArgv); // Show the help and exit
      process.exit();
    }

    var cmd = testCmd + ' -t "' + testName + '" ' + ARG_HELP1_PROCESS;
    var retObj = execSync(cmd);
    var stdOut = retObj.stdout;

    expect(stdOut.indexOf(''
      + 'Usage: Package.wsf [options]\r\n'
      + '\r\n'
      + 'Options:\r\n'
      + '  -V, --version      Output the version number\r\n'
      + '  -O, --switch-no    Normaly opened switch (default: false)\r\n'
      + '  -C, --no-switch-nc Normaly closed switch (default: true)\r\n'
      + '  -h, --help         Output usage information'
    )).not.toBe(-1);
  });

  testName = 'Help2 with Description';
  test(testName, function () {
    var ARG_HELP2_PROCESS = '/ARG_HELP2_PROCESS';

    var schema = {
      description: 'An application for Testing WshCore/Commander.js',
      options: [
        ['-f, --req-flag [name...]', 'Flag name'],
        ['-r, --requiring <name>', 'Must specify'],
        ['-R, --required <val>', 'Unspecified is allowed', 'Def Val']
      ]
    };

    if (includes(process.argv, ARG_HELP2_PROCESS)) {
      cli.addProgram(schema);
      processArgv = headArgs.concat(['--help']);
      cli.parse(processArgv); // Show the help and exit
      process.exit();
    }

    var cmd = testCmd + ' -t "' + testName + '" ' + ARG_HELP2_PROCESS;
    var retObj = execSync(cmd);
    var stdOut = retObj.stdout;

    expect(stdOut.indexOf(''
      + 'Usage: Package.wsf [options]\r\n'
      + '\r\n'
      + 'An application for Testing WshCore/Commander.js\r\n'
      + '\r\n'
      + 'Options:\r\n'
      + '  -f, --req-flag [name...] Flag name\r\n'
      + '  -r, --requiring <name>   Must specify\r\n'
      + '  -R, --required <val>     Unspecified is allowed (default: "Def Val")\r\n'
      + '  -h, --help               Output usage information'
    )).not.toBe(-1);
  });

  testName = 'Help3 with Command';
  test(testName, function () {
    var ARG_HELP3_PROCESS = '/ARG_HELP3_PROCESS';

    var schema = {
      command: 'unZip <zipPath> <destDir> [excludes...]',
      options: [
        ['-N, --no-makes-dir', 'None create a new directory'],
        ['-P, --pwd <password>', 'unzip password']
      ]
    };

    if (includes(process.argv, ARG_HELP3_PROCESS)) {
      cli.addProgram(schema);
      processArgv = headArgs.concat(['unZip', '--help']);
      cli.parse(processArgv); // Show the help and exit
      process.exit();
    }

    var cmd = testCmd + ' -t "' + testName + '" ' + ARG_HELP3_PROCESS;
    var retObj = execSync(cmd);
    var stdOut = retObj.stdout;

    expect(stdOut.indexOf(''
      + 'Usage: unZip <zipPath> <destDir> [excludes...] [options]\r\n'
      + '\r\n'
      + 'Options:\r\n'
      + '  -N, --no-makes-dir   None create a new directory (default: true)\r\n'
      + '  -P, --pwd <password> unzip password\r\n'
      + '  -h, --help           Output usage information'
    )).not.toBe(-1);
  });

  testName = 'Help4 Custom Command';
  test(testName, function () {
    var ARG_HELP4_PROCESS = '/ARG_HELP4_PROCESS';

    var schema = {
      command: 'conv2imgsize <file>',
      options: [
        ['-h, --height <pixel>'],
        ['-w, --width <pixel>', '', 128]
      ],
      helpOption: ['-S, --show-usage', 'Show the usage']
    };

    if (includes(process.argv, ARG_HELP4_PROCESS)) {
      cli.addProgram(schema);
      processArgv = headArgs.concat(['conv2imgsize', '-S']);
      cli.parse(processArgv); // Show the help and exit
      process.exit();
    }

    var cmd = testCmd + ' -t "' + testName + '" ' + ARG_HELP4_PROCESS;
    var retObj = execSync(cmd);
    var stdOut = retObj.stdout;

    expect(stdOut.indexOf(''
      + 'Usage: conv2imgsize <file> [options]\r\n'
      + '\r\n'
      + 'Options:\r\n'
      + '  -h, --height <pixel>\r\n'
      + '  -w, --width <pixel>  (default: 128)\r\n'
      + '  -S, --show-usage     Show the usage'
    )).not.toBe(-1);
  });
});
