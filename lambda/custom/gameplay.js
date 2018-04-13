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

const Alexa = require('alexa-sdk');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants 
const Settings = require('settings.js');


    
// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers
const DIRECT_BUTTON_DOWN_RECOGNIZER = {
    "button_down_recognizer": {
        "type": "match",
        "fuzzy": false,
        "anchor": "end",
        "pattern": [{
                "action": "down"
            }
        ]
    }
};

// Define named events based on the DIRECT_BUTTON_DOWN_RECOGNIZER and the built-in "timed out" recognizer
// to report back to the skill when either of the two buttons in play was pressed and eventually when the
// input handler times out
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const DIRECT_MODE_EVENTS = {
    "button_down_event": {
        "meets": ["button_down_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": false
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};


// ***********************************************************************
//   PLAY_MODE Handlers
//     set up handlers for events that are specific to the Play mode
//     after the user registered the buttons - this is the main mode
// ***********************************************************************
module.exports = Alexa.CreateStateHandler(Settings.SKILL_STATES.PLAY_MODE, {

    'colorIntent': function() {
        console.log("playModeIntentHandlers::colorIntent");

        const uColor = this.event.request.intent.slots.color.value;
        console.log("User color: " + uColor);        

        if (uColor === undefined || Settings.COLORS_ALLOWED.indexOf(uColor) == -1) {
            this.emit('GlobalHelpHandler');
        } else {
            this.attributes.ColorChoice = uColor;

            // Build Start Input Handler Directive
            this.response._addDirective(GadgetDirectives.startInputHandler({ 
                'timeout': 30000, 
                'recognizers': DIRECT_BUTTON_DOWN_RECOGNIZER, 
                'events': DIRECT_MODE_EVENTS 
            } ));

            // Save Input Handler Request ID
            this.attributes.CurrentInputHandlerID = this.event.request.requestId;
            console.log("Current Input Handler ID: " + this.attributes.CurrentInputHandlerID);

            let deviceIds = this.attributes.DeviceIDs;
            deviceIds = deviceIds.slice(-2);

            // Build 'idle' breathing animation, based on the users color of choice, that will play immediately
            this.response._addDirective(GadgetDirectives.setIdleAnimation({ 
                'targetGadgets': deviceIds, 
                'animations': BasicAnimations.BreatheAnimation(30, Settings.BREATH_CUSTOM_COLORS[uColor], 450) 
            } ));

            // Build 'button down' animation, based on the users color of choice, for when the button is pressed
            this.response._addDirective(GadgetDirectives.setButtonDownAnimation({ 
                'targetGadgets': deviceIds, 
                'animations': BasicAnimations.SolidAnimation(1, uColor, 2000) 
            } ));

            // build 'button up' animation, based on the users color of choice, for when the button is released
            this.response._addDirective(GadgetDirectives.setButtonUpAnimation({ 
                'targetGadgets': deviceIds, 
                'animations': BasicAnimations.SolidAnimation(1, uColor, 200) 
            } ));

            const outputSpeech = "Ok. " + uColor + " it is. When you press a button, it will now turn " + uColor + ". "
                + "Pressing the button will also interrupt me if I'm speaking or playing music. I'll keep talking so you can interrupt me. Go ahead and try it. "
                + Settings.WAITING_AUDIO;

            this.response.speak(outputSpeech);
            
            this.emit('GlobalResponseReady', { 'openMicrophone': false }); 
        }
    },
    'InputHandlerEvent.timeout': function() {
        console.log("playModeIntentHandlers::InputHandlerEvent::timeout");

        // The color the user chose
        const uColor = this.attributes.ColorChoice;
        const outputSpeech = "The input handler has timed out. That concludes our test, would you like to quit?";
        const reprompt = "Would you like to exit? Say Yes to exit, or No to keep going";
        this.response.speak(outputSpeech).listen(reprompt);                                    

        let deviceIds = this.attributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);
        // play a custom FadeOut animation, based on the user's selected color
        this.response._addDirective(GadgetDirectives.setIdleAnimation({ 
            'targetGadgets': deviceIds, 
            'animations': BasicAnimations.FadeOutAnimation(1, uColor, 2000) 
        }));
        // Reset button animation for skill exit
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(Settings.DEFUALT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(Settings.DEFUALT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));

        // Set Skill End flag
        this.attributes.expectingEndSkillConfirmation = true;
        this.handler.state = Settings.SKILL_STATES.EXIT_MODE;
                            
        this.emit('GlobalResponseReady', { 'openMicrophone': true }); 
    },
    'InputHandlerEvent.button_down_event': function({ buttonId } = {}) {
        console.log("playModeIntentHandlers::InputHandlerEvent::button_down_event");
        
        let deviceIds = this.attributes.DeviceIDs;
        let outputSpeech = "";

        // Checks for Invalid Button ID
        if (deviceIds.indexOf(buttonId) == -1) {
            console.log("Button event received for gadget that was not registered during roll call.");
            // Don't send any directives back to Alexa for invalid Button ID Events
            outputSpeech = "Unregistered button. Only buttons registered during roll call are in play. "
                         + Settings.WAITING_AUDIO;
        } else {
            var buttonNo = deviceIds.indexOf(buttonId);
            outputSpeech = "button " + buttonNo + ". " + Settings.WAITING_AUDIO;            
        }
        this.response.speak(outputSpeech);
        
        this.emit('GlobalResponseReady', { 'openMicrophone': false });        
    },
    'GameEngine.InputHandlerEvent': function() {
        console.log("playModeIntentHandlers::InputHandlerEvent");
        if (this.event.request.originatingRequestId != this.attributes.CurrentInputHandlerID) {
            console.log("Stale input event received. Ignoring!");
            
            this.emit('GlobalResponseReady', { 'openMicrophone': false });
            return;
        }

        let gameEngineEvents = this.event.request.events || [];
        for (var i = 0; i < gameEngineEvents.length; i++) {            
            // GameEngine.InputHandlerEvent requests may contain one or more input events
            // depending on the state of the recognizers defined for the active Input Handler 
            switch (gameEngineEvents[i].name) {
                case 'button_down_event':
                    this.emit('InputHandlerEvent.button_down_event' + Settings.SKILL_STATES.PLAY_MODE, { 
                        // pass the id of the button that triggered the event
                        'buttonId': gameEngineEvents[i].inputEvents[0].gadgetId 
                    });
                    return;
                
                case 'timeout':                    
                    this.emit('InputHandlerEvent.timeout' + Settings.SKILL_STATES.PLAY_MODE);
                    return;
            }
        }
    },
    'AMAZON.StopIntent': function() {
        this.emit('GlobalStopHandler');
    },
    'AMAZON.CancelIntent': function() {
        this.emit('GlobalStopHandler');
    },
    'AMAZON.HelpIntent': function() {
        this.emit('GlobalHelpHandler');
    },
    'Unhandled': function() {
        console.log("playModeIntentHandlers::Unhandled");      
        this.emit('GlobalDefaultHandler');
    }
});