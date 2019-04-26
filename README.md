![](https://images-na.ssl-images-amazon.com/images/G/01/kindle/dp/2017/4911315144/LP_AG_HERO_BANNER_1334x389.jpg)


# Color Changer Skill for Echo Buttons

**Important: The Echo Buttons Skill API is in beta and is subject to change at any time without notice. We welcome your feedback.**

These instructions show how to create a skill called Color Changer, which demonstrates the core functionality of an [Echo Button](https://www.amazon.com/Echo-Buttons-Alexa-Gadget-Pack/dp/B072C4KCQH) skill. It covers [roll call](https://developer.amazon.com/docs/echo-button-skills/discover-echo-buttons.html#goals), starting and stopping the [Input Handler](https://developer.amazon.com/docs/echo-button-skills/receive-echo-button-events.html#flow), and [defining animations](https://developer.amazon.com/docs/echo-button-skills/control-echo-buttons.html#animate) for different button events. It also demonstrates how Echo Buttons can interrupt text-to-speech (TTS).


## Pre-requisites

* Node.js (> v8.9)
* Register for an [AWS Account](https://aws.amazon.com/)
* Install and Setup [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
* Configure a named [AWS CLI Profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html)  
* Register for an [Amazon Developer Account](https://developer.amazon.com/)
* Install and Setup [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

**Note** This skill requires a NodeJS 8.10 or newer runtime. When deploying to Lambda, make sure the selected runtime is Node JS 8.10!

### Installation

The following instructions show how to get this skill deployed using teh ASK CLI. If you would prefer to view instructions for how to perform the same steps using the Web UIs, please foolow the instruction in [this guide](instructions/3-deployment-web.md).

1. Get a local copy of the Color Changer skill code from [alexa-sample-nodejs-buttons-colorchanger](https://github.com/alexa/skill-sample-nodejs-buttons-colorchanger) GitHub. You may clone the repository locally, or simply download and unzip the sample code from GitHub. 

	```bash
	git clone https://github.com/alexa/skill-sample-nodejs-buttons-colorchanger/
	```

2. Initialize the [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html) by Navigating into the repository and running the command: `ask init` and create a new profile called `color-changer`. Follow the prompts to configure the profile and associate it with one of your [AWS profiles](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html)

	```bash
	cd skill-sample-nodejs-buttons-colorchanger
	ask init -p color-changer
	```

3. Install npm dependencies by navigating into the `/lambda/custom` directory and running the npm command: `npm install`

	```bash
	cd lambda/custom
	npm install
	```


### Deployment

ASK CLI will create the skill and the lambda function for you. The Lambda function will be created in the region associated with the AWS profile that you selected.

1. Deploy the skill and the lambda function in one step by running the following command:

	```bash
	ask deploy -p color-changer
	```

	**Note** This skill requires a NodeJS 8.10 or newer runtime. When deploying to Lambda, make sure the selected runtime is Node JS 8.10! At this time, the ASK CLI does not have an option to specify the Lambda runtime version so you will have to make the change manually in the AWS Lambda Console. 

### Testing

1. To test, you need to login to Alexa Developer Console, and enable the "Test" switch on your skill from the "Test" Tab.

2. Simulate verbal interaction with your skill through the command line using the following example:

	```bash
	 ask simulate -l en-US -p color-changer -t "alexa, open color changer"

	 ✓ Simulation created for simulation id: 8a5b18dc-24b9-04c0-d3bb-7b63d9887faf
	◡ Waiting for simulation response{
	  "status": "SUCCESSFUL",
	  ...
	 ```

3. Once the "Test" switch is enabled, your skill can be tested on devices associated with the developer account as well. Speak to Alexa from any enabled device, from your browser at [echosim.io](https://echosim.io/welcome), or through your Amazon Mobile App and say :

	```text
	Alexa, open color changer
	```

## Customization

1. ```./skill.json```

   Change the skill name, example phrase, icons, testing instructions etc ...

   Remember that many information is locale-specific and must be changed for each locale (en-GB and en-US)

   See the Skill [Manifest Documentation](https://developer.amazon.com/docs/smapi/skill-manifest.html) for more information.

2. ```./lambda/custom/*```

   Modify the skill logic

3. ```./models/*.json```

	Change the model definition to replace the invocation name and the sample phrase for each intent.  Repeat the operation for each locale you are planning to support.


## Additional Resources

### Community
* [Amazon Developer Forums](https://forums.developer.amazon.com/spaces/311/gadgets-beta.html) - Join the conversation!
* [Hackster.io](https://www.hackster.io/amazon-alexa) - See what others are building with Alexa.

### Tutorials & Guides
* [Voice Design Guide](https://developer.amazon.com/designing-for-voice/) - A great resource for learning conversational and voice user interface design.
* [Trivia Template](https://github.com/alexa/skill-sample-nodejs-buttons-trivia/) - A more complex skill sample, shows a full featured trivia game template

### Documentation
* [Official Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html) - Official Alexa Skills Kit Documentation
* [Alexa Skills Kit Node.js SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/)


## License

This sample is licensed under the Amazon Software License.

