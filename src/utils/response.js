const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res, message, code, status = 400) =>
  res.status(status).json({ success: false, message, code });

module.exports = { ok, fail };
