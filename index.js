const { inspect } = require('util');
const { createContext, runInContext } = require('vm');
const { sep } = require('path');

const closingTagRX = new RegExp('}\\)*(\\(()*\\))*$');

class REPL {
  constructor (config, ctx) {
    this.config = config;
    this.sourceCtx = ctx;
    this.ctx = this.buildContext(config, ctx);

    this.statementQueue = [];
    this.lastRanCommandOutput = '';
  }

  buildContext (config = this.config, ctx = this.sourceCtx) {
    if (config.includeNative) {
      ctx = Object.assign({
        require,
        Buffer,
        __dirname: require.main.filename.split(sep).slice(0, -1),
        setImmediate,
        clearImmediate,
        clearInterval,
        clearTimeout
      }, ctx);
    }

    if (config.includeBuiltinLibs) {
      ctx = Object.assign(this.buildBuiltinLibs(), ctx);
    }

    createContext(ctx);
    return ctx;
  }

  buildBuiltinLibs () {
    const output = {};
    const { _builtinLibs } = require('repl');

    for (const lib in _builtinLibs) {
      output[_builtinLibs[lib]] = require(_builtinLibs[lib]);
    }

    return output;
  }

  getIndentation (isClosing = false) {
    let indentation = 0;
    for (const statement of this.statementQueue) {
      if (statement.endsWith('{')) {
        indentation++;
      } else if (statement.match(closingTagRX)) {
        indentation--;
      }
    }

    if (isClosing) {
      indentation--; // When closing statements, we need one "extra" drop down
    }

    return indentation * (this.config.indentation || 2);
  }

  prompt (command, append) {
    if (append) {
      this.statementQueue.push(' '.repeat(this.getIndentation()) + command);
    }
    return `${this.statementQueue.join('\n')}\n${' '.repeat(2 * this.config.indentation)}...`;
  }

  async execute (command) {
    if (command === '.clear') {
      this.ctx = this.buildContext();
      this.statementQueue = [];
      return 'Successfully cleared variables.';
    }

    this.ctx._ = this.lastRanCommandOutput;

    if (this.statementQueue[0] && command.match(closingTagRX)) {
      this.statementQueue.push(' '.repeat(this.getIndentation(true)) + command);
      const [ { length: opening }, { length: closing } ] = [ this.statementQueue.filter(g => g.endsWith('{')), this.statementQueue.filter(g => g.match(closingTagRX)) ];
      if (opening !== closing) {
        return this.prompt(command, false);
      }

      command = this.statementQueue.join('\n');
      this.statementQueue = [];
    } else if (command.endsWith('{') || this.statementQueue[0]) {
      return this.prompt(command, true);
    }

    let result;
    try {
      result = await runInContext(command, this.ctx, {
        filename: 'programmatic-repl'
      });

      this.lastRanCommandOutput = result;

      if (typeof result !== 'string') {
        result = inspect(result, {
          depth: +!(inspect(result, { depth: 1, showHidden: true }).length > 1990), // Results in either 0 or 1
          showHidden: true
        });
      }
    } catch (e) {
      const error = e.stack || e;
      result = `ERROR:\n${typeof error === 'string' ? error : inspect(error, { depth: 1 })}`;
    }

    return result;
  }
}

module.exports = REPL;
