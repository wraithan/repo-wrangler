var fs = require('fs')
var gh = require('./lib/gh')
var config = require('./config')
var username = process.argv[2]
var password = process.argv[3]
var otp = process.argv[4]
var token = config.token

require('http').globalAgent.maxSockets = 1000

if (!token) {
  var github = gh()
  github.getToken(username, password, otp, function (err, newToken) {
    if (err) {
      throw err
    }
    token = newToken
    config.token = newToken
    fs.writeFile('./config.json', JSON.stringify(config, null, 2))
    start(github)
  })
} else {
  var github = gh({
    token: token
  })
  process.nextTick(function () {
    start(github)
  })
}

function start (github) {
  github.getRepos('wraithan', function (err, repos) {
    if (err) {
      throw err
    }
    repos.forEach(function (data) {
      github.createHook(data.user, data.repo, 'http://bot.wraithan.net/github')
    })

  })
}
