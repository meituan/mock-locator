var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Locator = require('..');
var Request = require('mock-request2');

var fixtures = {};
var dirname = path.join(__dirname, 'fixtures');
fs.readdirSync(dirname).forEach(function(filename) {
    if (path.extname(filename) === '.json') {
        var file = path.basename(filename, path.extname(filename));
        fixtures[file] =
            JSON.parse(fs.readFileSync(path.join(dirname, filename), 'utf8'));
    }
});
// parse all fixtures
var processed = {};
_.map(fixtures, function(fixture, key) {
    processed[key] = new Request(fixture);
});

describe('locator', function() {
    var mount = './test/fixtures/data';
    var locator = new Locator(mount);

    describe('find', function() {
        it('should match path', function() {
            var location = _find(processed.path);
            location.should.equal('deal/26701138.GET.json');
        });

        it('should match HTTP method', function() {
            var location = _find(processed.method);
            location.should.equal('method.POST.json');
        });

        it('should match query string', function() {
            var location = _find(processed.qs);
            location.should.equal('qs?key1=value1.GET.json');
        });

        it('should enable wildcard match with `:`', function() {
            var location = _find(processed.wildcard);
            location.should.equal('wildcard/:str.GET.json');
        });

        it('should handle no match found', function() {
            var match = locator.find(processed.notfound);
            (match === null).should.be.true;
        });

        it('should parse params in path', function() {
            var match = locator.find(processed.params);
            match.params.should.eql({
                id: 'someid',
                value: 'hello',
            });
        });

        // calculate relative path
        function _find(req) {
            return locator.find(req).path;
        }
    });

    describe('findAll', function() {
        it('should match all possible paths', function() {
            var matches = locator.find(processed.weight, true);
            matches.length.should.equal(2);
        });
    });

    describe('match', function() {

        // directory match

        it('should allow equal match', function() {
            var match = locator.match('dirname', 'dirname');
            match.weight.should.be.above(0);
        });

        it('should allow wildcard match', function() {
            var match = locator.match(':blan', 'dirname');
            match.weight.should.be.above(0);
        });

        it('should equal match wins wildcard match', function() {
            var equalMatch = locator.match('dirname', 'dirname');
            var wildcardMatch = locator.match(':blan', 'dirname');
            equalMatch.weight.should.be.above(wildcardMatch.weight);
        });

        // file match

        it('should allow basename wildcard match', function() {
            var actual = {
                basename: ':blan',
            };
            var expected = {
                basename: 'filename',
            };
            var match = locator.match(actual, expected, true);
            match.weight.should.be.above(0);
        });

        it('should all present query matches', function() {
            var actual = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                },
            };

            // not present
            var expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                },
            };
            var match = locator.match(actual, expected, true);
            match.weight.should.be.equal(0);

            // not match
            expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value1',
                    key3: 'value3',
                },
            };
            match = locator.match(actual, expected, true);
            match.weight.should.be.equal(0);

            // all right
            expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3',
                },
            };
            match = locator.match(actual, expected, true);
            match.weight.should.be.above(0);
        });

        it('should allow query value wildcard match', function() {
            var actual = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: ':blan',
                },
            };
            var expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value1',
                    key3: 'value3',
                },
            };
            var match = locator.match(actual, expected, true);
            match.weight.should.be.above(0);
        });

        it('should most query matches win', function() {
            var actual1 = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                },
            };
            var actual2 = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: ':blan',
                },
            };
            var actual3 = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                },
            };
            var expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3',
                },
            };
            var match1 = locator.match(actual1, expected, true);
            var match2 = locator.match(actual2, expected, true);
            var match3 = locator.match(actual3, expected, true);
            match3.weight.should.be.above(match2.weight);
            match2.weight.should.be.above(match1.weight);
        });

        it("should dirname and filename wins query match", function() {
            // NOTE: Current weight calculate maybe break if there is too many
            // querys
            var actual1 = {
                basename: ':blan',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                },
            };
            var actual2 = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: ':blan',
                },
            };
            var expected = {
                basename: 'filename',
                query: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3',
                },
            };
            var match1 = locator.match(actual1, expected, true);
            var match2 = locator.match(actual2, expected, true);
            match2.weight.should.be.above(match1.weight);
        });
    });

    describe('parse', function() {
        it('should parse basename and method', function() {
            var obj = locator.parse('name.GET.json');
            obj.basename.should.equal('name');
            obj.method.should.equal('GET');
            // auto convert method case
            obj = locator.parse('name.get.json');
            (obj.method === undefined).should.be.true;
        });

        it('should parse query if exists', function() {
            var obj = locator.parse('name?key=value.GET.json');
            obj.basename.should.equal('name');
            obj.method.should.equal('GET');
            obj.query.should.eql({key: 'value'});
        });
    });

    describe('sort', function() {
        it('should sort by reverse weight', function() {
            var matches = locator.find(processed.weight, true);
            matches[0].weight.should.above(matches[1].weight);
        });
    });
});
