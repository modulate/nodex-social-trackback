/* global describe, it, expect */

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var factory = require('../../../app/http/handlers/ping');


describe('http/handlers/ping', function() {
  
  it('should export factory function', function() {
    expect(factory).to.be.a('function');
  });
  
  it('should be annotated', function() {
    expect(factory['@implements']).to.be.undefined;
    expect(factory['@singleton']).to.be.undefined;
  });
  
  describe('handler', function() {
    var linkbacks = {
      ping: function(){}
    };
    
    function parse(type) {
      return function(req, res, next) {
        req.__ = req.__ || {};
        req.__.supportedMediaType = type;
        next();
      };
    }
    
    function authenticate(method) {
      return function(req, res, next) {
        req.authInfo = { method: method };
        next();
      };
    }
    
    function errorLogging() {
      return function(err, req, res, next) {
        req.__ = req.__ || {};
        req.__.log = req.__.log || [];
        req.__.log.push(err.message);
        next(err);
      }
    }
    
    
    describe('processing a ping', function() {
      var request, response;
      
      before(function() {
        sinon.stub(linkbacks, 'ping').yields(null);
      });
    
      after(function() {
        linkbacks.ping.restore();
      });
      
      before(function(done) {
        var handler = factory(linkbacks, parse, /*authenticate,*/ errorLogging);
        
        chai.express.handler(handler)
          .req(function(req) {
            request = req;
            req.params = [ '5' ];
            req.body = {
              url: 'http://www.bar.com/'
            }
          })
          .res(function(res) {
            response = res;
          })
          .end(function() {
            done();
          })
          .dispatch();
      });
      
      it('should parse request body', function() {
        expect(request.__.supportedMediaType).to.equal('application/x-www-form-urlencoded');
      });
      
      it.skip('should authenticate', function() {
        expect(request.authInfo).to.deep.equal({
          method: [ 'anonymous' ]
        });
      });
      
      it('should ping linkback service', function() {
        expect(linkbacks.ping.callCount).to.equal(1);
        var call = linkbacks.ping.getCall(0)
        expect(call.args[0]).to.equal('http://www.bar.com/');
        expect(call.args[1]).to.equal('http://www.example.com/5');
      });
      
      it('should respond', function() {
        expect(response.statusCode).to.equal(200);
        expect(response.getHeader('Content-Type')).to.equal('application/xml')
        expect(response.data).to.equal('<?xml version="1.0" encoding="utf-8"?>\n<response>\n  <error>0</error>\n</response>');
      });
    }); // processing a ping
    
    describe('encountering an error processing a ping', function() {
      var request, response;
      
      before(function() {
        sinon.stub(linkbacks, 'ping').yields(new Error('something went wrong'));
      });
    
      after(function() {
        linkbacks.ping.restore();
      });
      
      before(function(done) {
        var handler = factory(linkbacks, parse, /*authenticate,*/ errorLogging);
        
        chai.express.handler(handler)
          .req(function(req) {
            request = req;
            req.params = [ '5' ];
            req.body = {
              url: 'http://www.bar.com/'
            }
          })
          .res(function(res) {
            response = res;
          })
          .end(function() {
            done();
          })
          .dispatch();
      });
      
      it('should parse request body', function() {
        expect(request.__.supportedMediaType).to.equal('application/x-www-form-urlencoded');
      });
      
      it.skip('should authenticate', function() {
        expect(request.authInfo).to.deep.equal({
          method: [ 'anonymous' ]
        });
      });
      
      it('should ping linkback service', function() {
        expect(linkbacks.ping.callCount).to.equal(1);
        var call = linkbacks.ping.getCall(0)
        expect(call.args[0]).to.equal('http://www.bar.com/');
        expect(call.args[1]).to.equal('http://www.example.com/5');
      });
      
      it('should log error', function() {
        expect(request.__.log).to.deep.equal([ 'something went wrong' ]);
      });
      
      it('should respond', function() {
        expect(response.statusCode).to.equal(500);
        expect(response.getHeader('Content-Type')).to.equal('application/xml')
        expect(response.data).to.equal('<?xml version="1.0" encoding="utf-8"?>\n<response>\n  <error>1</error>\n  <message>something went wrong</message>\n</response>');
      });
    }); // encountering an error processing a ping
    
  }); // handler
  
});
