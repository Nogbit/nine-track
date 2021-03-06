var fs = require('fs');
var expect = require('chai').expect;
var httpUtils = require('./utils/http');
var serverUtils = require('./utils/server');

// DEV: This tests that we can sanitize saved data for public visibility
describe('A server being proxied by a sanitizing `nine-track`', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(req.headers);
  });
  serverUtils.runNineServer(1338, {
    fixtureDir: __dirname + '/actual-files/scrub',
    url: 'http://localhost:1337',
    scrubFn: function (info) {
      // DEV: We cannot replace to the same value since this is used along `normalizeFn`
      //   Instead we must have a scrambler
      if (info.request.headers.authorization) {
        info.request.headers.authorization = info.request.headers.authorization.replace(/^(Basic \w)[\w=]+$/, '$1');
      }
    }
  });

  describe('when requested with a set of credentials', function () {
    httpUtils.save('http://hello:world@localhost:1338/');

    it('receives with its authentication information', function () {
      expect(this.err).to.equal(null);
      // DEV: Do not encode HTTP auth by hand, copy/paste it from failures.
      //   We *do* need the value hardcoded to a string since we need to verify it is different from `goodbye:moon`
      expect(JSON.parse(this.body)).to.have.property('authorization', 'Basic aGVsbG86d29ybGQ=');
    });

    it('scrubs authentication information from disk', function () {
      var filepaths = fs.readdirSync(__dirname + '/actual-files/scrub');
      var filepath = filepaths[0];
      var fixture = JSON.parse(fs.readFileSync(__dirname + '/actual-files/scrub/' + filepath, 'utf8'));
      expect(fixture.request.headers).to.have.property('authorization', 'Basic a');
    });

    describe('when requested again', function () {
      httpUtils.save('http://hello:world@localhost:1338/');

      it('does not double request', function () {
        expect(this.requests[1337]).to.have.property('length', 1);
      });
    });

    describe('and a request with a different set of credentials', function () {
      httpUtils.save('http://goodbye:moon@localhost:1338/');

      it('receives a different set of credentials', function () {
        expect(this.err).to.equal(null);
        expect(JSON.parse(this.body)).to.have.property('authorization', 'Basic Z29vZGJ5ZTptb29u');
      });
    });
  });
});

// DEV: This is an edge case to verify no information can be distilled from hashes
describe('A time-sensitive server being proxied by a sanitizing and a non-sanitizing `nine-track`', function () {
  serverUtils.run(1337, function (req, res) {
    res.send(Date.now() + '');
  });
  function normalizeHost(info) {
    delete info.headers.host;
  }
  serverUtils.runNineServer(1338, {
    fixtureDir: __dirname + '/actual-files/scrub-hash',
    url: 'http://localhost:1337',
    normalizeFn: normalizeHost,
    scrubFn: function (info) {
      // DEV: We cannot replace to the same value since this is used along `normalizeFn`
      //   Instead we must have a scrambler
      if (info.request.headers.authorization) {
        info.request.headers.authorization = info.request.headers.authorization.replace(/^(Basic \w)[\w=]+$/, '$1');
      }
    }
  });
  serverUtils.runNineServer(1339, {
    fixtureDir: __dirname + '/actual-files/scrub-hash',
    url: 'http://localhost:1337',
    normalizeFn: normalizeHost
  });

  httpUtils.save('http://hello:world@localhost:1338/');
  before(function saveResponse () {
    this.firstBody = this.body;
  });
  after(function cleanup () {
    delete this.firstBody;
  });
  httpUtils.save('http://hello:world@localhost:1339/');

  it('receives a different set of results due to resolving from different keys/hashes', function () {
    expect(this.err).to.equal(null);
    expect(this.body).to.not.equal(this.firstBody);
  });
});
