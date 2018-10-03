/* global describe, it */

const chai = require('chai');
chai.use(require('chai-as-promised'));
const { expect } = chai;

const ProgrammaticREPL = require(`${__dirname}/index.js`);

const getREPL = (cfg, ctx = {}) => new ProgrammaticREPL({
  includeNative: true,
  includeBuiltinLibs: true,
  indentation: 2
  ...cfg
}, ctx);

describe('initiation', () => {
  it('should pass on configs properly without throwing', () => {
    const REPL = getREPL();
    expect(REPL.config).to
      .deep.equal({
        includeNative: true,
        includeBuiltinLibs: true,
        indentation: 2
      });
  });

  it('should include native functions/objects', () => {
    const REPL = getREPL();

    expect(REPL.ctx).to
      .be.an('object')
      .that.includes.all.deep.keys(
        'require',
        'Buffer',
        '__dirname',
        'setTimeout',
        'setInterval',
        'setImmediate',
        'clearTimeout',
        'clearInterval',
        'clearImmediate',
        'process'
      );
  });

  it('shouldn\'t include native functions/objects', () => {
    const REPL = getREPL({ includeNative: false });

    expect(REPL.ctx).to
      .be.an('object')
      .that.does.not.include.any.deep.keys(
        'require',
        'Buffer',
        '__dirname',
        'setImmediate',
        'clearImmediate',
        'clearInterval',
        'clearTimeout',
        'process'
      );
  });

  it('should include native modules', () => {
    const REPL = getREPL();
    const { _builtinLibs } = require('repl');

    expect(REPL.ctx).to
      .be.an('object')
      .that.includes.all.deep.keys(..._builtinLibs);
  });

  it('shouldn\'t include native modules', () => {
    const REPL = getREPL({ includeBuiltinLibs: false });
    const { _builtinLibs } = require('repl');

    expect(REPL.ctx).to
      .be.an('object')
      .that.does.not.include.all.deep.keys(..._builtinLibs);
  });
});

describe('execution', () => {
  describe('direct executions', () => {
    it('should keep types', async () => {
      const REPL = getREPL();

      expect(await REPL.execute('42')).to
        .be.a('number')
        .and.equal(42);

      expect(await REPL.execute('\'foo\'')).to
        .be.a('string')
        .and.equal('foo');

      expect(await REPL.execute('({ foo: \'bar\' })')).to
        .be.an('object')
        .and.deep.equal({ foo: 'bar' });
    });
  });

  describe('variables', () => {
    it('should keep variables in the same context', async () => {
      const REPL = getREPL();

      await REPL.execute('const foo = \'bar\'');

      expect(await REPL.execute('foo')).to
        .be.a('string')
        .and.equal('bar');
    });

    it('should clear variables', async () => {
      const REPL = getREPL();

      await REPL.execute('const foo = \'bar\'');
      await REPL.execute('.clear');

      return expect(REPL.execute('foo')).to
        .be.eventually.rejectedWith(/foo is not defined/);
    });

    it('should have variables passed in the context', async () => {
      const REPL = getREPL({}, {
        foo: 'bar'
      });

      expect(await REPL.execute('foo')).to
        .equal('bar');
    });
  });

  describe('underscore as the last output', () => {
    it('should have _ as the output of the last command, or undefined if there are none', async () => {
      const REPL = getREPL();

      expect(await REPL.execute('_')).to
        .equal(undefined);

      await REPL.execute('42');

      expect(await REPL.execute('_')).to
        .equal(42);
    });
  });

  describe('split brackets', () => {
    it('should resolve 1-layer bracketed statements', async () => {
      const REPL = getREPL();

      await REPL.execute('if (true) {');
      await REPL.execute('\'foo\'');
      expect(await REPL.execute('}')).to
        .equal('foo');
    });

    it('should resolve multi-layered bracketed statements', async () => {
      const REPL = getREPL();

      for (let i = 0; i < 50; i++) {
        await REPL.execute('if (true) {');
      }
      await REPL.execute('\'foo\'');
      for (let i = 0; i < 49; i++) {
        await REPL.execute('}');
      }

      expect(await REPL.execute('}')).to
        .equal('foo');
    });

    it('should support splitting callback-style calls', async () => {
      const REPL = getREPL();

      await REPL.execute('(() => {');
      await REPL.execute('return \'foo\'');

      expect(await REPL.execute('})()')).to
        .equal('foo');
    });

    it('should kill the statement queue with .clear', async () => {
      const REPL = getREPL();

      await REPL.execute('if (true) {');
      await REPL.execute('.clear');

      expect(await REPL.execute('\'foo\'')).to
        .equal('foo');
    });

    it('should show intermediate results with proper indentation', async () => {
      const indentation = 4;
      const REPL = getREPL({ indentation });

      expect(await REPL.execute('if (true) {')).to
        .equal(
        // eslint-disable-next-line indent
`if (true) {
${' '.repeat(indentation)}...`
        );
    });

    it('should display appended nested results properly', async () => {
      const REPL = getREPL();

      expect(await REPL.execute('if (true) {')).to
        .equal(
        // eslint-disable-next-line indent
`if (true) {
  ...`
        );

      expect(await REPL.execute('if (true) {')).to
        .equal(
        // eslint-disable-next-line indent
`if (true) {
  if (true) {
    ...`
        );

      expect(await REPL.execute('\'foo\'')).to
        .equal(
          // eslint-disable-next-line indent
`if (true) {
  if (true) {
    'foo'
    ...`
        );

      expect(await REPL.execute('}')).to
        .equal(
          // eslint-disable-next-line indent
`if (true) {
  if (true) {
    'foo'
  }
  ...`
        );

      expect(await REPL.execute('}')).to
        .equal('foo');
    });
  });
});
