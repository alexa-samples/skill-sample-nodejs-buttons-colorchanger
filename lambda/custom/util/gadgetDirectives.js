'use strict';
           
const requiredParam = function (param) {
  const requiredParamError = new Error(
   `Required parameter, "${param}" is missing.`
  )
  // preserve original stack trace
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(
      requiredParamError, 
      requiredParam
    )
  }
  throw requiredParamError;
};

var gadgetDirectives = {
    // returns a StartInputHandler directive that can be added to an Alexa skill response
    'startInputHandler': function({
        timeout = requiredParam('timeout'),
        proxies,
        maximumHistoryLength,
        recognizers = requiredParam('recognizers'), 
        events = requiredParam('events')
    } = {}, params) {
        return {
            "type": "GameEngine.StartInputHandler",
            "timeout": (params && params.timeout) || timeout,
            "maximumHistoryLength": (params && params.maximumHistoryLength) || maximumHistoryLength,
            "proxies": (params && params.proxies) || proxies,
            "recognizers": (params && params.recognizers) || recognizers,
            "events": (params && params.events) || events,
        };
    },

    // returns a StopInputHandler directive that can be added to an Alexa skill response
    'stopInputHandler': function({
        id = requiredParam('id')
    } = {}) {
        return {
            "type": "GameEngine.StopInputHandler",
            "originatingRequestId": id
        };
    },

    // returns a SetLight directive, with a 'buttonDown' trigger, that can be added to an Alexa skill response
    'setButtonDownAnimation': function({
        targetGadgets = [],
        animations = requiredParam('animations'),
        triggerEventTimeMs = 0
    } = {}, params) {
        return {
            "type": "GadgetController.SetLight",
            "version": 1,
            "targetGadgets": (params && params.targetGadgets) || targetGadgets,
            "parameters": {
                "animations": (params && params.animations) || animations,
                "triggerEvent": "buttonDown",
                "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
            }
        };
    },

    // returns a SetLight directive, with a 'buttonUp' trigger, that can be added to an Alexa skill response
    'setButtonUpAnimation': function({
        targetGadgets = [],
        animations = requiredParam('animations'),
        triggerEventTimeMs = 0
    } = {}, params) {
        return {
            "type": "GadgetController.SetLight",
            "version": 1,
            "targetGadgets": (params && params.targetGadgets) || targetGadgets,
            "parameters": {
                "animations": (params && params.animations) || animations,
                "triggerEvent": "buttonUp",
                "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
            }
        };
    },
    
    // returns a SetLight directive, with a 'none' trigger, that can be added to an Alexa skill response
    'setIdleAnimation': function({
        targetGadgets = [],
        animations = requiredParam('animations'),
        triggerEventTimeMs = 0
    } = {}, params) {
        return {
            "type": "GadgetController.SetLight",
            "version": 1,
            "targetGadgets": (params && params.targetGadgets) || targetGadgets,
            "parameters": {
                "animations": (params && params.animations) || animations,
                "triggerEvent": "none",
                "triggerEventTimeMs": (params && params.triggerEventTimeMs) || triggerEventTimeMs,
            }
        };
    }


};

module.exports = gadgetDirectives;