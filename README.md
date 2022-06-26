# WshCommander

The Command-Prompt Interfaces for WSH (Windows Script Host).

## tuckn/WshModeJs basic applications structure

[WshBasicApps](https://github.com/tuckn/WshBasicPackage)  
&emsp;&emsp;├─ WshCommander - This repository (./dist/module.js)  
&emsp;&emsp;├─ [WshConfigStore](https://github.com/tuckn/WshConfigStore) (./dist/module.js)  
&emsp;&emsp;├─ [WshDotEnv](https://github.com/tuckn/WshDotEnv) (./dist/module.js)  
&emsp;&emsp;├─ [WshLogger](https://github.com/tuckn/WshLogger) (./dist/module.js)  
&emsp;&emsp;└─ [WshModeJs](https://github.com/tuckn/WshModeJs) (./dist/bundle.js)  

WshBasicApps can use all the above modules.

## Operating environment

Works on JScript in Windows.

## Installation

(1) Create a directory of your WSH project.

```console
D:\> mkdir MyWshProject
D:\> cd MyWshProject
```

(2) Download this ZIP and unzip or Use the following `git` command.

```console
> git clone https://github.com/tuckn/WshCommander.git ./WshModules/WshCommander
or
> git submodule add https://github.com/tuckn/WshCommander.git ./WshModules/WshCommander
```

(3) Create your JScript (.js) file. For Example,

```console
D:\MyWshProject\
├─ MyScript.js <- Your JScript code will be written in this.
└─ WshModules\
    └─ WshCommander\
        └─ dist\
          └─ bundle.js
```

I recommend JScript (.js) file encoding to be UTF-8 [BOM, CRLF].

(4) Create your WSF packaging scripts file (.wsf).

```console
D:\MyWshProject\
├─ Run.wsf <- WSH entry file
├─ MyScript.js
└─ WshModules\
    └─ WshCommander\
        └─ dist\
          └─ bundle.js
```

And you should include _.../dist/bundle.js_ into the WSF file.
For Example, The content of the above _Run.wsf_ is

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshCommander/dist/bundle.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

I recommend this WSH file (.wsf) encoding to be UTF-8 [BOM, CRLF].

Awesome! This WSH configuration allows you to use the following functions in JScript (_.\\MyScript.js_).

## Usage

Now _.\\MyScript.js_ (JScript ) can use `Wsh.Commander`.

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
 /* The program schema A */
});

cmd.addProgram({
 /* The program schema B */
});

cmd.parse(/* WSH Arguments */);
```

For example.

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  command: 'play <consoleName> [gameTitle]',
  options: [
    ['-S, --speed [LV]', 'The game speed (Default: 5)', 5]
  ]
  action: function (consoleName, gameTitle, options) {
    if (typeof gameTitle === 'string') {
      console.log('play ' + gameTitle + ' on ' + consoleName);
    } else {
      console.log('play ' + consoleName);
    }
  }
});

cmd.parse(process.argv);
```

```console
> cscript .\Run.wsf play "SEGA Saturn" "StreetFighter ZERO"
play StreetFighter ZERO on SEGA Saturn
```

Auto creation the help message

```console
> cscript .\Run.wsf --help
Usage: Run.wsf play <consoleName> [gameTitle]

Options:
  -S, --speed [LV] The game speed (Default: 5)
```

### Use options

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  requiredOptions: [ // This options can not be omitted.
    ['-c, --console-name <name>', 'The game console name']
  ],
  options: [
    ['-G, --game-title [title]', 'The game name'],
    ['-S, --speed [LV]', 'The game speed (Default: 5)', 5]
  ]
});

cmd.parse(process.argv);

console.log(cmd.opt.consoleName);
console.log(cmd.opt.gameTitle);
console.log(cmd.opt.speed);
```

When no specifying the require options.

```console
> cscript .\Run.wsf
Usage: Run.wsf [options]

Options:
  -c, --console-name <name> The game console name
  -G, --game-title [title]  The game name
```

Specifying the options.

```console
> cscript .\Run.wsf -c "SEGA Saturn" -G "StreetFighter ZERO" -S 1
SEGA Saturn
StreetFighter ZERO
1
```

No specifying the options.

```console
> cscript .\Run.wsf -c "SEGA Saturn"
SEGA Saturn
undefined
5
```

Using long option name (and No specifying the option values).

```console
> cscript .\Run.wsf --console-name "SEGA Saturn" --game-title --speed
SEGA Saturn
true
5
```

### Action

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  command: 'play <consoleName> [gameTitle]',
  action: function (consoleName, gameTitle) {
    if (typeof gameTitle === 'string') {
      console.log('play ' + gameTitle + ' on ' + consoleName);
    } else {
      console.log('play ' + consoleName);
    }
  }
});

cmd.parse(process.argv);
```

```console
> cscript .\Run.wsf play "SEGA Saturn"
play SEGA Saturn
```

### Options and Action

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  command: 'play <consoleName>',
  options: [
    ['-G, --game-title [title]', 'A game name']
  ],
  action: function (consoleName, options) {
    if (typeof options.gameTitle === 'string') {
      console.log('play ' + options.gameTitle + ' on ' + consoleName);
    } else {
      console.log('play ' + consoleName);
    }
  }
});

cmd.parse(process.argv);
```

### Pre-processing

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  options: [
    ['-F, --pre-func <Number>', 'Function processing 1', parseInt],
    ['-I, --increment <Number>', 'Function processing 2', function (num, pre) {
      return pre + parseInt(num, 10);
    }, 3]
  ]
});

cmd.parse(process.argv);

console.log(cmd.opt.preFunc);
console.log(cmd.opt.increment);
```

```console
> cscript .\Run.wsf -F "3.14" -I 4
3
7
```

```console
> cscript .\Run.wsf -I 4 -I 1
NaN
8
```

### Customize

```js
var cmd = Wsh.Commander; // Shorthand

cmd.addProgram({
  version: '0.5.1', // Add the version number and outputting action
  options: [
    ['-h, --height <Number>', 'Picture size']
  ],
  description: 'The sample of WshCommander.js'
  helpOption: ['-S, --show-help', 'Show help']
});

cmd.parse(process.argv);
```

Outputs the version

```console
> cscript .\Run.wsf -v
0.5.1
```

Outputs the help

```console
> cscript .\Run.wsf -S
Usage: Run.wsf [options]

An application for Testing WshCore/Commander.js

Options:
  -h, --height <Number> Picture size
```

### Together with another WshModeJs Apps

If you want to use it together with other WshModeJs Apps, install as following

```console
> git clone https://github.com/tuckn/WshModeJs.git ./WshModules/WshModeJs
> git clone https://github.com/tuckn/WshCommander.git ./WshModules/WshCommander
> git clone https://github.com/tuckn/WshConfigStore.git ./WshModules/WshConfigStore
or
> git submodule add https://github.com/tuckn/WshModeJs.git ./WshModules/WshModeJs
> git submodule add https://github.com/tuckn/WshCommander.git ./WshModules/WshCommander
> git submodule add https://github.com/tuckn/WshConfigStore.git ./WshModules/WshConfigStore
```

The definition in the WSF packaging scripts file (.wsf) is as follows.

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshModeJs/dist/bundle.js"></script>
    <script language="JScript" src="./WshModules/WshCommander/dist/module.js"></script>
    <script language="JScript" src="./WshModules/WshConfigStore/dist/module.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

Please note the difference between `.../dist/bundle.js` and `.../dist/module.js`.

I recommend using [WshBasicApps](https://github.com/tuckn/WshBasicPackage).
That includes all modules.

### Dependency Modules

You can also use the following helper functions in your JScript (_.\\MyScript.js_).

- [tuckn/WshPolyfill](https://github.com/tuckn/WshPolyfill)
- [tuckn/WshUtil](https://github.com/tuckn/WshUtil)
- [tuckn/WshPath](https://github.com/tuckn/WshPath)
- [tuckn/WshOS](https://github.com/tuckn/WshOS)
- [tuckn/WshFileSystem](https://github.com/tuckn/WshFileSystem)
- [tuckn/WshProcess](https://github.com/tuckn/WshProcess)
- [tuckn/WshChildProcess](https://github.com/tuckn/WshChildProcess)
- [tuckn/WshNet](https://github.com/tuckn/WshNet)
- [tuckn/WshModeJs](https://github.com/tuckn/WshModeJs)

## Documentation

See all specifications [here](https://docs.tuckn.net/WshCommander) and also below.

- [WshPolyfill](https://docs.tuckn.net/WshPolyfill)
- [WshUtil](https://docs.tuckn.net/WshUtil)
- [WshPath](https://docs.tuckn.net/WshPath)
- [WshOS](https://docs.tuckn.net/WshOS)
- [WshFileSystem](https://docs.tuckn.net/WshFileSystem)
- [WshProcess](https://docs.tuckn.net/WshProcess)
- [WshChildProcess](https://docs.tuckn.net/WshChildProcess)
- [WshNet](https://docs.tuckn.net/WshNet)
- [WshModeJs](https://docs.tuckn.net/WshModeJs)

## License

MIT

Copyright (c) 2020 [Tuckn](https://github.com/tuckn)
