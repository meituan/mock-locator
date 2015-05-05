var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var _ = require('lodash');

/**
 * @constructor
 * @param {string} mount Root directory of mock data.
 */
function Locator(mount) {
    this.mount = mount;
}

/**
 * Find best match mock response file path.
 * @private
 * @param {Req} req Normalized HTTP request.
 * @param {boolean} multiple Whether return all matching data.
 * @return {Array.<Match>|Match|null} Mock response match.
 */
Locator.prototype.find = function(req, multiple) {
    multiple = multiple === undefined ? false : multiple;

    var matches = [];
    this.findAll(req.pathname, this.mount, 0, req, {weight: 0, params: {}}, matches);
    if (multiple) {
        return matches;
    }
    matches = this.sort(matches);
    if (matches.length === 0) {
        return null;
    }
    return matches[0];
};

/**
 * @private
 * @param {Array} parts Slash seperated URI parts
 * @param {string} dir Current searching directory
 * @param {number} level Current filename compare index
 * @param {Match} current Current path match
 * @param {Array.<Match>} matches All matching paths
 */
Locator.prototype.findAll = function(parts, dir, level, req, current, matches) {
    fs.readdirSync(dir).forEach(function(dirname) {
        var info = fs.statSync(path.join(dir, dirname)), match, actual, expected;
        if (parts.length - 1 === level) {
            if (info.isFile()) {
                // base path and query match
                actual = this.parse(dirname);
                expected = {
                    basename: parts[level],
                    query: req.query,
                    method: req.method,
                };
                match = this.match(actual, expected, true);
                if (match.weight) {
                    match = this.add(current, match);
                    // path relative to mount
                    match.path = path.relative(this.mount, path.join(dir, dirname)),
                    matches.push(match);
                }
            }
        } else {
            if (info.isDirectory()) {
                // middle dir match
                match = this.match(dirname, parts[level], false);
                if (match.weight) {
                    match = this.add(current, match);
                    this.findAll(parts, path.join(dir, dirname), level + 1, req,
                                 match, matches);
                }
            }
        }
    }, this);
};

/**
 * Add two match object.
 * @private
 * @param {Match} m1
 * @param {Match} m2
 * @return {Match}
 */
Locator.prototype.add = function(m1, m2) {
    return {
        weight: m1.weight + m2.weight,
        params: _.merge(_.clone(m1.params), _.clone(m2.params)),
    };
};

/**
 * Match actual dirname or filename with expect name specified in URI.
 * @private
 * @param {string|Part} actual Actual dirname or filename
 * @param {string|Part} expected expected name in URI
 * @param {boolean} isFile Whether compare with query
 * @return {Match} Calculated match
 * {
 *     path: string
 *     weight: number
 *     params: Array
 * }
 */
Locator.prototype.match = function(actual, expected, isFile) {
    isFile = isFile === undefined ? false : isFile;

    var match = {weight: 0, params: {}}, mismatch = false;
    if (typeof actual === 'string') {
        actual = { basename: actual };
    }
    if (typeof expected === 'string') {
        expected = { basename: expected };
    }

    if (!isFile) {
        // easy's first
        if (actual.basename === expected.basename) {
            match.weight += 20;
        } else if (actual.basename[0] === ':') {
            // wildcard
            match.weight += 10;
            match.params[actual.basename.slice(1)] = expected.basename;
        }
        return match;
    }

    // basename
    if (actual.basename === expected.basename) {
        match.weight += 20;
    } else if (actual.basename[0] === ':') {
        match.weight += 10;
        match.params[actual.basename.slice(1)] = expected.basename;
    } else {
        mismatch = true;
    }

    // query
    _.forOwn(actual.query, function(value, key) {
        if (_.has(expected.query, key)) {
            if (expected.query[key] === value) {
                match.weight += 2;
            } else if (value[0] === ':') {
                match.weight += 1;
                match.params[value.slice(1)] = expected.query[key];
            } else {
                mismatch = true;
            }
        } else {
            mismatch = true;
        }
    });

    // method
    // Allow method to be optional
    if (actual.method === undefined) {
        match.weight += 5;
    } else if (actual.method === expected.method) {
        match.weight += 10;
    } else {
        mismatch = true;
    }

    if (mismatch) {
        return {weight: 0, params: {}};
    }

    return match;
};

/**
 * Parse filename with format `basename[?query][.method].ext`
 * @private
 * @param {string} filename
 * @return {Part}
 * {
 *     basename: string
 *     query: Object
 *     method: string
 * }
 */
Locator.prototype.parse = function(filename) {
    var obj = {}, index, method;

    // remove extension
    index = filename.lastIndexOf('.');
    filename = filename.slice(0, index);

    // method
    index = filename.lastIndexOf('.');
    if (index !== -1) {
        method = filename.slice(index + 1);
        if (method.toUpperCase() === method) {
            obj.method = method;
            filename = filename.slice(0, index);
        }
    }

    // query
    index = filename.lastIndexOf('?');
    if (index !== -1) {
        obj.basename = filename.slice(0, index);
        obj.query = qs.parse(filename.slice(index + 1));
    } else {
        obj.basename = filename;
    }

    return obj;
};

/**
 * Sort by weight
 * @private
 * @param {Array} matches
 * @return {Array}
 */
Locator.prototype.sort = function(matches) {
    return matches.sort(function(a, b) {
        return b.weight - a.weight;
    });
};

module.exports = Locator;
