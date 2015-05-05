# mock-locator [![NPM version][npm-image]][npm-url] [![build status][travis-image]][travis-url] [![Test coverage][coveralls-image]][coveralls-url]

> Resource locator

## Installation

    npm install mock-locator

## Usage

    var Locator = require('mock-locator');
    var locator = new Locator('test/fixtures');
    locator.find({
        pathname: ['path', 'to', 'file.json'],
        method: 'GET',
    }); // => return json object of test/fixtures/path/to/file.json

## License

MIT

[npm-image]: https://img.shields.io/npm/v/mock-locator.svg?style=flat
[npm-url]: https://npmjs.org/package/mock-locator
[travis-image]: https://img.shields.io/travis/meituan/mock-locator.svg?style=flat
[travis-url]: https://travis-ci.org/meituan/mock-locator
[coveralls-image]: https://img.shields.io/coveralls/meituan/mock-locator.svg?style=flat
[coveralls-url]: https://coveralls.io/r/meituan/mock-locator?branch=master
