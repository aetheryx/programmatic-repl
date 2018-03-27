const { createContext, runInContext } = require('vm');
const { sep } = require('path');

const closingTagRX = new RegExp('}\\)*(\\(()*\\))*$');

class REPL {
  constructor (config, ctx) {
    this.config = config;
    this.sourceCtx = ctx;
    this.ctx = this._buildContext(config, ctx);

    this.statementQueue = [];
    this.lastRanCommandOutput = undefined;
  }

  _buildContext (config = this.config, ctx = this.sourceCtx) {
    if (config.includeNative) {
      ctx = Object.assign({
        require,
        Buffer,
        __dirname: require.main.filename.split(sep).slice(0, -1),
        setTimeout,
        setInterval,
        setImmediate,
        clearTimeout,
        clearInterval,
        clearImmediate,
        process
      }, ctx);
    }

    if (config.includeBuiltinLibs) {
      ctx = Object.assign(this._buildBuiltinLibs(), ctx);
    }

    createContext(ctx);
    return ctx;
  }

  _buildBuiltinLibs () {
    const output = {};
    const { _builtinLibs } = require('repl');

    for (const lib in _builtinLibs) {
      output[_builtinLibs[lib]] = require(_builtinLibs[lib]);
    }

    return output;
  }

  _getIndentation (isClosing = false) {
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
      this.statementQueue.push(' '.repeat(this._getIndentation()) + command);
    }
    return `${this.statementQueue.join('\n')}\n${' '.repeat(this._getIndentation())}...`;
  }

  async execute (command) {
    if (command === '.clear') {
      this.ctx = this._buildContext();
      this.statementQueue = [];
      return 'Successfully cleared variables.';
    }

    this.ctx._ = this.lastRanCommandOutput;

    if (this.statementQueue[0] && command.match(closingTagRX)) {
      this.statementQueue.push(' '.repeat(this._getIndentation(true)) + command);
      const [ { length: opening }, { length: closing } ] = [ this.statementQueue.filter(g => g.endsWith('{')), this.statementQueue.filter(g => g.match(closingTagRX)) ];
      if (opening !== closing) {
        return this.prompt(command, false);
      }

      command = this.statementQueue.join('\n');
      this.statementQueue = [];
    } else if (command.endsWith('{') || this.statementQueue[0]) {
      return this.prompt(command, true);
    }

    const result = this.lastRanCommandOutput = await runInContext(command, this.ctx, {
      filename: this.config.name || 'programmatic-repl'
    });

    return result;
  }
}

module.exports = REPL;
