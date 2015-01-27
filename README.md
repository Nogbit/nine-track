# nine-track [![Build status](https://travis-ci.org/twolfson/nine-track.png?branch=master)](https://travis-ci.org/twolfson/nine-track)

Record and playback HTTP requests

This is built to make testing against third party services a breeze. No longer will your test suite fail because an external service is down.

> `nine-track` is inspired by [`cassette`][] and [`vcr`][]. This is a fork of [`nine-track`][] due to permissioning issues.

[`cassette`]: https://github.com/uber/cassette
[`vcr`]: https://rubygems.org/gems/vcr

## Getting Started
Install the module with: `npm install nine-track`

```js
// Start up a basic applciation
var express = require('express');
var nineTrack = require('nine-track');
var request = require('request');
express().use(function (req, res) {
  console.log('Pinged!');
  res.send('Hello World!');
}).listen(1337);

// Create a server using a `nine-track` middleware to the original
express().use(nineTrack({
  url: 'http://localhost:1337',
  fixtureDir: 'directory/to/save/responses'
})).listen(1338);

// Hits original server, triggering a `console.log('Pinged!')` and 'Hello World!' response
request('http://localhost:1338/', console.log);

// Hits saved response but still receieves 'Hello World!' response
request('http://localhost:1338/', console.log);
```

## Documentation
`nine-track` exposes `nineTrack` as its `module.exports`.

### `nineTrack(options)`
Middleware creator for new `nineTrack's`. This *is not* a constructor.

- options `Object` - Container for parameters
    - url `String|Object` - URL of a server to proxy to
        - If it is a string, it should be the base URL of a server
        - If it is an object, it should be parameters for [`url.format`][]
    - fixtureDir `String` - Path to load/save HTTP responses
        - Files will be saved with the format `{{method}}_{{encodedUrl}}_{{hashOfRequestContent}}.json`
        - An example filename is `GET_%2F_658e61f2a6b2f1ae4c127e53f28dfecd.json`
    - normalizeFn `Function` - Function to adjust `request's` save location signature
        - If you would like to make two requests resolve from the same response file, this is how.
        - The function signature should be `function (info)` and can either mutate the `info` or return a fresh object
        - `info` will have the following properties
             - httpVersion `String` - HTTP version received from `request` (e.g. `1.0`, `1.1`)
             - headers `Object` - Headers received by `request`
             - trailers `Object` - Trailers received by `request`
             - method `String` - HTTP method that was used (e.g. `GET`, `POST`)
             - url `String` - Pathname that `request` arrived from
             - body `Buffer` - Buffered body that was written to `request`
        - Existing `normalizeFn` libraries (e.g. `multipart/form-data` can be found below)

[`url.format`]: http://nodejs.org/api/url.html#url_url_format_urlobj

`nineTrack` returns a middleware with the signature `function (req, res)`

```js
// Example of string url
nineTrack({
  url: 'http://localhost:1337',
  fixtureDir: 'directory/to/save/responses'
});

// Example of object url
nineTrack({
  url: {
    protocol: 'http:',
    hostname: 'localhost',
    port: 1337
  },
  fixtureDir: 'directory/to/save/responses'
});
```

If you need to buffer the data before passing it off to `nine-track` that is supported as well.
The requirement is that you record the data as a `Buffer` or `String` to `req.body`.

#### `normalizeFn` libraries
- `multipart/form-data` - Ignore randomly generated boundaries and consolidate similar `multipart/form-data` requests
    - Website: https://github.com/twolfson/nine-track-normalize-multipart

### `nineTrack.forwardRequest(req, cb)`
Forward an incoming HTTP request in a [`mikeal/request`][]-like format.

- req `http.IncomingMessage` - Inbound request to an HTTP server (e.g. from `http.createServer`)
    - Documentation: http://nodejs.org/api/http.html#http_http_incomingmessage
- cb `Function` - Callback function with `(err, res, body)` signature
    - err `Error` - HTTP error if any occurred (e.g. `ECONNREFUSED`)
    - res `Object` - Container that looks like an HTTP object but simiplified due to saving to disk
        - httpVersion `String` - HTTP version received from external server response (e.g. `1.0`, `1.1`)
        - headers `Object` - Headers received by response
        - trailers `Object` - Trailers received by response
        - statusCode `Number` - Status code received from external server response
        - body `Buffer` - Buffered body that was written to response
    - body `Buffer` - Sugar variable for `res.body`

[`mikeal/request`]: https://github.com/mikeal/request

## Examples
### Proxy server with subpath
`nine-track` can talk to servers that are behind a specific path

```js
// Start up a server that echoes our path
express().use(function (req, res) {
  res.send(req.path);
}).listen(1337);

// Create a server using a `nine-track` middleware to the original
express().use(nineTrack({
  url: 'http://localhost:1337/hello',
  fixtureDir: 'directory/to/save/responses'
})).listen(1338);

// Logs `/hello/world`, concatenated result of `/hello` and `/world` pathss
request('http://localhost:1338/world', console.log);
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm run lint` and test via `npm test`.

## License
All work up to and including `87a024b` is owned by Uber under the [MIT license][].

[MIT license]: https://github.com/twolfson/nine-track/blob/87a024ba47584311dc3d5bc10e11682c1fbd7bdf/LICENSE-MIT

After that commit, all modifications to the work have been released under the [UNLICENSE][] to the public domain.

[UNLICENSE]: UNLICENSE
