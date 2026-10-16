// CloudFront Function (viewer request, runtime cloudfront-js-2.0).
// S3 behind Origin Access Control has no index documents, so map
// Hugo's pretty URLs to the objects it actually writes:
//   /            -> /index.html
//   /posts/foo/  -> /posts/foo/index.html
//   /posts/foo   -> /posts/foo/index.html
//   /index.xml   -> unchanged (has an extension)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
