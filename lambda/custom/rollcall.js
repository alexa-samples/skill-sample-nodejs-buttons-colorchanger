/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

const Alexa = require('ask-sdk-core');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');


// Define some animations that we'll use during roll call, to be played in various situations,
// such as when buttons "check in" during roll call, or after both buttons were detected. 
// See: https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate
const ROLL_CALL_ANIMATIONS = {
    'RollCallComplete': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeInAnimation(1, "green", 5000)
    },
    'ButtonCheckInIdle': {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "green", 8000)
    },
    'ButtonCheckInDown' : {
        'targetGadgets': [],
        'animations': BasicAnimations.SolidAnimation(1, "green", 1000)
    },
    'ButtonCheckInUp': {                     
        'targetGadgets': [], 
        'animations': BasicAnimations.SolidAnimation(1, "white", 4000)
    },
    'Timeout': {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeAnimation("black", 1000)
    }
};

// Define two recognizers that will capture the first time each of two arbitrary buttons is pressed. 
//  We'll use proxies to refer to the two different buttons because we don't know ahead of time 
//  which two buttons will be used (see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#proxies)
// The two recogniziers will be used as triggers for two input handler events, used during roll call. 
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers
const ROLL_CALL_RECOGNIZERS = {
    "roll_call_first_button_recognizer": {
        "type": "match",
        "fuzzy": false,
        "anchor": "end",
        "pattern": [{
                "gadgetIds": [ "first_button" ],
                "action": "down"
            }
        ]
    },
    "roll_call_second_button_recognizer": {
        "type": "match",
        "fuzzy": true,
        "anchor": "end",
        "pattern": [
            {
                "gadgetIds": [ "first_button" ],
                "action": "down"
            },
            {
                "gadgetIds": [ "second_button" ],
                "action": "down"
            }]
    }
};

// Define named events based on the ROLL_CALL_RECOGNIZERS and the built-in "timed out" recognizer
// to report back to the skill when the first button checks in, when the second button checks in,
// as well as then the input handler times out, if this happens before two buttons checked in. 
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const ROLL_CALL_EVENTS = {
    "first_button_checked_in": {
        "meets": ["roll_call_first_button_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": false,
        "maximumInvocations": 1
    },
    "second_button_checked_in": {
        "meets": ["roll_call_second_button_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": true,
        "maximumInvocations": 1
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};


// ***********************************************************************
//   ROLL_CALL_MODE Handlers
//     set up handlers for events that are specific to the Roll Call mode
// ***********************************************************************
const RollCall = {
    NewSession: function(handlerInput) {
        console.log("RollCall::NewSession");
        
        const ctx = handlerInput.attributesManager.getRequestAttributes();

         // setup the output speech that Alexa should speak when roll call is stared, 
         // after the skill is first launched 
         ctx.outputSpeech = ["Welcome to the Color Changer skill."];
         ctx.outputSpeech.push("This skill provides a brief introduction to the core");
         ctx.outputSpeech.push("functionality that every Echo Button skill should have.");
         ctx.outputSpeech.push("We'll cover roll call, starting and stopping the Input Handler,");
         ctx.outputSpeech.push("button events and Input Handler timeout events. ");
         ctx.outputSpeech.push("Let's get started with roll call. ");
         ctx.outputSpeech.push("Roll call wakes up the buttons to make sure");
         ctx.outputSpeech.push("they're connected and ready for play. ");
         ctx.outputSpeech.push("Ok. Press the first button and wait for confirmation");
         ctx.outputSpeech.push("before pressing the second button.");        

         ctx.timeout = 50000;
         
         ctx.openMicrophone = true;
         return RollCall.StartRollCall(handlerInput);
    },
    StartRollCall: function(handlerInput) {
        console.log("RollCall::StartRollCall");
        const { attributesManager } = handlerInput;        
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
 
        console.log("RollCall::StartRollCall -> timeout = " + ctx.timeout);
        // add a StartInputHandler directive using the ROLL_CALL recognizers and events
        ctx.directives.push(GadgetDirectives.startInputHandler({ 
            'timeout': ctx.timeout, 
            'proxies': ['first_button', 'second_button'],
            'recognizers': ROLL_CALL_RECOGNIZERS, 
            'events': ROLL_CALL_EVENTS 
        }));
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            ROLL_CALL_ANIMATIONS.ButtonCheckInDown));                            
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            ROLL_CALL_ANIMATIONS.ButtonCheckInUp));   
 
        // start keeping track of some state
        // see: https://developer.amazon.com/docs/gadget-skills/save-state-echo-button-skill.html
        sessionAttributes.buttonCount = 0;
        sessionAttributes.isRollCallComplete = false;
        sessionAttributes.expectingEndSkillConfirmation = false;
        // setup an array of DeviceIDs to hold IDs of buttons that will be used in the skill
        sessionAttributes.DeviceIDs = [];        
        sessionAttributes.DeviceIDs[0] = "Device ID listings";
        // Save StartInput Request ID
        sessionAttributes.CurrentInputHandlerID = handlerInput.requestEnvelope.request.requestId;
 
        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    },     
     
    HandleFirstButtonCheckIn: function(handlerInput) {
        console.log("RollCall::InputHandlerEvent::first_button_checked_in");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        console.log("RollCall:: request attributes  = " + JSON.stringify(ctx, null, 2));

        // just in case we ever get this event, after the `second_button_checked_in` event
        //  was already handled, we check the make sure the `buttonCount` attribute is set to 0;
        //   if not, we will silently ignore the event
        if (sessionAttributes.buttonCount === 0) {                        
            // Say something when we first encounter a button
            ctx.outputSpeech = ['Hello, button 1.'];
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);

            let fistButtonId = ctx.gameInputEvents[0].gadgetId;
            ctx.directives.push(GadgetDirectives.setIdleAnimation(
                ROLL_CALL_ANIMATIONS.ButtonCheckInIdle, { 'targetGadgets': [fistButtonId] } ));
            
            sessionAttributes.DeviceIDs[1] = fistButtonId;
            sessionAttributes.buttonCount = 1;
        }
         
        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    },    
    HandleSecondButtonCheckIn: function(handlerInput) {
        console.log("RollCall::InputHandlerEvent::second_button_checked_in");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const gameInputEvents = ctx.gameInputEvents;
        console.log("RollCall::InputHandlerEvent::second_button_checked_in");
        
        ctx.reprompt = ["Please pick a color: green, red, or blue"];
        ctx.outputSpeech = [];

        if (sessionAttributes.buttonCount == 0) {
            // just got both buttons at the same time
            ctx.outputSpeech.push("hello buttons 1 and 2");
            ctx.outputSpeech.push("<break time='1s'/>");
            ctx.outputSpeech.push("Awesome!");

            sessionAttributes.DeviceIDs[1] = gameInputEvents[0].gadgetId;
            sessionAttributes.DeviceIDs[2] = gameInputEvents[1].gadgetId;

        } else {
            // already had button 1, just got button 2..
            ctx.outputSpeech.push("hello, button 2");
            ctx.outputSpeech.push("<break time='1s'/>");
            ctx.outputSpeech.push("Awesome. I've registered two buttons.");

            if (sessionAttributes.DeviceIDs.indexOf(inputEvents[0].gadgetId) === -1) {
                sessionAttributes.DeviceIDs[2] = gameInputEvents[0].gadgetId;
            } else {
                sessionAttributes.DeviceIDs[2] = gameInputEvents[1].gadgetId;
            }                        
        }
        sessionAttributes.buttonCount = 2;
        
        // .. and ask use to pick a color for the next stage of the skill 
        ctx.outputSpeech.push("Now let's learn about button events.");
        ctx.outputSpeech.push("Please select one of the following colors: red, blue, or green.");                                  
            
        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);

        // send an idle animation to registered buttons
        ctx.directives.push(GadgetDirectives.setIdleAnimation(
            ROLL_CALL_ANIMATIONS.RollCallComplete, { 'targetGadgets': deviceIds } ));
        // reset button press animations until the user chooses a color
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonDown));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonUp));
    
        sessionAttributes.isRollCallComplete = true;
        sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;

        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    },
    HandleTimeout: function(handlerInput) {
        console.log("rollCallModeIntentHandlers::InputHandlerEvent::timeout");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();        

        ctx.outputSpeech = ["For this skill we need two buttons."];
        ctx.outputSpeech.push("Would you like more time to press the buttons?");
        ctx.reprompt = ["Say yes to go back and add buttons, or no to exit now."];
 
        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);
 
        ctx.directives.push(GadgetDirectives.setIdleAnimation(
            ROLL_CALL_ANIMATIONS.Timeout, { 'targetGadgets': deviceIds } ));                    
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            DEFAULT_ANIMATIONS.ButtonDown, { 'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            DEFAULT_ANIMATIONS.ButtonUp, { 'targetGadgets': deviceIds } ));

        sessionAttributes.expectingEndSkillConfirmation = true;

        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    }  
};

module.exports = RollCall;