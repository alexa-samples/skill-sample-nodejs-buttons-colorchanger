/*
    * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.

    * Licensed under the Amazon Software License (the "License").
    * You may not use this file except in compliance with the License.
    * A copy of the License is located at

    * http://aws.amazon.com/asl/

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

exports.handler = function(event, context, callback) {
    console.log("===EVENT=== \n" + JSON.stringify(event)); // Prints Alexa Event Request to CloudWatch logs for easier debugging
    
    const alexa = Alexa.handler(event, context);
    alexa.appId = '';

    // you may enables this skill to persist Attributes between session to a DynamoDB table called 'ColorChangerState'
    // if you enable DynamoDB persistance for your attributes, you must ensure access to DynamoDB from your skill
    // you can un-comment the next line to enable this functionality; the skill should work similarly in both cases
    // alexa.dynamoDBTableName = 'ColorChangerState';

    alexa.registerHandlers(globalHandlers, rollCallModeIntentHandlers, playModeIntentHandlers, exitModeIntentHandlers);
    alexa.execute();
};

// The skill states are the different parts of the skill.
const SKILL_STATES = {
    // Roll Call mode performs roll call and button registration.
    // https://developer.amazon.com/docs/gadget-skills/discover-echo-buttons.html
    ROLL_CALL_MODE: '',
    PLAY_MODE: '_PLAY_MODE',
    // Exit mode performs the actions described in
    // https://developer.amazon.com/docs/gadget-skills/exit-echo-button-skill.html
    EXIT_MODE: '_EXIT_MODE'
};

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


// Define animations to be played on button down and button up that are like the default animations on the buttons
// We'll use these animations when resetting play state
// See: https://developer.amazon.com/docs/gadget-skills/control-echo-buttons.html#animate
const DEFUALT_ANIMATIONS = {
    'ButtonDown' : {
        'targetGadgets': [],
        'animations': BasicAnimations.FadeOutAnimation(1, "blue", 200)
    },
    'ButtonUp': {                     
        'targetGadgets': [], 
        'animations': BasicAnimations.SolidAnimation(1, "black", 100)
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

// We'll use an audio sample of a ticking clock to play whenever the skill is waiting for button presses
// This is an audio file from the ASK Soundbank: https://developer.amazon.com/docs/custom-skills/foley-sounds.html
const WAITING_AUDIO = "<audio src='https://s3.amazonaws.com/ask-soundlibrary/foley/amzn_sfx_rhythmic_ticking_30s_01.mp3'/>";

// The following are going to be the colors we allow in the skill
const COLORS_ALLOWED = [ 'blue', 'green', 'red' ];

// We'll set up a map of custom colors to each of the three allowed colord: blue, green and red
const BREATH_CUSTOM_COLORS = { 
    // map the 'blue' selection to a very light blue color to show as a pulsating animation, while waiting for button presses
    'blue': '184066',
    // map the 'green' selection to a very light blue color to show as a pulsating animation, while waiting for button presses
    'green': '184518',
    // map the 'red' selection to a very light blue color to show as a pulsating animation, while waiting for button presses
    'red': '603018'
};

// ***********************************************************************
//   Global Handlers
//     set up some handlers for events that will have to be handled
//     regardless of what state the skill is in
// ***********************************************************************
const globalHandlers = {
    'GlobalHelpHandler': function() {
        console.log('globalHandlers::GlobalHelpHandler');
        
        if (this.attributes.CurrentInputHandlerID) {
            // if there is an active input handler, stop it so it doesn't interrup Alexa speaking the Help prompt
            // see: https://developer.amazon.com/docs/gadget-skills/receive-echo-button-events.html#stop
            this.response._addDirective(GadgetDirectives.stopInputHandler({ 
                'id': this.attributes.CurrentInputHandlerID
            }));
        }

        let reprompt = "", 
            outputSpeech = "";
        if (this.attributes.isRollCallComplete === true) {
            // roll call is complete - if the user asks for help at this stage, explain about picking a color, or how to quit
            reprompt = "Pick a color to test your buttons: red, blue, or green. Or say cancel or exit to quit. ";
            outputSpeech = "Now that you have registered two buttons, you can pick a color to show when the buttons are pressed. "
                         + "Select one of the following colors: red, blue, or green. "
                         + "If you do not wish to continue, you can say exit. "
                         + reprompt;
            this.response.speak(outputSpeech).listen(reprompt);
        } else {            
            // the user hasn't completed roll call - the help message should explain that roll call needs to be completed and ask the user if they wish to continue
            reprompt = "You can say yes to continue, or no or exit to quit.";
            outputSpeech = "You will need two Echo buttons to use this skill. "
                         + "Each of the two buttons you plan to use must be pressed for the skill to register them. "
                         + "Would you like to continue and register two Echo buttons? "
                         + reprompt;
            this.response.speak(outputSpeech).listen(reprompt);
        
            // at this point, we're essentially waiting for user to decide whether to continue (say 'Yes', or quit - say 'No' or 'Cancel')
            this.attributes.expectingEndSkillConfirmation = true;
        }
                
        this.emit('GlobalResponseReady', { 'openMicrophone': true });
    },
    'GlobalStopHandler': function() {
        console.log('globalHandlers::GlobalStopHandler');
        
        this.response.speak('Good Bye!');  

        // setting shouldEndSession = true -  lets Alexa know that the skill is done      
        this.handler.response.response.shouldEndSession = true;

        this.emit('GlobalSessionEndedRequestHandler');
    },
    'GlobalDefaultHandler': function() {        
        console.log("globalHandlers::GlobalDefaultHandler");
        // this will handle requests that don't otherwise have a designated handler

        if (this.event.request.type === 'System.ExceptionEncountered') {
            // there is not much we can do if an error occurs
            // see:  https://developer.amazon.com/docs/alexa-voice-service/system.html#exceptionencountered
            console.log(JSON.stringify(this.event.request.error));
        } else {
            // otherwise, try to let the user know that we couldn't understand the request and prompt for what to do next
            const reprompt = "Please say again, or say help if you're not sure what to do.";
            const outputSpeech = "Sorry, I didn't get that. " + reprompt;

            this.response.speak(outputSpeech).listen(reprompt);

            this.emit('GlobalResponseReady', { 'openMicrophone': true });
        }
    },
    'GlobalSessionEndedRequestHandler': function() {
        console.log('globalHandlers::GlobalSessionEndedRequestHandler');
        
        // clean up attributes    
        delete this.attributes.STATE;
        delete this.attributes.buttonCount;
        delete this.attributes.isRollCallComplete;
        
        // setting shouldEndSession = fase  -  lets Alexa know that the skill is done
        // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html
        this.handler.response.response.shouldEndSession = true;

        this.handler.state = '';

        // log the response to CloudWatch to make it easier to debug the skill
        console.log("==Response== " + JSON.stringify(this.handler.response));
        // we emit the `:responseReady` event, although in some cases, suchas for actual `SessionEndedRequests` the response will be ignored
        this.emit(':responseReady');
    },
    'GlobalResponseReady': function({
        openMicrophone = false
    } = {}) {
        console.log('globalHandlers::GlobalResponseReady (openMicrophone = ' + openMicrophone + ')');
        // we trigger the `GlobalResponseReady` event from other handlers - the openMicrophone parameter controls the microphone behavior

        if (openMicrophone) {
            // setting shouldEndSession = fase  -  lets Alexa know that we're looking for an answer from the user 
            // see: https://developer.amazon.com/docs/gadget-skills/receive-voice-input.html#open
            //      https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            this.handler.response.response.shouldEndSession = false;
        } else {
            // deleting shouldEndSession will keep the skill session going, while the input handler is active, waiting for button presses
            // see: https://developer.amazon.com/docs/gadget-skills/keep-session-open.html
            delete this.handler.response.response.shouldEndSession;
        }

        // log the response to CloudWatch to make it easier to debug the skill
        console.log("==Response== " + JSON.stringify(this.handler.response));
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function() {        
        this.emit('GlobalSessionEndedRequestHandler');
    }
};

// ***********************************************************************
//   ROLL_CALL_MODE Handlers
//     set up handlers for events that are specific to the Roll Call mode
// ***********************************************************************
const rollCallModeIntentHandlers = Alexa.CreateStateHandler(SKILL_STATES.ROLL_CALL_MODE, {
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
            'outputSpeech': welcomeMessage + WAITING_AUDIO, 
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
            const outputSpeech = 'hello, button 1' + WAITING_AUDIO;
            
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
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(DEFUALT_ANIMATIONS.ButtonDown));
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(DEFUALT_ANIMATIONS.ButtonUp));
    
        this.attributes.isRollCallComplete = true;
        this.handler.state = SKILL_STATES.PLAY_MODE;

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
                    this.emit('InputHandlerEvent.first_button_checked_in' + SKILL_STATES.ROLL_CALL_MODE, { 
                        // pass input events that contain information about the button being pressed
                        'inputEvents': gameEngineEvents[i].inputEvents
                    });
                    return;
                case 'second_button_checked_in':
                    this.emit('InputHandlerEvent.second_button_checked_in' + SKILL_STATES.ROLL_CALL_MODE, { 
                        // pass input events that contain information about the button being pressed
                        'inputEvents': gameEngineEvents[i].inputEvents
                    });
                    return;
                case 'timeout':                    
                    this.emit('InputHandlerEvent.timeout' + SKILL_STATES.ROLL_CALL_MODE);
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
                'outputSpeech': instructions + WAITING_AUDIO, 
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


// ***********************************************************************
//   PLAY_MODE Handlers
//     set up handlers for events that are specific to the Play mode
//     after the user registered the buttons - this is the main mode
// ***********************************************************************
const playModeIntentHandlers = Alexa.CreateStateHandler(SKILL_STATES.PLAY_MODE, {

    'colorIntent': function() {
        console.log("playModeIntentHandlers::colorIntent");

        const uColor = this.event.request.intent.slots.color.value;
        console.log("User color: " + uColor);        

        if (uColor === undefined || COLORS_ALLOWED.indexOf(uColor) == -1) {
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
                'animations': BasicAnimations.BreatheAnimation(30, BREATH_CUSTOM_COLORS[uColor], 450) 
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
                + WAITING_AUDIO;

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
        this.response._addDirective(GadgetDirectives.setButtonDownAnimation(DEFUALT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        this.response._addDirective(GadgetDirectives.setButtonUpAnimation(DEFUALT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));

        // Set Skill End flag
        this.attributes.expectingEndSkillConfirmation = true;
        this.handler.state = SKILL_STATES.EXIT_MODE;
                            
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
                         + WAITING_AUDIO;
        } else {
            var buttonNo = deviceIds.indexOf(buttonId);
            outputSpeech = "button " + buttonNo + ". " + WAITING_AUDIO;            
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
                    this.emit('InputHandlerEvent.button_down_event' + SKILL_STATES.PLAY_MODE, { 
                        // pass the id of the button that triggered the event
                        'buttonId': gameEngineEvents[i].inputEvents[0].gadgetId 
                    });
                    return;
                
                case 'timeout':                    
                    this.emit('InputHandlerEvent.timeout' + SKILL_STATES.PLAY_MODE);
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

// ***********************************************************************
//   EXIT_MODE Handlers
//     set up handlers for events that are specific to the Exit mode
//     when the skill is prompting the user to confirm if they want to exit
// ***********************************************************************
const exitModeIntentHandlers = Alexa.CreateStateHandler(SKILL_STATES.EXIT_MODE, {

    'AMAZON.YesIntent': function() {
        console.log("exitModeIntentHandlers::YesIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");

        if (this.attributes.expectingEndSkillConfirmation === true) {                        
            this.emit('GlobalSessionEndedRequestHandler'); 
        } else {
            this.emit('GlobalDefaultHandler');
        }
    },
    'AMAZON.NoIntent': function() {
        console.log("exitModeIntentHandlers::NoIntent (expecting exit = " + this.attributes.expectingEndSkillConfirmation + ")");

        if (this.attributes.expectingEndSkillConfirmation === true) {
            // change state back to Play Mode
            this.handler.state = SKILL_STATES.PLAY_MODE;

            const reprompt = "Pick a different color, red, blue, or green.";
            const outputSpeech = "Ok, let's keep going. " + reprompt;        
            this.response.speak(outputSpeech).listen(reprompt);
                        
            this.emit('GlobalResponseReady', { 'openMicrophone': true }); 
        } else {
            this.emit('GlobalDefaultHandler');
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
        this.emit('GlobalDefaultHandler');
    }
});