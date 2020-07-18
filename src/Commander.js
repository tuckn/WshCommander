/* globals Wsh: false */
/* globals process: false */

(function () {
  if (Wsh && Wsh.Commander) return;

  /**
   * The Command-Prompt Interfaces for WSH (Windows Script Host). Similar to {@link https://github.com/tj/commander.js|Commander.js}.
   *
   * @namespace Commander
   * @memberof Wsh
   * @requires {@link https://github.com/tuckn/WshModeJs|tuckn/WshModeJs}
   */
  Wsh.Commander = {};

  // Shorthands
  var CD = Wsh.Constants;
  var util = Wsh.Util;
  var path = Wsh.Path;

  var insp = util.inspect;
  var isArray = util.isArray;
  var isFunction = util.isFunction;
  var isString = util.isString;
  var isPlainObject = util.isPlainObject;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var hasContent = util.hasContent;
  // var isSameStr = util.isSameMeaning;
  var obtain = util.obtainPropVal;
  var includes = util.includes;
  var startsWith = util.startsWith;
  var endsWith = util.endsWith;

  var cmd = Wsh.Commander;

  /** @constant {string} */
  var MODULE_TITLE = 'WshCore/Commander.js';

  var throwErrNonArray = function (functionName, typeErrVal) {
    util.throwTypeError('array', MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonObject = function (functionName, typeErrVal) {
    util.throwTypeError('object', MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  /** @constant {number} */
  var I_FLAG = 0;
  /** @constant {number} */
  var I_DESCRIPTION = 1;
  /** @constant {number} */
  var I_FUNC_OR_DEFVAL = 2;
  /** @constant {number} */
  var I_DEFVAL = 3;
  /** @constant {string} */
  var TYPE_SWITCH_NC = 'SWITCH_NC'; // true|false
  /** @constant {string} */
  var TYPE_SWITCH_NO = 'SWITCH_NO'; // false|true
  /** @constant {string} */
  var TYPE_VAL = 'VALUE'; // undefined|true|String

  var flagChar = '[0-9_.,!?+*$a-zA-Z]'; // @TODO Review
  var reFlagStr = new RegExp('(-' + flagChar + ')?[,\\s]\\s?(--\\S+)\\s*(\\S*)', 'i');

  var reShortFlag = new RegExp('^-(' + flagChar + ')$', 'i');
  function isShortFlag (flag) { // Ex. "-s"
    return reShortFlag.test(flag);
  }

  var reJoinedShortFlags = new RegExp('^-(' + flagChar + '{2,})$', 'i');
  function isJoinedShortFlags (flag) { // Ex. "-Cfs"
    return reJoinedShortFlags.test(flag);
  }

  var reLongFlag = new RegExp('^--(' + flagChar + '+(-' + flagChar + '+)*)$', 'i'); // @TODO Review
  function isLongFlag (flag) { // Ex. "--file", "--save-file"
    return reLongFlag.test(flag);
  }

  // _createCmdObj {{{

  /**
   * @typedef {object} typeCommandObj
   * @property {string} name
   * @property {boolean} isRequired
   * @property {boolean} isArray - The following val type
   * @property {(string|string[])} val - If isArray is true, Array. not String
   * @property {string} schema - The source schema
   */

  /**
   * @typedef {object} typeCommandObject
   * @property {string} name
   * @property {string} description
   * @property {object} version
   * @property {object} help
   * @property {Array} options
   * @property {typeCommandObj[]} args
   */

  /**
   * @private
   * @param {string} cmdSchema - Ex. "play" Ex. "play <consoleName> [gameTitle]"
   * @returns {typeCommandObject}
   */
  function _createCmdObj (cmdSchema) {
    var functionName = '_createCmdObj';
    if (!isString(cmdSchema)) throwErrNonStr(functionName, cmdSchema);

    var cmdObj = {
      name: '',
      description: '',
      args: [],
      version: {},
      help: {},
      options: []
    };

    if (!isSolidString(cmdSchema)) return cmdObj;

    var matches = cmdSchema.match(/(\S+)\s*(.*)/i);

    // 1. Main Command
    var userCmdSchema = matches[1];
    if (!isSolidString(userCmdSchema)) {
      throw new Error('\nError: [Invalid CommandSchema(main)]: ' + cmdSchema + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    cmdObj.name = userCmdSchema;

    // 2. Subcommands (= Arguments)
    var argsSchema = matches[2];
    if (!isSolidString(argsSchema)) return cmdObj;

    var argSchemas = argsSchema.split(/\s+/);
    argSchemas.forEach(function (argSchema) {
      var argMatches = argSchema.match(/^([<[])(\S+)([>\]])$/i);
      if (!isSolidArray(argMatches)) {
        throw new Error('\nError: [Invalid CommandSchema(arg)]: ' + cmdSchema + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      var argOpen = argMatches[1];
      var argName = argMatches[2];
      var argClose = argMatches[3];

      if (!isSolidString(argOpen) || !isSolidString(argName) || !isSolidString(argClose)) {
        throw new Error('\nError: [Invalid CommandSchema(argVal)]: ' + cmdSchema + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      var argObj = {
        name: argName,
        isSpecified: false,
        isRequired: false,
        schema: argSchema,
        val: undefined
      };

      if (argOpen === '<' && argClose === '>') {
        argObj.isRequired = true;
      } else if (argOpen === '[' && argClose === ']') {
        argObj.isRequired = false;
      } else {
        throw new Error('\nError: [Invalid CommandSchema](argType): ' + cmdSchema + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      if (endsWith(argName, '...')) {
        argObj.isArray = true;
        argObj.val = [];
      }

      cmdObj.args.push(argObj);
    });

    return cmdObj;
  } // }}}

  // _camelcase {{{
  /**
   * Camel-case the given `flag`
   *
   * @private
   * @param {string} flag
   * @returns {string}
   */
  function _camelcase (flag) {
    if (!isSolidString(flag)) return '';
    return flag.split('-').reduce(function (str, word) {
      return str + word.charAt(0).toUpperCase() + word.slice(1);
    });
  } // }}}

  // _getLongFlagVarName {{{
  /**
   * Returns option name.
   *
   * @private
   * @param {string} longFlag
   * @returns {string}
   */
  function _getLongFlagVarName (longFlag) {
    if (!isSolidString(longFlag)) return '';
    return _camelcase(longFlag.replace(/^--/, '').replace(/^no-/i, ''));
  } // }}}

  // _showCmdVersionAndExit {{{
  /**
   * @private
   * @param {object} cmdObj
   * @param {string} arg
   * @returns {void}
   */
  function _showCmdVersionAndExit (cmdObj, arg) {
    if (!hasContent(cmdObj.version)) return;

    var sFlag = cmdObj.version.shortFlag; // Shorthand
    var lFlag = cmdObj.version.longFlag;

    var shows;

    // A short flag (e.g. "-V")
    if (isShortFlag(arg)) {
      shows = (arg === sFlag);
    // Joined short flags (e.g. "-sVc")
    } else if (isJoinedShortFlags(arg)) {
      shows = includes(arg, sFlag.substring(1));
    // A long flags (e.g. "--version")
    } else if (isLongFlag(arg)) {
      shows = (arg === lFlag);
    }

    if (shows) {
      console.log(cmdObj.version.val);
      process.exit(CD.runs.ok);
    }
  } // }}}

  // _creatVersionOptionObj {{{

  /**
   * @typedef {array} typeVersionSchema
   * @example
   * ['0.0.1', '-v, --vers', 'Output the current version']
   * @property {string} version
   * @property {string} flagSchema
   * @property {string} [description]
   */

  /**
   * @typedef {object} typeVersionObject
   * @example
   * { name: 'vers',
   *   shortFlag: '-v',
   *   longFlag: '--ver',
   *   description: 'Output the current version',
   *   val: '1.0.0',
   *   schema: ['0.0.1', '-v, --vers', 'Output the current version'] }
   * @property {string} name
   * @property {string} shortFlag
   * @property {string} longFlag
   * @property {string} description
   * @property {(string|typeVersionSchema)} schema
   */

  /**
   * @private
   * @example
   * // Ex. 1
   * _creatVersionOptionObj('0.0.1');
   *
   * // Ex. 2
   * _creatVersionOptionObj([
   *   '0.0.1', '-v, --vers', 'Output the current version']);
   * @param {(string|typeVersionSchema)} [versionSchema={}]
   * @returns {typeVersionObject}
   */
  function _creatVersionOptionObj (versionSchema) {
    var functionName = '_creatVersionOptionObj';

    if (!hasContent(versionSchema)) return {};

    var verOptObj = {
      name: 'version',
      shortFlag: '-V',
      longFlag: '--version',
      description: 'Output the version number',
      schema: versionSchema
    };

    if (isString(versionSchema)) {
      verOptObj.val = versionSchema;
      return verOptObj;
    }

    if (!isArray(versionSchema)) throwErrNonArray(functionName, versionSchema);

    verOptObj.val = versionSchema[0];

    var flagMatches = versionSchema[1].match(reFlagStr);
    if (!hasContent(flagMatches)) {
      throw new Error('\nError: [Invalid VersionSchema]: ' + insp(versionSchema) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    verOptObj.shortFlag = flagMatches[1];
    verOptObj.longFlag = flagMatches[2];

    if (!hasContent(versionSchema[3])) return verOptObj;
    verOptObj.description = versionSchema[3];

    return verOptObj;
  } // }}}

  // _createOptionObjs {{{

  /**
   * @typedef {array} typeOptionSchema
   * @example
   * // Ex.1
   * ['-O, --switch-no', 'Normally opened switch']
   *
   * // Ex. 2
   * ['-I, --increment <Number>', 'Example of processing', function (num, pre) {
   *   return pre + num;
   * }, 3]
   * @property {string} flagSchema - Ex. '-O, --switch-no'
   * @property {string} [description]
   * @property {Function} [process]
   * @property {any} [default] - The default/starting value
   */

  /**
   * @typedef {object} typeOptionObject
   * @example
   * { name: "gameTitle",
   *   shortFlag: "-G",
   *   longFlag: "--game-title",
   *   valType: "VALUE",
   *   description: "A game name",
   *   isRequired: false,
   *   isPairWithVal: false,
   *   isSpecified: false,
   *   isArray: false,
   *   val: undefined,
   *   initFunc: undefined,
   *   schema: ['-G, --game-title [title]', 'A game name']
   *   valSchema: '[title]' }
   * @property {string} name - A option name
   * @property {string} shortFlag - A Short Flag. Ex. "-G"
   * @property {string} longFlag - A Long Flag. Ex. "--game-title"
   * @property {string} valType - "VALUE",
   * @property {string} description
   * @property {boolean} isRequired
   * @property {boolean} isPairWithVal
   * @property {boolean} isSpecified
   * @property {boolean} isArray
   * @property {string|undefined} val
   * @property {function|undefined} initFunc
   * @property {typeOptionSchema} schema - The source schema. Ex. ['-G, --game-title [title]', 'A game name']
   * @property {string} valSchema: '[title]'
   */

  /**
   * Creates a option object from the option schema. Similar to {@link https://www.npmjs.com/package/commander#options|Commander.js Options}
   *
   * @example
   * _createOptionObjs([
   *   ["-O, --switch-no", "Normally opened switch"],
   *   ["-C, --no-switch-nc", "Normally closed switch"],
   *   ['-o, --opt-word [Bar]', '[Bar] is arbitrary'],
   *   ['-a, --array-vals <val...>', 'Store as Array']
   * ]);
   * @private
   * @param {typeOptionSchema[]} optsSchemas
   * @param {boolean} [isRequired=false]
   * @returns {typeOptionObject[]} - See {@link typeOptionObject}
   */
  function _createOptionObjs (optsSchemas, isRequired) {
    var functionName = '_createOptionObjs';
    if (!isArray(optsSchemas)) throwErrNonArray(functionName, optsSchemas);

    var options = [];
    if (!isSolidArray(optsSchemas)) return options;

    optsSchemas.forEach(function (schema) {
      var flagMatches = schema[I_FLAG].match(reFlagStr);
      if (!isSolidArray(flagMatches)) {
        throw new Error('\nError: [Invalid OptionsSchema(flag)]: ' + insp(schema) + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      var shortFlag = flagMatches[1]; // Ex. "-f"
      var longFlag = flagMatches[2]; // Ex. "--file"

      var optObj = {
        name: _getLongFlagVarName(longFlag),
        shortFlag: shortFlag,
        longFlag: longFlag,
        description: schema[I_DESCRIPTION] || '',
        isRequired: Boolean(isRequired),
        isSpecified: false,
        isPairWithVal: false,
        schema: schema,
        val: undefined
      };

      var valSchema = flagMatches[3].trim();
      if ((/^--no-/i).test(longFlag)) {
        optObj.valType = TYPE_SWITCH_NC;
        optObj.val = true;
      } else if (!hasContent(valSchema)) {
        optObj.valType = TYPE_SWITCH_NO;
        optObj.val = false;
      } else if ((/^<.+>$/i).test(valSchema)) { // Ex. "<Hoo>"
        optObj.isPairWithVal = true;
        optObj.valSchema = valSchema;
        optObj.valType = TYPE_VAL;

        if (endsWith(valSchema, '...>')) { // Ex. "<Bar...>"
          optObj.isArray = true;
          optObj.val = [];
        } else {
          optObj.isArray = false;
          optObj.val = undefined;
        }
      } else if ((/^\[.+\]$/i).test(valSchema)) { // Ex. "[Hoge]"
        optObj.valSchema = valSchema;
        optObj.valType = TYPE_VAL;

        if (endsWith(valSchema, '...]')) { // Ex. "[Piyo...]"
          optObj.isArray = true;
          optObj.val = [];
        } else {
          optObj.isArray = false;
          optObj.val = undefined;
        }
      } else {
        throw new Error('\nError: [Invalid OptionsSchema(val)]: ' + insp(schema) + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      /**
       * Set pre-function and default-value
       * @note If default-value is specified, isPairWithVal to false.
       */
      if (schema.length > I_FUNC_OR_DEFVAL) {
        if (isFunction(schema[I_FUNC_OR_DEFVAL])) {
          optObj.initFunc = schema[I_FUNC_OR_DEFVAL];

          if (schema.length > I_DEFVAL) {
            if (optObj.isArray) optObj.val = [schema[I_DEFVAL]];
            else optObj.val = schema[I_DEFVAL];
            optObj.isPairWithVal = false;
          }
        } else {
          if (optObj.isArray) optObj.val = [schema[I_FUNC_OR_DEFVAL]];
          else optObj.val = schema[I_FUNC_OR_DEFVAL];
          optObj.isPairWithVal = false;
        }
      }


      options.push(optObj);
    });

    return options;
  } // }}}

  // _createCmdHelpMsg {{{
  /**
   * @private
   * @param {object} cmdObj
   * @returns {string}
   */
  function _createCmdHelpMsg (cmdObj) {
    // var functionName = '_createCmdHelpMsg';

    var helpMsg = 'Usage: ';

    if (cmdObj.name === '') {
      helpMsg += path.basename(process.argv[1]);
    } else {
      helpMsg += cmdObj.name;

      helpMsg += cmdObj.args.reduce(function (acc, arg) {
        return acc + ' ' + arg.schema;
      }, '');
    }

    // Create a temporary array for the help message
    var optObjs = cmdObj.options.concat([{
      // Add the help object
      shortFlag: cmdObj.help.shortFlag,
      longFlag: cmdObj.help.longFlag,
      description: cmdObj.help.description,
      valSchema: undefined,
      val: undefined
    }]);

    if (hasContent(cmdObj.version)) { // Add the version object
      optObjs.unshift({
        shortFlag: cmdObj.version.shortFlag,
        longFlag: cmdObj.version.longFlag,
        description: cmdObj.version.description,
        valSchema: undefined,
        val: undefined
      });
    }

    helpMsg += ' [options]\n\n';

    if (hasContent(cmdObj.description)) helpMsg += cmdObj.description + '\n\n';

    if (optObjs.length > 0) {
      helpMsg += 'Options:\n';

      // Get the max length of the flag character to indent
      var maxWidth = 0;
      optObjs.forEach(function (opt) {
        var width = String(opt.longFlag).length;
        /*
         * @note "--long-flag" or "--long-flag <val>"
         * attention the space between Flag and Val
         */
        width += opt.valSchema ? (String(opt.valSchema).length + 1) : 0;
        if (width > maxWidth) maxWidth = width;
      });

      helpMsg += optObjs.reduce(function (acc, opt) {
        if (!hasContent(opt.shortFlag)) {
          acc += '    ,';
        } else {
          acc += '  ' + opt.shortFlag + ',';
        }

        acc += ' ' + opt.longFlag;
        acc += opt.valSchema ? (' ' + opt.valSchema) : '';

        // indent
        var baseLen = opt.longFlag.length
          + (opt.valSchema ? (String(opt.valSchema).length + 1) : 0);

        for (var i = baseLen; i < maxWidth; i++) acc += ' ';

        if (hasContent(opt.description)) acc += ' ' + opt.description;
        if (hasContent(opt.val)) acc += ' (default: ' + insp(opt.val) + ')';
        acc += '\n';

        return acc;
      }, '');
    }

    return helpMsg;
  } // }}}

  // _createHelpOptionObj {{{

  /**
   * @typedef {array} typeHelpSchema
   * @example
   * ['-S, --show-help', 'Show the help']
   * @property {string} version
   * @property {string} flagSchema
   * @property {string} [description]
   */

  /**
   * @typedef {object} typeHelpObject
   * @example
   * { name: 'showHelp',
   *   shortFlag: '-S',
   *   longFlag: '--show-help',
   *   description: 'Show the help',
   *   val: '', // Auto create with _createCmdHelpMsg(cmdObj)
   *   schema: ['-S, --show-help', 'Show the help'] }
   * @property {string} name - The option name.
   * @property {string} shortFlag - The short flag.
   * @property {string} longFlag - The long flag.
   * @property {string} description
   * @property {string} val - A help message when shows in CLI.
   * @property {(string|typeHelpSchema)} schema - The source schema.
   */

  /**
   * @private
   * @param {typeHelpSchema} helpOptSchema
   * @returns {typeHelpObject}
   */
  function _createHelpOptionObj (helpOptSchema) {
    var functionName = '_createHelpOptionObj';
    if (!isArray(helpOptSchema)) throwErrNonArray(functionName, helpOptSchema);

    var helpOptObj = {
      name: 'help',
      shortFlag: '-h',
      longFlag: '--help',
      description: 'Output usage information',
      val: undefined,
      schema: helpOptSchema
    };

    if (!isSolidArray(helpOptSchema)) return helpOptObj;
    if (!isSolidString(helpOptSchema[I_FLAG])) {
      throwErrNonStr(functionName, helpOptSchema);
    }

    var flagMatches = helpOptSchema[I_FLAG].match(reFlagStr);
    if (!hasContent(flagMatches)) {
      throw new Error('\nError: [Invalid HelpOptionSchema(flag)]: ' + insp(helpOptSchema) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    helpOptObj.shortFlag = flagMatches[1];
    helpOptObj.longFlag = flagMatches[2];

    if (!isSolidString(helpOptSchema[I_DESCRIPTION])) return helpOptObj;
    helpOptObj.description = helpOptSchema[I_DESCRIPTION];

    return helpOptObj;
  } // }}}

  // _showCmdHelpAndExit {{{
  /**
   * @private
   * @param {object} cmdObj
   * @param {string} arg
   * @returns {void}
   */
  function _showCmdHelpAndExit (cmdObj, arg) {
    var sFlag = cmdObj.help.shortFlag; // Shorthand
    var lFlag = cmdObj.help.longFlag;

    var shows;

    // A short flag (e.g. "-h")
    if (isShortFlag(arg)) {
      shows = (arg === sFlag);
    // Joined short flags (e.g. "-shc")
    } else if (isJoinedShortFlags(arg)) {
      shows = includes(arg, sFlag.substring(1));
    // A long flags (e.g. "--help")
    } else if (isLongFlag(arg)) {
      shows = (arg === lFlag);
    }

    if (shows) {
      console.log(cmdObj.help.val);
      process.exit(CD.runs.ok);
    }
  } // }}}

  // The inner object {{{
  /**
   * @typedef {object} typeProgramObj
   * @example
   * { name: 'playgame',
   *   args: [
   *     {
   *       name: 'consoleName',
   *       isRequired: false,
   *       isArray: false,
   *       isSpecified: false,
   *       val: undefined,
   *       schema: '[consoleName]'
   *     },
   *     {}...
   *   ],
   *   description: 'Playing Game Command for CLI',
   *   version: {
   *     name: 'vers',
   *     shortFlag: '-v',
   *     longFlag: '--ver',
   *     description: 'Output the current version',
   *     val: '1.0.0',
   *     schema: ['0.0.1', '-v, --vers', 'Output the current version']
   *   },
   *   help: {
   *     name: 'showHelp',
   *     shortFlag: '-S',
   *     longFlag: '--show-help',
   *     description: 'Show the help',
   *     val: 'Usage: ... [options]\n\n ...',
   *     schema: ['-S, --show-help', 'Show help']
   *   },
   *   options: [
   *     name: 'gameTitle',
   *     shortFlag: '-G',
   *     longFlag: '--game-title',
   *     valType: 'VALUE',
   *     description: 'A game name',
   *     isRequired: false,
   *     isPairWithVal: false,
   *     isSpecified: false,
   *     isArray: false,
   *     val: undefined,
   *     initFunc: undefined,
   *     schema: ['-G, --game-title [title]', 'A game name']
   *     valSchema: '[title]'
   *   ],
   *   action: function (console, ..., options) { ... } }
   * @property {string} name - The program name.
   * @property {typeCommandObj[]} args - The program arguments.
   * @property {string} description - The program description.
   * @property {typeVersionObject} version - The object of program version.
   * @property {typeHelpObject} help - The object of program help.
   * @property {typeOptionObject[]} options - The program options.
   * @property {Function} action - The function to execute.
   */

  /**
   * The inner objects defined with Wsh.Commander.addProgram.
   *
   * @name __commands
   * @type {typeProgramObj[]}
   */
  var __commands = []; // }}}

  // cmd._getCommandObjects {{{
  /**
   * Gets the inner objects defined with Wsh.Commander.addProgram.
   *
   * @example
   * var cmd = Wsh.Commander;
   *
   * cmd.addProgram({
   *  // The program schema
   * });
   *
   * if (debug) console.dir(cmd._getCommandObjects());
   *
   * cmd.parse(process.argv);
   * @function _getCommandObjects
   * @memberof Wsh.Commander
   * @returns {typeProgramObj[]} - The inner objects defined with .addProgram().
   */
  cmd._getCommandObjects = function () {
    return __commands;
  }; // }}}

  // cmd.addProgram {{{
  /**
   * @typedef {object} typeCommanderSchema
   * @example
   * {
   *   command: 'connect <resourceName>',
   *   description: 'The command to connect my PC to a resource',
   *   version: '0.5.1',
   *   requiredOptions: [
   *     ['-p, --password', 'The password to connect']
   *   ],
   *   options: [
   *     ['-d, --domain-name <name>', 'A domain name of the resource'],
   *     ['-n, --user-name [name]', 'A user name to log in', 'Tuckn']
   *   ],
   *   action: function (resourceName, options) {
   *     if (options.domainName) {
   *       connRsrc(processName, options.password,
   *           options.domainName + '\\' + options.userName);
   *     } else {
   *       connRsrc(processName, options.password, options.userName);
   *     }
   *   }
   * }
   * @property {string} [command=''] - The command and arguments. e.g1: 'play' e.g2: 'play \<consoleName\> [gameTitle]'
   * @property {string} [description] - The command description.
   * @property {string|typeVersionSchema} [version] - The schema of command version.
   * @property {typeOptionSchema[]} [options] - An Array of command option schemas.
   * @property {typeOptionSchema[]} [requiredOptions] - An Array of required option schemas.
   * @property {Function} [action] - The function to execute.
   * @property {typeHelpSchema} [helpOption] - The schema of command help.
   */

  /**
   * Defines the program. Similar to {@link https://www.npmjs.com/package/commander#options|Commander.js Options}
   *
   * @example
   * var cmd = Wsh.Commander;
   *
   * // Ex.1 Switch
   * cmd.addProgram({ options: [
   *   ['-O, --switch-no', 'Normally opened switch'], // default: false
   *   ['-C, --no-switch-nc', 'Normally closed switch'] // default: true
   * ]});
   * cmd.parse(process.argv);
   *
   * // `D:\>cscript Run.wsf`
   * cmd.opt.switchNo; // false
   * cmd.opt.switchNc; // true
   *
   * // `D:\>cscript Run.wsf -O -C`
   * //  or `D:\>cscript Run.wsf --switch-no --no-swith-nc`
   * cmd.opt.switchNo; // true
   * cmd.opt.switchNc; // false
   * @example
   * // Ex.2 Flag value
   * cmd.addProgram({ options: [
   *   ['-f, --flag [name]', 'Flag name'], // default: undefined
   *   ['-d, --flag-def [name]', 'Flag name(default: "My Name")', 'My Name'],
   * ]});
   * cmd.parse(process.argv);
   *
   * // `D:\>cscript Run.wsf`
   * cmd.opt.flag; // undefined
   * cmd.opt.flagDef; // 'My Name'
   *
   * // `D:\>cscript Run.wsf -f -d`
   * //  or `D:\>cscript Run.wsf --flag --flag-def`
   * cmd.opt.flag; // true
   * cmd.opt.flagDef; // 'My Name'
   *
   * // `D:\>cscript Run.wsf -f "Flag A" -d "Flag B"`
   * //  or `D:\>cscript Run.wsf --flag "Flag A" --flag-def "Flag B"`
   * cmd.opt.flag; // 'Flag A'
   * cmd.opt.flagDef; // 'Flag B'
   * @example
   * // Ex.3 Pair with a value
   * cmd.addProgram({ options: [
   *   ['-r, --required <Foo>', 'Empty <Foo> is not allowed'],
   *   ['-R, --def-word <Bar>', 'default value is "Def Name"', 'Def Name']
   * ]});
   * cmd.parse(process.argv); // No Error
   *
   * // `D:\>cscript Run.wsf`
   * cmd.opt.required; // undefined
   * cmd.opt.defWord; // 'Def Name'
   *
   * // `D:\>cscript Run.wsf -r`
   * //  or `D:\>cscript Run.wsf --required`
   * // Outputs the help
   *
   * // `D:\>cscript Run.wsf -r "Val A"`
   * //  or `D:\>cscript Run.wsf --required "Val A"`
   * cmd.opt.required; // 'Val A'
   * @example
   * // Ex.4 Array values
   * cmd.addProgram({ options: [
   *   ['-f, --flags [name...]', 'Flag name'],
   *   ['-v, --values <val...>', 'Specify your value', 'Val 0']
   * ]});
   * cmd.parse(process.argv);
   *
   * // `D:\>cscript Run.wsf`
   * cmd.opt.flags; // []
   * cmd.opt.values; // ['Val 0']
   *
   * // `D:\>cscript Run.wsf -f "Name 0" -v "Val 1"`
   * //  or `D:\>cscript Run.wsf --flags "Name 0" --values "Val 1"`
   * cmd.opt.flags; // ['Name 0']
   * cmd.opt.values; // ['Val 0', 'Val 1']
   *
   * // `D:\>cscript Run.wsf -v "Val 1" "Val 2" "Val 3"`
   * cmd.opt.values; // ['Val 0', 'Val 1', 'Val 2', 'Val 3']
   * @function addProgram
   * @memberof Wsh.Commander
   * @param {typeCommanderSchema} schemaObj - A schema of the program.
   * @returns {void}
   */
  cmd.addProgram = function (schemaObj) {
    var functionName = 'cmd.addProgram';
    if (!isPlainObject(schemaObj)) throwErrNonObject(functionName, schemaObj);

    var commandSchema = obtain(schemaObj, 'command', '');
    var optionsSchema = obtain(schemaObj, 'options', []);
    var requiredOptions = obtain(schemaObj, 'requiredOptions', []);

    if (!isString(commandSchema) && !hasContent(optionsSchema) && !hasContent(requiredOptions)) {
      throw new Error('\nError: [Invalid Schema]: Empty of command and options\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    // Set a command
    var cmdObj = _createCmdObj(commandSchema);

    if (__commands.some(function (o) { return o.name === cmdObj.name; })) {
      throw new Error('\nError: [Invalid Command Name] "' + cmdObj.name + '" is already existing\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    // Set a description
    var cmdDescription = obtain(schemaObj, 'description', '');
    cmdObj.description = cmdDescription;

    // Set a version
    var versionOptSchema = obtain(schemaObj, 'version', '');
    cmdObj.version = _creatVersionOptionObj(versionOptSchema);

    // Set options
    cmdObj.options = [].concat(_createOptionObjs(requiredOptions, true));
    cmdObj.options = cmdObj.options.concat(_createOptionObjs(optionsSchema, false));

    // Set a help option
    var helpOptSchema = obtain(schemaObj, 'helpOption', []);
    cmdObj.help = _createHelpOptionObj(helpOptSchema);
    cmdObj.help.val = _createCmdHelpMsg(cmdObj);

    // Set a action
    var actionSchema = obtain(schemaObj, 'action', null);
    if (isFunction(actionSchema)) {
      cmdObj.action = actionSchema;
    } else {
      cmdObj.action = null;
    }

    __commands.push(cmdObj);
  }; // }}}

  // cmd.addPrograms {{{
  /**
   * Defines the programs.
   *
   * @function addPrograms
   * @memberof Wsh.Commander
   * @param {typeCommanderSchema[]} schemaObjs - Schemas of the programs.
   * @returns {void}
   */
  cmd.addPrograms = function (schemaObjs) {
    var functionName = 'cmd.addPrograms';
    if (!isSolidArray(schemaObjs)) throwErrNonArray(functionName, schemaObjs);

    schemaObjs.forEach(function (schemaObj) {
      cmd.addProgram(schemaObj);
    });
  }; // }}}

  cmd.opt = {};

  // cmd.parse {{{
  /**
   * Parses the arguments of a WSH script with the program schemas.
   *
   * @example
   * var cmd = Wsh.Commander;
   *
   * cmd.addProgram({
   *   options: [
   *     ['-c, --console-name <name>', 'The game console name'],
   *     ['-G, --game-title [title]', 'The game name']
   *   ]
   * });
   *
   * cmd.parse(process.argv);
   *
   * // `cscript .\Run.wsf -c "SEGA Saturn" -G "StreetFighter ZERO"`
   * console.log(cmd.opt.consoleName); // 'SEGA Saturn'
   * console.log(cmd.opt.gameTitle); // 'StreetFighter ZERO'
   * @function parse
   * @memberof Wsh.Commander
   * @param {string[]} processArgv - The arguments of WSH (wscript/cscript).
   * @returns {void}
   */
  cmd.parse = function (processArgv) {
    var functionName = 'cmd.parse';
    if (!isArray(processArgv)) throwErrNonArray(functionName, processArgv);

    var args = Array.from(processArgv);

    var exePath = args.shift();
    if (exePath === undefined) {
      throw new Error('\nError: [Invalid Arguments(exePath)] ' + insp(processArgv) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    var wshPath = args.shift();
    if (wshPath === undefined) {
      throw new Error('\nError: [Invalid Arguments(wshPath)] ' + insp(processArgv) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
    }

    var matchedCmdObj = null;

    // Set the command name {{{
    // Set the default command object
    var defCmdIdx = __commands.findIndex(function (cmd) {
      return cmd.name === '';
    });
    if (defCmdIdx !== -1) matchedCmdObj = __commands[defCmdIdx];

    // Read the 1st arg as a command name
    if (args.length > 0) {
      // Search the arg as a command name
      var matchedCmdIdx = __commands.findIndex(function (cmd) {
        return (cmd.name === args[0]);
      });

      // Set the matched command object
      if (matchedCmdIdx !== -1) {
        matchedCmdObj = __commands[matchedCmdIdx];
        args.shift();
      }
    }

    if (matchedCmdObj === null) {
      var cmdlist = __commands.reduce(function (acc, cmdObj, i) {
        if (i === 0) return cmdObj.name;
        return acc + ', ' + cmdObj.name;
      }, '');

      throw new Error('\n'
        + 'ERROR: Set a command.\n'
        + 'where <command> is one of:\n'
        + '    ' + cmdlist + '\n'
        + '\n'
        + 'process.argv: [' + process.argv.join(', ') + ']');
    } // }}}

    var matchedArgObjIdx;
    var matchedOptIdxs;
    var reserveOptIdx = -1;

    var arg, opt, argObj;

    while (args.length > 0) {
      arg = args.shift();
      if (arg === undefined) break;

      // Set into the reserved option {{{
      if (reserveOptIdx !== -1) {
        opt = matchedCmdObj.options[reserveOptIdx];

        if (startsWith(arg, '-') && !opt.isPairWithVal) {
          reserveOptIdx = -1; // Clear the reserved option
        } else if (opt.isArray) {
          if (startsWith(arg, '-')) {
            reserveOptIdx = -1; // Clear the reserved option
          } else {
            if (isFunction(opt.initFunc)) {
              opt.val.push(opt.initFunc(arg, opt.val));
            } else {
              opt.val.push(arg);
            }
          }
        } else {
          // Do the custom option processing
          if (isFunction(opt.initFunc)) {
            opt.val = opt.initFunc(arg, opt.val);
          } else {
            opt.val = arg;
          }

          reserveOptIdx = -1; // Clear the reserved option
          continue;
        }
      } // }}}

      // Option
      if (startsWith(arg, '-')) {
        _showCmdHelpAndExit(matchedCmdObj, arg);
        _showCmdVersionAndExit(matchedCmdObj, arg);

        matchedOptIdxs = [];

        // Get the matching options indexes {{{
        if (isShortFlag(arg)) { // A short flag (e.g. "-s")
          matchedOptIdxs.push(
            matchedCmdObj.options.findIndex(function (opt) {
              return opt.shortFlag === arg;
            })
          );
        } else if (isJoinedShortFlags(arg)) { // Joined short flags (e.g. "-sVc")
          matchedCmdObj.options.forEach(function (opt, idx) {
            if (!includes(opt.shortFlag, arg.substring(1))) return;
            matchedOptIdxs.push(idx);
          });
        } else if (isLongFlag(arg)) { // A long flags (e.g. "--file")
          matchedOptIdxs.push(
            matchedCmdObj.options.findIndex(function (opt) {
              return (opt.longFlag === arg);
            })
          );
        } // }}}

        // Set a value into .val from the flag {{{
        matchedOptIdxs.forEach(function (idx) {
          if (idx === -1) {
            throw new Error('\nError: [Invalid Option] "' + arg + '"\n'
              + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
              + matchedCmdObj.help.val);
          }

          opt = matchedCmdObj.options[idx];
          opt.isSpecified = true;

          if (opt.valType === TYPE_SWITCH_NC) {
            if (isFunction(opt.initFunc)) { // the custom option processing
              opt.val = opt.initFunc(undefined, opt.val);
            } else {
              opt.val = false;
            }
          } else if (opt.valType === TYPE_SWITCH_NO) {
            if (isFunction(opt.initFunc)) { // the custom option processing
              opt.val = opt.initFunc(undefined, opt.val);
            } else {
              opt.val = true;
            }
          } else if (opt.valType === TYPE_VAL) {
            if (!opt.isArray && !opt.isPairWithVal) {
              if (!opt.val) opt.val = true;
            }

            reserveOptIdx = idx; // Reserve the next arg
          } else {
            throw new Error('\nError: Unknown option valType "' + opt.valType + '"\n'
              + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
              + matchedCmdObj.help.val);
          }
        }); // }}}
      // Argument
      } else {
        // Find a empty element in the defined order
        matchedArgObjIdx = matchedCmdObj.args.findIndex(function (argObj) {
          if (argObj.isArray) return true;
          return (argObj.val === undefined);
        });

        if (matchedArgObjIdx === -1) continue;

        argObj = matchedCmdObj.args[matchedArgObjIdx];
        argObj.isSpecified = true;

        if (argObj.isArray) {
          argObj.val.push(arg);
        } else {
          argObj.val = arg;
        }
      }
    }

    // Check if the required value is not empty {{{
    matchedCmdObj.args.some(function (arg) {
      if (!arg.isRequired) return false;
      if (!hasContent(arg.val)) {
        throw new Error('\nerror: missing required argument "' + arg.name + '"\n'
          + matchedCmdObj.help.val);
      }
    });

    matchedCmdObj.options.some(function (opt) {
      if (opt.isRequired && !hasContent(opt.val)) {
        throw new Error('\nerror: option "' + opt.schema[0] + '" argument missing\n'
          + matchedCmdObj.help.val);
      }

      if (opt.isSpecified && opt.isPairWithVal && opt.val === undefined) {
        throw new Error('\nerror: option "' + opt.schema[0] + '" argument missing\n'
          + matchedCmdObj.help.val);
      }
    }); // }}}

    // Store the option name as the cmd property {{{
    matchedCmdObj.options.forEach(function (opt) {
      cmd.opt[opt.name] = opt.val;
    }); // }}}

    // Do the action {{{
    if (isFunction(matchedCmdObj.action)) {
      var cmdArgs = [];

      matchedCmdObj.args.forEach(function (argObj) {
        if (argObj.isSpecified) cmdArgs.push(argObj.val);
        else cmdArgs.push(undefined);
      });

      if (hasContent(matchedCmdObj.options)) {
        var options = {};
        matchedCmdObj.options.forEach(function (opt) {
          options[opt.name] = opt.val;
        });

        return matchedCmdObj.action.apply(null, cmdArgs.concat([options]));
      }

      return matchedCmdObj.action.apply(null, cmdArgs);
    } // }}}
  }; // }}}

  // cmd.help {{{
  /**
   * Shows the help of programs and exit with returning 1.
   *
   * @example
   * var cmd = Wsh.Commander;
   *
   * cmd.addProgram({
   *   options: [
   *     ['-c, --console-name <name>', 'The game console name'],
   *     ['-G, --game-title [title]', 'The game name']
   *   ]
   * });
   *
   * cmd.parse(process.argv);
   *
   * if (cmd.opt.consoleName === 'DUO') cmd.help();
   * @function help
   * @memberof Wsh.Commander
   * @param {Function} [callback] - A Function to run before showing help.
   * @returns {void}
   */
  cmd.help = function (callback) {
    if (isFunction(callback)) callback();
    console.log(__commands.help.val);
    process.exit(CD.runs.err);
  }; // }}}

  // cmd.clearPrograms {{{
  /**
   * Clears the programs.
   *
   * @example
   * var cmd = Wsh.Commander;
   *
   * cmd.addProgram({
   *  // The program schema
   * });
   *
   * if (debug) {
   *   cmd.clearPrograms();
   *   cmd.addProgram({
   *     // The program schema to debug
   *   });
   * }
   *
   * cmd.parse(process.argv);
   * @function clearPrograms
   * @memberof Wsh.Commander
   * @returns {void}
   */
  cmd.clearPrograms = function () {
    cmd.opt = {};
    __commands = [];
  }; // }}}
})();

// vim:set foldmethod=marker commentstring=//%s :
