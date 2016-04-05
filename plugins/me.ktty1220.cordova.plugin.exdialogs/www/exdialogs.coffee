exec = require 'cordova/exec'

PLUGIN = 'ExDialogs'

defaultFail = (e) -> console.error e

checkSelectArgs = (fail, items, title, icon, sinit, minit) ->
  return fail new Error('items is not Array') if not (items instanceof Array)
  return fail new Error('items length is 0') if items.length is 0
  title = (title ? '').toString()
  icon = (icon ? '').toString()
  sinit ?=  0
  minit ?=  []
  minit = [ minit ] if not (minit instanceof Array)
  minit.push false for i in [ 0 ... items.length - minit.length ]
  fail: fail ? defaultFail
  args: [ items, title, icon, sinit, minit ]

module.exports =
  selectPlain: (win, fail, items, title, icon) ->
    a = checkSelectArgs fail, items, title, icon
    cordova.exec win, a.fail, PLUGIN, 'selectPlain', a.args
  selectSingle: (win, fail, items, init, title, icon) ->
    a = checkSelectArgs(fail, items, title, icon, init)
    cordova.exec win, a.fail, PLUGIN, 'selectSingle', a.args
  selectMulti: (win, fail, items, init, title, icon) ->
    a = checkSelectArgs fail, items, title, icon, null, init
    cordova.exec win, a.fail, PLUGIN, 'selectMulti', a.args
  progressStart: (win, fail, message, title, max = 100) ->
    cordova.exec win, fail ? defaultFail, PLUGIN, 'progressStart', [ message, title, max ]
  progressValue: (value, message) ->
    cordova.exec null, null, PLUGIN, 'progressValue', [ value, message ]
  progressStop: () ->
    cordova.exec null, null, PLUGIN, 'progressStop', []
  toast: (message) ->
    cordova.exec null, null, PLUGIN, 'toast', [ message ]
  textArea: (message, win, title, line = 5) ->
    cordova.exec win, null, PLUGIN, 'textArea', [ message, title, line ]
