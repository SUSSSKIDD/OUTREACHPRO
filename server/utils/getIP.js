module.exports = function getIP(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  };
  