#!/usr/bin/env node

const chalk = require('chalk'),
    path = require('path'),
    fs = require('fs-extra'),
    browserify = require('browserify'),
    uglifyJS = require('uglify-js'),
    Readable = require('stream').Readable;

const DIST_DIR = 'dist',
    COMPONENTS_DIR = 'components',
    PACKAGES = ['controls', 'loaders', 'misc', 'primitives'],
    COMPONENTS = ['loaders/three-model', 'misc/grab', 'misc/sphere-collider'];

const streams = {};

// Full build.
const stream = new Readable();
stream.push(`require('./').registerAll();`);
stream.push(null);
streams['aframe-extras.js'] = stream;

// Individual packages.
PACKAGES.forEach((name) => {
  const stream = new Readable();
  stream.push(`require('./src/${name}').registerAll();`);
  stream.push(null);
  streams[`aframe-extras.${name}.js`] = stream;
});

// Individual components.
COMPONENTS.forEach((name => {
  const stream = new Readable(),
      basename = path.basename(name);
  stream.push(`AFRAME.registerComponent('${basename}', require('./src/${name}'));`);
  stream.push(null);
  stream._isComponent = true;
  streams[`${basename}.js`] = stream;
}));

// Browserify.
console.log(chalk.green('Dist...'));
fs.emptydirSync(DIST_DIR);
fs.mkdirSync(path.join(DIST_DIR, COMPONENTS_DIR));
Object.keys(streams).forEach((fileName) => {
  const subDir = streams[fileName]._isComponent ? COMPONENTS_DIR : '',
      fullDir = path.join(DIST_DIR, subDir, fileName),
      writeStream = fs.createWriteStream(fullDir);

  browserify()
    .add(streams[fileName])
    .bundle()
    .pipe(writeStream);

  // Minify.
  writeStream.on('close', () => {
    fs.createWriteStream(fullDir.replace('.js', '.min.js'))
      .end(uglifyJS.minify([fullDir]).code);

    console.log(chalk.yellow('  ⇢  %s'), fullDir);
  });
});

// Exit handler.
process.on('exit', (err) => {
  if (err) console.log(chalk.red('  ⇢  Failed.'));
  else console.log(chalk.yellow('  ⇢  Done. 🍻   '));
});

process.on('uncaughtException', (e) => {
  console.error(chalk.red('  ⇢  %s, %s:%d'), e.message, e.filename, e.line);
  process.exit(1);
});
