# programmatic-repl
`programmatic-repl` is a Node.js module that allows one to simulate a repl programmatically. This is very useful for embedded application where you'd like to simulate a repl. If you have plans to use this for a CLI application, I would suggest [the official repl module](https://nodejs.org/api/repl.html) instead.

# Initializing
The module exports the `REPL` class. The parameters to this class are `options, context`.

#### Options
All of the options are optional.

Parameter | Type | Description | Default
--- | --- | --- | ---
`options.includeNative` | Boolean | This property will include native Node.js functions and properties in the REPL context. Specifically `require`, `Buffer`, `        __dirname`, `setImmediate`, `clearImmediate`, `clearInterval`, `clearTimeout` and `process`. | false
`options.includeBuiltinLibs` | Boolean | This property will include all of the native Node.js modules and libraries in the REPL context (e.g. `child_process` and `fs`). A full list of these modules can be found [here](https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js#L100-#L105). | false
`options.indentation` | Number | This is the amount of spaces of indentation the REPL will show intermediate outputs with. | 2
`options.name` | String | The "name" of the repl - shows up as the filename in stack traces / errors | 'programmatic-repl'

#### Context
The Context parameter is an object of values you want to include in the REPL.

#### Example
```js
const ProgrammaticREPL = require('programmatic-repl');

const REPL = new ProgrammaticREPL({
  includeNative: true,
  includeBuiltinLibs: true,
  indentation: 2
}, {
  foo: 'bar',
  baz: 'qux'
});
```

# Usage
Once you've initiated your REPL, you can use the `execute` method. The `execute` method takes 1 parameter (in the form of a String): the input. The method always returns a Promise. The result will either be the computed value or an intermediate output.

The input is ofcourse your JavaScript, but the following commands / variables are available:  

Name | Description
--- | ---
`.clear` | This command deletes any variables you've made and resets the context fully. 
`_` | In the form of a variable, this is the output of the last ran command.

#### Examples
<sup>*The examples assume the REPL has already been initiated.*</sup>
```js
await REPL.execute('5;');
// returns 5
```
```js
await REPL.execute('const myObject = { foo: \'bar\' };');
// returns undefined

await REPL.execute('myObject;');
// returns { foo: 'bar' }

await REPL.execute('Object.keys(_);');
// returns [ 'foo' ]

await REPL.execute('.clear');
// returns 'Successfully cleared variables.'

await REPL.execute('myObject;');
// throws a ReferenceError: myObject is not defined
```

The module also lets you leave brackets open and view intermediate results.
```js
await REPL.execute('if (true) {');
// returns (String):
`
if (true) {
  ...
`
  
await REPL.execute('if (false || true) {');
// returns (String):
`
if (true) {
  if (false || true) {
    ...
`

await REPL.execute('Promise.resolve(42);');
// returns (String):
`
if (true) {
  if (false || true) {
    Promise.resolve(42);
    ...
`

await REPL.execute('}');
// returns (String):
`
if (true) {
  if (false || true) {
    Promise.resolve(42);
  }
  ...
`

await REPL.execute('}');
// returns (Number, resolved Promise): 42
```

And lastly, some examples for REPL parameters:
```js
const REPL = new ProgrammaticREPL({
  includeNative: true,
  includeBuiltinLibs: true,
  indentation: 2
}, {
  foo: 'bar',
  baz: 'qux'
});

// Node.js-specific variables are included, because we specified it:
await REPL.execute('require(\'./some-file.js\');');
await REPL.execute('new Buffer(42);')

// Builtin libs too, because we specified it:
await REPL.execute('querystring.stringify({ foo: \'bar\' });');
await REPL.execute('child_process.execSync(\'echo "Hi!"\').toString();');

// And, our own passed context:
await REPL.execute('foo === \'bar\' && baz === \'qux\';')
// returns true
```

# Contributing
To contribute, please make sure you follow the same code style and lint your code.
Also important, make sure you detail your changes made and why they were made the way they were.
