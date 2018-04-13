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
module.exports = Alexa.CreateStateHandler(Settings.SKILL_STATES.ROLL_CALL_MODE, {
    'LaunchRequest': function() { 
        // on LaunchRequest, pass control over to the `NewSession` event handler (which in turn passes control to `StartRollCall`)      
        this.emit('NewSession');
    },
    'NewSession': function(outputSpeech) {
        console.log("rollCallModeIntentHandlers::NewSession");

        // setup the output speech that Alexa should speak when roll call is stared, after the skill is first launched 
        const welcomeMessage = "Welcome to the Color Changer skill. "
            + "This skill provides a brief introduction to the core functionality that every Echo Button skill should have. "
            + "We'll cover roll call, starting and stopping the Input Handler, button events and Input Handler timeout events. "
            + "Let's get started with roll call. "
            + "Roll call wakes up the buttons to make sure they're connected and ready for play. "
            + "Ok. Press the first button and wait for confirmation before pressing the second button.";        

        // pass control over to the StartRollCall event handler
        this.emit('StartRollCall', {
            'outputSpeech': welcomeMessage + Settings.WAITING_AUDIO, 
            'timeout': 50000
        });
    },
    'StartRollCall': function({ outputSpeech, timeout = 50000 }) {
        console.log("rollCallModeIntentHandlers::StartRollCall");

        this.response.speak(outputSpeech);

        // add a StartInputHandler directive using the ROLL_CALL recognizers and events
        this.response._addDirective(GadgetDirectives.startInputHandler({ 
            'timeout': timeout, 
            'proxies': ['first_button', 'second_button'],
            'recognizers': ROLL_CALL_RECOGNIZERS, 
            'events': ROLL_CALL_EVENTS 
        }));
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(ROLL_CALL_ANIMATIONS.ButtonCheckInDown));                            
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(ROLL_CALL_ANIMATIONS.ButtonCheckInUp));   
        
        // start keeping track of some state
        // see: https://developer.amazon.com/docs/gadget-skills/save-state-echo-button-skill.html
        this.attributes.buttonCount = 0;
        this.attributes.isRollCallComplete = false;
        this.attributes.expectingEndSkillConfirmation = false;
        // setup an array of DeviceIDs to hold IDs of buttons that will be used in the skill
        this.attributes.DeviceIDs = [];        
        this.attributes.DeviceIDs[0] = "Device ID listings";
        // Save StartInput Request ID
        this.attributes.CurrentInputHandlerID = this.event.request.requestId;

        this.emit('GlobalResponseReady', { 'openMicrophone': false });
    },
    'InputHandlerEvent.first_button_checked_in': function({
        inputEvents = []
    } = {}) {
        console.log("rollCallModeIntentHandlers::InputHandlerEvent::first_button_checked_in");

        // just in case we ever get this event, after the `second_button_checked_in` event was already handled
        // we check the make sure the `buttonCount` attribute is set to 0; if not, we will silently ignore the event
        if (this.attributes.buttonCount === 0) {                        
            // Say something when we first encounter a button
            const outputSpeech = 'hello, button 1' + Settings.WAITING_AUDIO;
            
            let fistButtonId = inputEvents[0].gadgetId;
            this.response._addDirective(GadgetDirectives.setIdleAnimation(ROLL_CALL_ANIMATIONS.ButtonCheckInIdle, { 'targetGadgets': [fistButtonId] } ));
            this.response.speak(outputSpeech);

            this.attributes.DeviceIDs[1] = fistButtonId;
            this.attributes.buttonCount = 1;
        }

        this.emit('GlobalResponseReady', { 'openMicrophone': false });
    },
    'InputHandlerEvent.second_button_checked_in': function({
        inputEvents = []
    } = {}) {
        console.log("rollCallModeIntentHandlers::InputHandlerEvent::second_button_checked_in");
        
        const reprompt = "Please pick a color: green, red, or blue";
        let outputSpeech = "";

        if (this.attributes.buttonCount == 0) {
            // just got both buttons at the same time
            outputSpeech = "hello buttons 1 and 2 <break time='1s'/> Awesome! "

            this.attributes.DeviceIDs[1] = inputEvents[0].gadgetId;
            this.attributes.DeviceIDs[2] = inputEvents[1].gadgetId;

        } else {
            // already had button 1, just got button 2..
            outputSpeech = 'hello, button 2' + "<break time='1s'/> Awesome. I've registered two buttons. ";

            if (this.attributes.DeviceIDs.indexOf(inputEvents[0].gadgetId) === -1) {
                this.attributes.DeviceIDs[2] = inputEvents[0].gadgetId;
            } else {
                this.attributes.DeviceIDs[2] = inputEvents[1].gadgetId;
            }                        
        }
        this.attributes.buttonCount = 2;
        
        // .. and ask use to pick a color for the next stage of the skill 
        outputSpeech += "Now let's learn about button events. Please select one of the following colors: red, blue, or green.";        
    
        this.response.speak(outputSpeech).listen(reprompt);                        
            
        let deviceIds = this.attributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);

        // send an idle animation to registered buttons
        this.response._addDirective(GadgetDirectives.setIdleAnimation(ROLL_CALL_ANIMATIONS.RollCallComplete, { 'targetGadgets': deviceIds } ));
        // reset button press animations until the user chooses a color
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(Settings.DEFUALT_ANIMATIONS.ButtonDown));
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(Settings.DEFUALT_ANIMATIONS.ButtonUp));
    
        this.attributes.isRollCallComplete = true;
        this.handler.state = Settings.SKILL_STATES.PLAY_MODE;

        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },
    'InputHandlerEvent.timeout': function() {
        console.log("rollCallModeIntentHandlers::InputHandlerEvent::timeout");

        const outputSpeech = "For this skill we need two buttons. Would you like more time to press the buttons?";
        const reprompt = "Say yes to go back and add buttons, or no to exit now.";

        this.response.speak(outputSpeech).listen(reprompt);

        let deviceIds = this.attributes.DeviceIDs;
        deviceIds = deviceIds.slice(-2);

        // Reset button animations while we figure out what the user wants to do next
        this.response._addDirective(GadgetDirectives.setIdleAnimation(ROLL_CALL_ANIMATIONS.Timeout, { 'targetGadgets': deviceIds } ));                    
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(DEFUALT_ANIMATIONS.ButtonDown, { 'targetGadgets': deviceIds } ));
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(DEFUALT_ANIMATIONS.ButtonUp, { 'targetGadgets': deviceIds } ));

        // set a flag that we can use to determine that the confirmation is for a timeout
        this.attributes.expectingEndSkillConfirmation = true;
        
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
        return;
    },
    'GameEngine.InputHandlerEvent': function() {
        console.log("rollCallModeIntentHandlers::InputHandlerEvent");
        if (this.event.request.originatingRequestId != this.attributes.CurrentInputHandlerID) {
            console.log("Stale input event received: received event from " + this.event.request.originatingRequestId + "; expecting " + this.attributes.CurrentInputHandlerID);
            
            this.emit('GlobalResponseReady', { 'openMicrophone': false });
            return;
        }

        var gameEngineEvents = this.event.request.events || [];
        for (var i = 0; i < gameEngineEvents.length; i++) {
            // In this request type, we'll see one or more incoming events
            // that correspond to the StartInputHandler we sent above.
            switch (gameEngineEvents[i].name) {
                case 'first_button_checked_in':                    
                    this.emit('InputHandlerEvent.first_button_checked_in' + Settings.SKILL_STATES.ROLL_CALL_MODE, { 
                        // pass input events that contain information about the button being pressed
                        'inputEvents': gameEngineEvents[i].inputEvents
                    });
                    return;
                case 'second_button_checked_in':
                    this.emit('InputHandlerEvent.second_button_checked_in' + Settings.SKILL_STATES.ROLL_CALL_MODE, { 
                        // pass input events that contain information about the button being pressed
                        'inputEvents': gameEngineEvents[i].inputEvents
                    });
                    return;
                case 'timeout':                    
                    this.emit('InputHandlerEvent.timeout' + Settings.SKILL_STATES.ROLL_CALL_MODE);
                    return;
            }
        }
    },
    'AMAZON.YesIntent': function() {
        console.log("rollCallModeIntentHandlers::YesIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");

        if (this.attributes.expectingEndSkillConfirmation === true) {
            // setup some output speech for Alexa to speak when restarting the roll call
            var instructions = "Ok. Press the first button, wait for confirmation, then press the second button.";            

            // pass control to the StartRollCall event handler to restart the rollcall process
            this.emit('StartRollCall', {
                'outputSpeech': instructions + Settings.WAITING_AUDIO, 
                'timeout': 30000
            });
        } else {
            this.emit('GlobalHelpHandler');
        }
    },
    'AMAZON.NoIntent': function() {
        console.log("rollCallModeIntentHandlers::NoIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");
        
        if (this.attributes.expectingEndSkillConfirmation === true) {
            // if user says No when prompted whether they will to continue with rollcall then just exit
            this.emit('GlobalStopHandler');
        } else {
            // if user responds No to another prompt, perform the help activity and resume  
            this.emit('GlobalHelpHandler');
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
        console.log("rollCallModeIntentHandlers::unhandled");
        this.emit('GlobalDefaultHandler');
    }
});