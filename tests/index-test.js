import {expect} from 'chai'
import {ext, loader} from '../src/index'
const di = {agnosticAndOptional: true}

describe('xtpoint', function() {
  this.timeout(10000)


  beforeEach(() => {
    const bootstrap = (ext, di) => {
      ext.point('canada.swappable').extend({
        id: 'hot',
        index: -100,
        render: async function() {
          return 'hot'
        },
      })
      ext.point('canada.swappable').extend({
        id: 'swap',
        index: 100,
        render: async function() {
          return 'swap'
        },
      })
      ext.point('canada.eh').extend({
        id: 'igloo',
        render: function() {
          return {...arguments, di, ext}
        },
      })
      ext.point('canada.eh').extend({
        id: 'moose',
        render: function() {
          return {...arguments, di, ext}
        },
      })
      ext.point('canada.hockey').extend({
        id: 'puck',
        slapshot: function(arg1, arg2) {
          if (this && !this.propertiesInScope) {
            this.propertiesInScope = true
            return this
          }
          if (arg1 && !arg2) {
            return arg1 + 'score!'
          }
          if (arg2) {
            return arg1 + arg2 + 'scores!'
          }
          return 'score!'
        },
      })
      ext.point('canada.scope').extend({
        id: 'scope',
        thisArg: () => this,
      })

      ext.point('canada.multi').extend({
        id: 'all',
        first: function() {
          return 'first1'
        },
        second: function() {
          return {'second': true}
        },
        third: function(arg) {
          return arg
        },
        fourth: function() {
          this.speed = '0-100'
          return this
        },
        fifth: function(arg) {
          arg.wet = true
          return arg
        },
      })

      ext.point('canada.order').extend({
        id: 'one',
        index: 1,
        exec: () => 'one',
      })
      ext.point('canada.order').extend({
        id: 'two',
        index: 2,
        exec: () => 'two',
      })
      ext.point('canada.order').extend({
        id: 'three',
        index: 3,
        exec: () => 'three',
      })


      ext.point('canada.chain').extend({
        id: 'one',
        index: 1,
        exec: () => 'one',
      })
      ext.point('canada.chain').extend({
        id: 'two',
        index: 2,
        exec: (previousData) => previousData + ' two',
      })
      ext.point('canada.chain').extend({
        id: 'three',
        index: 3,
        exec: (previousData) => previousData + ' three',
      })

    }
    bootstrap(ext, di)
  })


  describe('async', () => {
    // does not work, because `exec` does not use value
    it.skip('executes async bundle of plugins', async () => {
      const bundles = ext.point('canada.swappable').exec('render')
      const values = await Promise.all(bundles.value())
      expect(values).to.eql(['hot', 'swap'])
    })
    it('invokes bundle of plugins', async () => {
      const bundles = ext.point('canada.swappable').invoke('render')
      const values = await Promise.all(bundles.value())
      expect(values).to.eql(['hot', 'swap'])
    })
    // does same as above, but promised inside
    it('invokes async bundle of plugins', async () => {
      const values = await ext.invokeAsync('canada.swappable.render')
      expect(values).to.eql(['hot', 'swap'])
    })
    it('invokes bundle of plugins without async', () => {
      const values = ext.point('canada.eh').invoke('render').value()
      expect(values[0].di).to.eql(di)
      expect(values[1].di).to.eql(di)
    })
  })


  describe('invokes', () => {
    it('invokes plugin - with context and args', () => {
      const scoped = {propertiesInScope: false}
      const readingScopeProp = ext.point('canada.hockey').invoke(scoped, 'slapshot', 'other unused argument').value()[0]
      expect(scoped.propertiesInScope).to.eq(true)
      expect(readingScopeProp.propertiesInScope).to.eq(true)
    })
    it('invokes a plugin - without context and args', () => {
      const bundles = ext.point('canada.eh').invoke('render')
      expect(typeof bundles).to.eql('object')
      expect(!!bundles._wrapped).to.eql(true)
      expect(typeof bundles.value).to.eql('function')
    })
    it('invokes plugin - with context/thisArg/scope/bound with an arrow func and fail', () => {
      const scoped = {propertiesInScope: true}
      const thisArg = ext.point('canada.scope').invoke(scoped, 'thisArg').value()
      // because it uses scope of mocha
      expect(thisArg[0].title).to.eql('xtpoint')
      expect(thisArg.propertiesInScope).to.eql(undefined)
    })

    describe('invokeAll', () => {
      it('multi fn invoke - with no context/thisArg/scope/bound - no args', () => {
        const msg = ext.invokeAll('canada.multi.first,second')
        expect(msg).to.eql(['first1', {second: true}])
      })
      it('multi fn invoke - with no thisArg - no args', () => {
        const msg = ext.invokeAll('canada.multi.first,third', 'third arg')
        expect(msg).to.eql(['first1', 'third arg'])
      })
      it('multi fn invoke - one fn - with thisArg - no args', () => {
        const scoped = {speed: 0}
        const msg = ext.invokeAll(scoped, 'canada.multi.fourth')[0]
        expect(scoped.speed).to.eql('0-100')
        expect(msg.speed).to.eql('0-100')
      })
      it('multi fn invoke - with context - with args', () => {
        const ocean = {wet: false}
        const scoped = {speed: false}
        const thisArg = ext.invokeAll(scoped, 'canada.multi.fourth,fifth', ocean)

        expect(ocean.wet).to.eql(true)
        expect(thisArg[0].speed).to.eql('0-100')
        expect(thisArg[1].wet).to.eql(true)
        expect(scoped.speed).to.eql('0-100')
      })
    })
  })


  describe('executes', () => {
    it('executes plugin - with context/thisArg/scope/bound, without args', () => {
      const scoped = {propertiesInScope: false}
      const thisArg = ext.point('canada.hockey').exec(scoped, 'slapshot')
      expect(thisArg.propertiesInScope).to.eql(true)
    })
    it('executes plugin - without context/thisArg/scope/bound, without args', () => {
      const msg = ext.point('canada.hockey').exec('slapshot')
      expect(msg).to.eql('score!')
    })
    it('executes plugin - without context/thisArg/scope/bound, with args', () => {
      const msg = ext.point('canada.hockey').exec('slapshot', 'he shoots...')
      expect(msg).to.eql('he shoots...' + 'score!')
    })
    it('executes plugin - with context/thisArg/scope/bound with an arrow func and fail', () => {
      const scoped = {propertiesInScope: true}
      const thisArg = ext.point('canada.scope').exec(scoped, 'thisArg')

      // because it uses scope of mocha
      expect(thisArg.title).to.eql('xtpoint')
      expect(thisArg.propertiesInScope).to.eql(undefined)
    })
    it('exec should pass on the values', () => {
      const values = ext.point('canada.chain').exec('exec')
      expect(values).to.eql('one two three')
    })
  })


  describe('enable disable', () => {
    it('disable id works', () => {
      ext.point('canada.hockey').disable('puck')
      const msg = ext.point('canada.hockey').exec('slapshot', 'he shoots...')
      expect(msg).to.eql(undefined)
    })
    it('enable id works', () => {
      ext.point('canada.hockey').enable('puck')
      const msg = ext.point('canada.hockey').exec('slapshot', 'he shoots...')
      expect(msg).to.eql('he shoots...' + 'score!')
    })
  })


  describe('order/index is respected', () => {
    it('one two three', () => {
      const values = ext.point('canada.order').invoke('exec').value()
      expect(values).to.eql(['one', 'two', 'three'])
    })
    it('exec would give only last value - but invoked them all', () => {
      const values = ext.point('canada.order').exec('exec')
      expect(values).to.eql('three')
    })
  })


  describe('shorthand', () => {
    it('should be able to be called as a fn', () => {
      const msg = ext('canada.hockey.slapshot', 'he shoots...')[0]
      expect(msg).to.eql('he shoots...' + 'score!')
    })
    it('should be able to be called as a fn with thisArg', () => {
      const scoped = {
        propertiesInScope: false,
      }
      const msg = ext(scoped, 'canada.hockey.slapshot', 'he shoots...')[0]
      expect(msg.propertiesInScope).to.eql(true)
    })

    it(`invokes plugin shorthand async -
      with context/thisArg/scope/bound with an arrow func and fail`, async () => {
      const scoped = {propertiesInScope: true}
      const thisArg = await ext.invokeAsync(scoped, 'canada.scope.thisArg')
      expect(thisArg[0].title).to.eql('xtpoint')
      expect(thisArg.propertiesInScope).to.eql(undefined)
    })

    it(`executes plugin shorthand - with id`, () => {
      const msg = ext.exec('canada.order.exec#two')
      expect(msg).to.eql('two')
    })
  })


  describe('loader', () => {
    it('test loader - load example folder - using loaders __webpack_require__', () => {
      const modulesContext = require.context('../example', true, /^\.\/[^\/]+?\/bundle\.js$/)
      const loaded = loader(modulesContext, null, ext, di)
      expect(loaded).to.eql(true)

      const captain = ext.point('canada.bootstrap').exec('beckonTheDeep')
      expect(captain).to.eql('bill')
    })
    it('test loader keys', () => {
      const modulesContext = require.context('../example', true, /^\.\/[^\/]+?\/bundle\.js$/)
      loader(modulesContext, null, ext, di)

      // ['canada.swappable', 'canada.eh', 'canada.hockey', 'canada.multi', 'canada.bootstrap']
      expect(ext.keys().length).to.be.at.least(1)
    })
  })


})
