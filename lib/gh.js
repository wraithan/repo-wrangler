var GitHubApi = require('github')

module.exports = GitHub

function GitHub(options) {
  if (!(this instanceof GitHub)) {
    return new GitHub(options)
  }
  options = options || {}

  this.api = new GitHubApi({
    version: '3.0.0',
    protocol: 'https'
  })

  if (typeof options.token === 'string') {
    this.api.authenticate({
      type: 'oauth',
      token: options.token
    })
  }
}

GitHub.prototype.getToken = function (username, password, otp, callback) {
  var headers = {}
  if (otp !== undefined) {
    console.log('added otp header: %s', otp)
    headers = {'X-GitHub-OTP': otp}
  }

  this.api.authenticate({
    type: 'basic',
    username: username,
    password: password
  })

  this.api.authorization.create({
    scopes: ['admin:repo_hook'],
    note: 'repo-wrangler',
    note_url: 'https://github.com/wraithan/repo-wrangler',
    headers: headers
  }, function (err, res) {
    logger(null, res)
    if (err) {
      callback(err)
    } else if (res.token) {
      callback(null, res.token)
    }
  })
}

GitHub.prototype.getRepos = function (user, callback) {
  var self = this
  var repos = []
  this.api.repos.getFromUser({
    user: user,
    per_page: 100,
    sort: 'created'}, collectRepos)
  function collectRepos (err, res) {
    logger(null, res)
    if (err) {
      callback(err)
    } else {
      res.forEach(function (repo) {
        repos.push({
          user: repo.full_name.replace('/' + repo.name, ''),
          repo: repo.name
        })
      })
      if (self.api.hasNextPage(res)) {
        self.api.getNextPage(res, collectRepos)
      } else {
        callback(null, repos)
      }
    }
  }
}

GitHub.prototype.createHook = function(user, repo, url) {
  var self = this
  this.api.repos.getHooks({
    user: user,
    repo: repo
  }, function (err, hooks) {
    logger(err, hooks)

    var inFlight = 0

    hooks.forEach(function (hook) {
      if (hook.name === 'web') {
        self.api.repos.deleteHook({
          user: user,
          repo: repo,
          id: hook.id
        }, function (err, res) {
          logger(err, res)
          inFlight -= 1
        })
        inFlight += 1
      }
    })

    create()

    function create () {
      if (inFlight !== 0) {
        setImmediate(create)
      } else {
        self.api.repos.createHook({
          user: user,
          repo: repo,
          name: 'web',
          events: ['*'],
          config: {url: url},
          active: true
        }, logger)
      }
    }

  })

}

function logger(err, res) {
  if (err) {
    console.log(err)
  }
  if (res && res.meta && res.meta['x-ratelimit-remaining']) {
    console.log('%s remaining API calls', res.meta['x-ratelimit-remaining'])
  } else {
    console.dir(res)
  }
}